// middleware/maintenance.js
// Maintenance mode middleware

import { logger } from './logger.js';

/**
 * Check if system is in maintenance mode
 */
const isInMaintenance = () => {
  return process.env.MAINTENANCE_MODE === 'true';
};

/**
 * Check if IP is whitelisted during maintenance
 */
const isWhitelistedIP = (ip) => {
  if (!process.env.MAINTENANCE_WHITELIST_IPS) {
    return false;
  }
  
  const whitelistedIPs = process.env.MAINTENANCE_WHITELIST_IPS.split(',').map(ip => ip.trim());
  
  // Handle IPv6 mapped IPv4 addresses
  const normalizedIP = ip.replace('::ffff:', '');
  
  return whitelistedIPs.includes(normalizedIP) || whitelistedIPs.includes(ip);
};

/**
 * Check if user is admin (allowed during maintenance)
 */
const isAdminUser = (req) => {
  return req.user && req.user.role === 'admin';
};

/**
 * Check if path is excluded from maintenance
 */
const isExcludedPath = (path) => {
  const excludedPaths = [
    '/api/system/health',
    '/api/system/maintenance',
    '/api/auth/login',
    '/api/system/ping'
  ];
  
  return excludedPaths.some(excluded => path.startsWith(excluded));
};

/**
 * Maintenance mode middleware
 */
export const maintenanceMode = (req, res, next) => {
  // Check if maintenance mode is enabled
  if (!isInMaintenance()) {
    return next();
  }
  
  // Check exclusions
  if (isExcludedPath(req.path)) {
    return next();
  }
  
  // Check if IP is whitelisted
  const clientIP = req.ip || req.connection.remoteAddress;
  if (isWhitelistedIP(clientIP)) {
    logger.info('Maintenance mode access granted to whitelisted IP', {
      ip: clientIP,
      path: req.path
    });
    return next();
  }
  
  // Check if user is admin
  if (isAdminUser(req)) {
    logger.info('Maintenance mode access granted to admin user', {
      userId: req.user.id,
      userName: req.user.name,
      path: req.path
    });
    return next();
  }
  
  // Log maintenance mode access attempt
  logger.warn('Access attempted during maintenance mode', {
    ip: clientIP,
    path: req.path,
    method: req.method,
    userId: req.user?.id
  });
  
  // Return maintenance response
  const maintenanceInfo = {
    error: 'Service Unavailable',
    message: process.env.MAINTENANCE_MESSAGE || 'The system is currently under maintenance. Please try again later.',
    status: 503,
    maintenance: true,
    estimatedTime: process.env.MAINTENANCE_END || null,
    timestamp: new Date().toISOString()
  };
  
  // Set retry-after header if estimated time is provided
  if (process.env.MAINTENANCE_END) {
    const endTime = new Date(process.env.MAINTENANCE_END);
    const now = new Date();
    const secondsUntilEnd = Math.max(0, Math.floor((endTime - now) / 1000));
    res.setHeader('Retry-After', secondsUntilEnd);
  }
  
  res.status(503).json(maintenanceInfo);
};

/**
 * Scheduled maintenance checker
 * Can be used to automatically enable/disable maintenance mode
 */
export const scheduledMaintenanceChecker = () => {
  // Check if scheduled maintenance is configured
  if (!process.env.SCHEDULED_MAINTENANCE_START || !process.env.SCHEDULED_MAINTENANCE_END) {
    return;
  }
  
  const checkMaintenance = () => {
    const now = new Date();
    const startTime = new Date(process.env.SCHEDULED_MAINTENANCE_START);
    const endTime = new Date(process.env.SCHEDULED_MAINTENANCE_END);
    
    // Enable maintenance mode if within scheduled time
    if (now >= startTime && now <= endTime) {
      if (process.env.MAINTENANCE_MODE !== 'true') {
        process.env.MAINTENANCE_MODE = 'true';
        process.env.MAINTENANCE_END = process.env.SCHEDULED_MAINTENANCE_END;
        logger.warn('Scheduled maintenance started', {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        });
      }
    } else if (now > endTime && process.env.MAINTENANCE_MODE === 'true') {
      // Disable maintenance mode after scheduled time
      process.env.MAINTENANCE_MODE = 'false';
      logger.info('Scheduled maintenance ended', {
        endTime: endTime.toISOString()
      });
    }
  };
  
  // Check every minute
  setInterval(checkMaintenance, 60 * 1000);
  
  // Initial check
  checkMaintenance();
};

/**
 * Create maintenance mode HTML page for web browsers
 */
export const maintenanceHTML = () => {
  const message = process.env.MAINTENANCE_MESSAGE || 'The system is currently under maintenance.';
  const estimatedEnd = process.env.MAINTENANCE_END ? new Date(process.env.MAINTENANCE_END).toLocaleString() : null;
  
  return `
    <!DOCTYPE html>
    <html lang="el">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Συντήρηση Συστήματος - BizFlow ERP</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
        }
        .maintenance-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          max-width: 500px;
          width: 100%;
          padding: 60px 40px;
          text-align: center;
        }
        .icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 30px;
          background: #f0f0f0;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .icon svg {
          width: 40px;
          height: 40px;
          fill: #667eea;
        }
        h1 {
          color: #333;
          font-size: 28px;
          margin-bottom: 20px;
          font-weight: 600;
        }
        p {
          color: #666;
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 15px;
        }
        .estimated-time {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 15px;
          margin-top: 30px;
        }
        .estimated-time strong {
          color: #667eea;
        }
        .progress-bar {
          width: 100%;
          height: 4px;
          background: #e0e0e0;
          border-radius: 2px;
          margin-top: 30px;
          overflow: hidden;
        }
        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #764ba2);
          animation: progress 2s ease-in-out infinite;
        }
        @keyframes progress {
          0% { width: 0%; }
          50% { width: 100%; }
          100% { width: 0%; }
        }
      </style>
    </head>
    <body>
      <div class="maintenance-container">
        <div class="icon">
          <svg viewBox="0 0 24 24">
            <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
          </svg>
        </div>
        <h1>Συντήρηση Συστήματος</h1>
        <p>${message}</p>
        <p>Ζητούμε συγγνώμη για την αναστάτωση. Εργαζόμαστε για να βελτιώσουμε την εμπειρία σας.</p>
        ${estimatedEnd ? `
          <div class="estimated-time">
            <strong>Εκτιμώμενη ολοκλήρωση:</strong><br>
            ${estimatedEnd}
          </div>
        ` : ''}
        <div class="progress-bar">
          <div class="progress-bar-fill"></div>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Middleware to serve maintenance HTML for browser requests
 */
export const maintenancePage = (req, res, next) => {
  // Check if maintenance mode is enabled
  if (!isInMaintenance()) {
    return next();
  }
  
  // Check if request is from browser (accepts HTML)
  const acceptsHTML = req.accepts('html');
  const isAPIRequest = req.path.startsWith('/api');
  
  if (acceptsHTML && !isAPIRequest && !isExcludedPath(req.path)) {
    // Check exclusions
    const clientIP = req.ip || req.connection.remoteAddress;
    if (!isWhitelistedIP(clientIP) && !isAdminUser(req)) {
      res.status(503).send(maintenanceHTML());
      return;
    }
  }
  
  next();
};

export default maintenanceMode;