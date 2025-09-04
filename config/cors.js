// config/cors.js
// CORS (Cross-Origin Resource Sharing) configuration

import { logger } from '../utils/logger.js';

// Allowed origins based on environment
const getAllowedOrigins = () => {
  const origins = [];
  
  // Always allow localhost in development
  if (process.env.NODE_ENV === 'development') {
    origins.push(
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5000'
    );
  }
  
  // Add production URLs
  if (process.env.CLIENT_URL) {
    origins.push(process.env.CLIENT_URL);
  }
  
  if (process.env.ALLOWED_ORIGINS) {
    const additionalOrigins = process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
    origins.push(...additionalOrigins);
  }
  
  // Production domains
  if (process.env.NODE_ENV === 'production') {
    origins.push(
      'https://bizflow.gr',
      'https://www.bizflow.gr',
      'https://app.bizflow.gr',
      'https://api.bizflow.gr',
      'https://bizflow-erp.onrender.com', // Render deployment
      'http://bizflow-erp.onrender.com'   // In case of http
    );
  }
  
  return [...new Set(origins)]; // Remove duplicates
};

// CORS options configuration
export const corsOptions = {
  // Origin validation
  origin: function (origin, callback) {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin && process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // Check if origin is allowed
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else if (process.env.CORS_ALLOW_ALL === 'true') {
      // Allow all origins (use with caution!)
      logger.warn(`CORS: Allowing origin ${origin} (ALLOW_ALL mode)`);
      callback(null, true);
    } else {
      logger.warn(`CORS: Blocked request from origin ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  
  // Allowed methods
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  
  // Allowed headers
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Access-Token',
    'X-Refresh-Token',
    'X-API-Key',
    'X-CSRF-Token',
    'X-Client-Id',
    'X-Session-Id',
    'Cache-Control',
    'Pragma',
    'If-None-Match'
  ],
  
  // Headers to expose to the client
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-Current-Page',
    'X-Per-Page',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-Request-Id',
    'X-Response-Time',
    'Content-Disposition',
    'Content-Length',
    'ETag'
  ],
  
  // Allow credentials (cookies, authorization headers)
  credentials: true,
  
  // Cache preflight requests
  maxAge: 86400, // 24 hours
  
  // Success status for legacy browsers
  optionsSuccessStatus: 200,
  
  // Preflight continue
  preflightContinue: false
};

// Dynamic CORS configuration for specific routes
export const dynamicCors = (req) => {
  const customOptions = { ...corsOptions };
  
  // Allow broader access for public API endpoints
  if (req.path.startsWith('/api/public')) {
    customOptions.origin = true; // Allow all origins for public API
    customOptions.credentials = false; // No credentials for public API
  }
  
  // Stricter CORS for admin routes
  if (req.path.startsWith('/api/admin')) {
    customOptions.origin = (origin, callback) => {
      const adminOrigins = [
        process.env.ADMIN_URL,
        'https://admin.bizflow.gr'
      ].filter(Boolean);
      
      if (adminOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Admin access not allowed from this origin'));
      }
    };
  }
  
  // WebSocket support
  if (req.path.startsWith('/ws') || req.path.startsWith('/socket.io')) {
    customOptions.origin = getAllowedOrigins();
    customOptions.credentials = true;
  }
  
  return customOptions;
};

// Preflight request handler
export const handlePreflight = (req, res) => {
  const origin = req.get('origin');
  const allowedOrigins = getAllowedOrigins();
  
  if (allowedOrigins.includes(origin) || process.env.CORS_ALLOW_ALL === 'true') {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', corsOptions.methods.join(', '));
    res.setHeader('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(', '));
    res.setHeader('Access-Control-Max-Age', corsOptions.maxAge);
    res.sendStatus(204);
  } else {
    res.status(403).json({ error: 'CORS policy violation' });
  }
};

// CORS error handler
export const corsErrorHandler = (err, req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') {
    logger.error('CORS Error:', {
      origin: req.get('origin'),
      method: req.method,
      path: req.path,
      ip: req.ip
    });
    
    res.status(403).json({
      error: 'CORS Policy Error',
      message: 'The origin is not allowed to access this resource',
      origin: req.get('origin')
    });
  } else {
    next(err);
  }
};

// Helper to check if origin is allowed
export const isOriginAllowed = (origin) => {
  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes(origin);
};

// Helper to add CORS headers manually
export const addCorsHeaders = (req, res) => {
  const origin = req.get('origin');
  const allowedOrigins = getAllowedOrigins();
  
  if (allowedOrigins.includes(origin) || process.env.CORS_ALLOW_ALL === 'true') {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }
};

export default corsOptions;