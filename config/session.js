// config/session.js
// Session configuration for Express

import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { logger } from '../middleware/logger.js';

const PgSession = connectPgSimple(session);

// Session store configuration
const getSessionStore = () => {
  if (process.env.NODE_ENV === 'production' || process.env.USE_DB_SESSIONS === 'true') {
    // PostgreSQL session store for production
    return new PgSession({
      conString: process.env.DATABASE_URL || 
        `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
      tableName: 'user_sessions',
      createTableIfMissing: true,
      ttl: 24 * 60 * 60, // 24 hours in seconds
      disableTouch: false,
      pruneSessionInterval: 60 * 60, // Prune expired sessions every hour
      errorLog: (error) => {
        logger.error('Session store error:', error);
      }
    });
  } else {
    // Memory store for development (warning: not for production!)
    logger.warn('Using memory store for sessions - not recommended for production');
    return new session.MemoryStore();
  }
};

// Cookie configuration
const getCookieConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    secure: isProduction, // Require HTTPS in production
    httpOnly: true, // Prevent XSS attacks
    maxAge: parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000, // 24 hours
    sameSite: isProduction ? 'strict' : 'lax', // CSRF protection
    domain: process.env.COOKIE_DOMAIN || undefined,
    path: '/'
  };
};

// Main session configuration
export const sessionConfig = {
  // Session store
  store: getSessionStore(),
  
  // Session secret (should be in environment variable)
  secret: process.env.SESSION_SECRET || 'bizflow-erp-session-secret-change-this',
  
  // Session name
  name: process.env.SESSION_NAME || 'bizflow.sid',
  
  // Don't save uninitialized sessions
  saveUninitialized: false,
  
  // Don't resave unmodified sessions
  resave: false,
  
  // Force session save when using touch
  rolling: true,
  
  // Cookie configuration
  cookie: getCookieConfig(),
  
  // Generate session ID
  genid: (req) => {
    const crypto = require('crypto');
    const timestamp = Date.now();
    const random = crypto.randomBytes(16).toString('hex');
    return `${timestamp}-${random}`;
  },
  
  // Trust proxy (important for secure cookies behind reverse proxy)
  proxy: process.env.NODE_ENV === 'production'
};

// Session validation middleware
export const validateSession = (req, res, next) => {
  if (!req.session) {
    logger.error('Session middleware not properly initialized');
    return res.status(500).json({ error: 'Session configuration error' });
  }
  
  // Check if session is valid
  if (req.session && req.session.userId) {
    // Refresh session expiry on activity
    req.session.lastActivity = Date.now();
    
    // Check for session timeout
    const sessionTimeout = parseInt(process.env.SESSION_TIMEOUT) || 30 * 60 * 1000; // 30 minutes
    const lastActivity = req.session.lastActivity || req.session.cookie._expires;
    
    if (Date.now() - lastActivity > sessionTimeout) {
      req.session.destroy((err) => {
        if (err) {
          logger.error('Error destroying session:', err);
        }
      });
      
      return res.status(401).json({ 
        error: 'Session expired',
        code: 'SESSION_EXPIRED'
      });
    }
  }
  
  next();
};

// Session cleanup utilities
export const sessionCleanup = {
  // Destroy session
  destroy: (req, callback) => {
    if (req.session) {
      const sessionId = req.sessionID;
      req.session.destroy((err) => {
        if (err) {
          logger.error(`Error destroying session ${sessionId}:`, err);
          callback(err);
        } else {
          logger.info(`Session ${sessionId} destroyed`);
          callback(null);
        }
      });
    } else {
      callback(null);
    }
  },
  
  // Regenerate session
  regenerate: (req, callback) => {
    const oldSessionId = req.sessionID;
    req.session.regenerate((err) => {
      if (err) {
        logger.error(`Error regenerating session ${oldSessionId}:`, err);
        callback(err);
      } else {
        logger.info(`Session regenerated: ${oldSessionId} -> ${req.sessionID}`);
        callback(null);
      }
    });
  },
  
  // Save user to session
  saveUser: (req, user) => {
    req.session.userId = user.id;
    req.session.userEmail = user.email;
    req.session.userRole = user.role;
    req.session.userName = user.name;
    req.session.loginTime = Date.now();
    req.session.lastActivity = Date.now();
  },
  
  // Clear user from session
  clearUser: (req) => {
    delete req.session.userId;
    delete req.session.userEmail;
    delete req.session.userRole;
    delete req.session.userName;
    delete req.session.loginTime;
    delete req.session.lastActivity;
  },
  
  // Check if user is logged in
  isLoggedIn: (req) => {
    return !!(req.session && req.session.userId);
  },
  
  // Get session data
  getData: (req, key) => {
    return req.session ? req.session[key] : null;
  },
  
  // Set session data
  setData: (req, key, value) => {
    if (req.session) {
      req.session[key] = value;
      return true;
    }
    return false;
  },
  
  // Flash messages
  setFlash: (req, type, message) => {
    if (!req.session.flash) {
      req.session.flash = {};
    }
    req.session.flash[type] = message;
  },
  
  getFlash: (req, type) => {
    if (req.session && req.session.flash && req.session.flash[type]) {
      const message = req.session.flash[type];
      delete req.session.flash[type];
      return message;
    }
    return null;
  }
};

// Session statistics for monitoring
export const getSessionStats = async () => {
  try {
    if (sessionConfig.store instanceof PgSession) {
      // Query session table for stats
      const query = `
        SELECT 
          COUNT(*) as total_sessions,
          COUNT(CASE WHEN expire > NOW() THEN 1 END) as active_sessions,
          COUNT(CASE WHEN expire <= NOW() THEN 1 END) as expired_sessions
        FROM user_sessions
      `;
      
      // This would require direct database connection
      // Implementation depends on your database setup
      
      return {
        type: 'PostgreSQL',
        stats: 'Database session stats'
      };
    } else {
      return {
        type: 'Memory',
        warning: 'Memory store - no persistent stats available'
      };
    }
  } catch (error) {
    logger.error('Error getting session stats:', error);
    return null;
  }
};

// Middleware to add session helpers to request
export const sessionHelpers = (req, res, next) => {
  // Add helper methods to request
  req.sessionDestroy = (callback) => sessionCleanup.destroy(req, callback);
  req.sessionRegenerate = (callback) => sessionCleanup.regenerate(req, callback);
  req.saveUserSession = (user) => sessionCleanup.saveUser(req, user);
  req.clearUserSession = () => sessionCleanup.clearUser(req);
  req.isLoggedIn = () => sessionCleanup.isLoggedIn(req);
  req.getSessionData = (key) => sessionCleanup.getData(req, key);
  req.setSessionData = (key, value) => sessionCleanup.setData(req, key, value);
  req.setFlash = (type, message) => sessionCleanup.setFlash(req, type, message);
  req.getFlash = (type) => sessionCleanup.getFlash(req, type);
  
  next();
};

export default sessionConfig;