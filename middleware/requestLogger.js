// middleware/requestLogger.js
// Request logging middleware for audit trail and debugging

import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger.js';
import auditService from '../services/auditService.js';

/**
 * Generate request ID
 */
const generateRequestId = () => {
  return uuidv4();
};

/**
 * Get response time in milliseconds
 */
const getResponseTime = (startTime) => {
  const diff = process.hrtime(startTime);
  return (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
};

/**
 * Sanitize sensitive data from logs
 */
const sanitizeData = (data) => {
  if (!data) return data;
  
  const sensitiveFields = [
    'password',
    'confirmPassword',
    'currentPassword',
    'newPassword',
    'token',
    'refreshToken',
    'accessToken',
    'apiKey',
    'secret',
    'creditCard',
    'cvv',
    'ssn',
    'bankAccount'
  ];
  
  const sanitized = { ...data };
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
};

/**
 * Determine if request should be logged
 */
const shouldLogRequest = (req) => {
  // Skip logging for certain paths
  const skipPaths = [
    '/api/system/health',
    '/api/system/ping',
    '/favicon.ico',
    '/robots.txt'
  ];
  
  // Skip static file requests
  const skipExtensions = [
    '.css',
    '.js',
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.svg',
    '.ico',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot'
  ];
  
  if (skipPaths.includes(req.path)) {
    return false;
  }
  
  if (skipExtensions.some(ext => req.path.endsWith(ext))) {
    return false;
  }
  
  return true;
};

/**
 * Request logging middleware
 */
export const requestLogger = (req, res, next) => {
  // Skip if shouldn't log
  if (!shouldLogRequest(req)) {
    return next();
  }

  // Add request ID
  req.id = generateRequestId();
  res.setHeader('X-Request-Id', req.id);

  // Start timer
  req.startTime = process.hrtime();

  // Capture original send method
  const originalSend = res.send;
  let responseBody;

  // Override send method to capture response
  res.send = function(data) {
    responseBody = data;
    originalSend.apply(res, arguments);
  };

  // Log request
  const requestLog = {
    requestId: req.id,
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    referer: req.get('referer'),
    userId: req.user?.id,
    sessionId: req.session?.id,
    headers: process.env.NODE_ENV === 'development' ? req.headers : undefined,
    query: sanitizeData(req.query),
    body: sanitizeData(req.body),
    params: req.params
  };

  // Log incoming request in development
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Incoming Request', requestLog);
  }

  // Response handler
  res.on('finish', async () => {
    const responseTime = getResponseTime(req.startTime);
    
    const responseLog = {
      requestId: req.id,
      statusCode: res.statusCode,
      statusMessage: res.statusMessage,
      responseTime: `${responseTime}ms`,
      contentLength: res.get('content-length'),
      success: res.statusCode < 400
    };

    // Combine request and response logs
    const fullLog = {
      ...requestLog,
      response: responseLog
    };

    // Log based on status code
    if (res.statusCode >= 500) {
      logger.error('Request failed with server error', fullLog);
    } else if (res.statusCode >= 400) {
      logger.warn('Request failed with client error', fullLog);
    } else if (process.env.NODE_ENV === 'development') {
      logger.info('Request completed successfully', fullLog);
    }

    // Audit log for important operations
    if (shouldAuditLog(req, res)) {
      await logToAudit(req, res, responseTime);
    }

    // Performance warning for slow requests
    if (parseFloat(responseTime) > 1000) {
      logger.warn('Slow request detected', {
        requestId: req.id,
        path: req.path,
        method: req.method,
        responseTime: `${responseTime}ms`
      });
    }
  });

  next();
};

/**
 * Determine if request should be audit logged
 */
const shouldAuditLog = (req, res) => {
  // Always audit auth operations
  if (req.path.startsWith('/api/auth')) {
    return true;
  }
  
  // Audit all admin operations
  if (req.path.startsWith('/api/admin')) {
    return true;
  }
  
  // Audit write operations (POST, PUT, DELETE)
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return true;
  }
  
  // Audit failed requests
  if (res.statusCode >= 400) {
    return true;
  }
  
  // Audit report generation
  if (req.path.startsWith('/api/reports')) {
    return true;
  }
  
  return false;
};

/**
 * Log request to audit trail
 */
const logToAudit = async (req, res, responseTime) => {
  try {
    // Determine action based on method and path
    let action = 'read';
    if (req.method === 'POST') action = 'create';
    if (req.method === 'PUT' || req.method === 'PATCH') action = 'update';
    if (req.method === 'DELETE') action = 'delete';
    if (req.path.includes('/login')) action = 'login';
    if (req.path.includes('/logout')) action = 'logout';
    if (req.path.includes('/export')) action = 'export';
    if (req.path.includes('/import')) action = 'import';
    if (req.path.includes('/report')) action = 'report';

    // Extract entity info from path
    const pathParts = req.path.split('/');
    const entityType = pathParts[2] || 'system';
    const entityId = pathParts[3];

    await auditService.log({
      userId: req.user?.id,
      userName: req.user?.name,
      userEmail: req.user?.email,
      action,
      category: 'http',
      entityType: entityType.charAt(0).toUpperCase() + entityType.slice(1),
      entityId,
      description: `${req.method} ${req.path}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      requestMethod: req.method,
      requestUrl: req.originalUrl,
      sessionId: req.session?.id,
      status: res.statusCode < 400 ? 'success' : 'failure',
      duration: parseFloat(responseTime),
      metadata: {
        requestId: req.id,
        statusCode: res.statusCode,
        query: sanitizeData(req.query),
        body: sanitizeData(req.body)
      }
    });
  } catch (error) {
    logger.error('Failed to create audit log', {
      error: error.message,
      requestId: req.id
    });
  }
};

/**
 * Middleware to log specific user activities
 */
export const logActivity = (action, description) => {
  return async (req, res, next) => {
    try {
      await auditService.log({
        userId: req.user?.id,
        userName: req.user?.name,
        action,
        description,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        requestMethod: req.method,
        requestUrl: req.originalUrl
      });
    } catch (error) {
      logger.error('Activity logging failed', { error: error.message });
    }
    next();
  };
};

export default requestLogger;