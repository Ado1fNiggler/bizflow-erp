// middleware/errorHandler.js
// Global error handling middleware

import { logger } from './logger.js';
import auditService from '../services/auditService.js';

/**
 * Custom API Error class
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async error handler wrapper for route handlers
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle different types of errors
 */
const handleError = (error) => {
  let customError = {
    message: error.message || 'Something went wrong',
    statusCode: error.statusCode || 500,
    status: error.status || 'error'
  };

  // Sequelize validation error
  if (error.name === 'SequelizeValidationError') {
    customError.message = 'Validation error';
    customError.statusCode = 400;
    customError.errors = error.errors.map(e => ({
      field: e.path,
      message: e.message
    }));
  }

  // Sequelize unique constraint error
  if (error.name === 'SequelizeUniqueConstraintError') {
    customError.message = 'Duplicate field value entered';
    customError.statusCode = 409;
    customError.errors = error.errors.map(e => ({
      field: e.path,
      message: `${e.path} already exists`
    }));
  }

  // Sequelize foreign key constraint error
  if (error.name === 'SequelizeForeignKeyConstraintError') {
    customError.message = 'Referenced resource not found';
    customError.statusCode = 400;
  }

  // Sequelize database error
  if (error.name === 'SequelizeDatabaseError') {
    customError.message = 'Database operation failed';
    customError.statusCode = 500;
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    customError.message = 'Invalid token';
    customError.statusCode = 401;
  }

  if (error.name === 'TokenExpiredError') {
    customError.message = 'Token expired';
    customError.statusCode = 401;
  }

  // Multer file upload errors
  if (error.name === 'MulterError') {
    if (error.code === 'LIMIT_FILE_SIZE') {
      customError.message = 'File too large';
      customError.statusCode = 413;
    } else if (error.code === 'LIMIT_FILE_COUNT') {
      customError.message = 'Too many files';
      customError.statusCode = 400;
    } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      customError.message = 'Unexpected field';
      customError.statusCode = 400;
    }
  }

  // MongoDB/Mongoose errors (if ever migrating)
  if (error.code === 11000) {
    customError.message = 'Duplicate field value entered';
    customError.statusCode = 409;
  }

  if (error.name === 'CastError') {
    customError.message = 'Invalid ID format';
    customError.statusCode = 400;
  }

  return customError;
};

/**
 * Global error handling middleware
 */
export const errorHandler = async (err, req, res, next) => {
  // Handle the error
  const error = handleError(err);

  // Log the error
  if (error.statusCode >= 500) {
    logger.error('Server Error', {
      error: err.message,
      stack: err.stack,
      statusCode: error.statusCode,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userId: req.user?.id,
      body: req.body,
      params: req.params,
      query: req.query
    });

    // Log security event for critical errors
    if (!err.isOperational) {
      await auditService.logSecurityEvent('APPLICATION_ERROR', 'high', {
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        statusCode: error.statusCode,
        path: req.path,
        method: req.method,
        userId: req.user?.id,
        ip: req.ip
      });
    }
  } else if (error.statusCode >= 400) {
    logger.warn('Client Error', {
      error: error.message,
      statusCode: error.statusCode,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userId: req.user?.id
    });
  }

  // Send error response
  res.status(error.statusCode).json({
    success: false,
    status: error.status,
    error: error.message,
    ...(error.errors && { errors: error.errors }),
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      originalError: err
    }),
    timestamp: new Date().toISOString(),
    path: req.path,
    requestId: req.id
  });
};

/**
 * 404 Not Found handler
 */
export const notFound = (req, res, next) => {
  const error = new AppError(`Not found - ${req.originalUrl}`, 404);
  next(error);
};

/**
 * Handle uncaught exceptions
 */
export const handleUncaughtException = () => {
  process.on('uncaughtException', (error) => {
    logger.fatal('UNCAUGHT EXCEPTION! 💥 Shutting down...', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  });
};

/**
 * Handle unhandled promise rejections
 */
export const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (reason, promise) => {
    logger.fatal('UNHANDLED REJECTION! 💥 Shutting down...', {
      reason: reason,
      promise: promise
    });
    process.exit(1);
  });
};

export default errorHandler;