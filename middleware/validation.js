// backend/middleware/validation.js
// Request validation middleware

import { validationResult } from 'express-validator';
import { logger } from '../utils/logger.js';

/**
 * Validate request based on express-validator rules
 */
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Log validation errors
    logger.warn('Validation failed', {
      path: req.path,
      method: req.method,
      errors: errors.array(),
      body: req.body,
      query: req.query,
      params: req.params,
      user: req.user?.id
    });

    // Format errors for response
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      errors: formattedErrors,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

/**
 * Sanitize input data
 */
export const sanitizeInput = (req, res, next) => {
  // Recursively sanitize object
  const sanitize = (obj) => {
    if (typeof obj !== 'object' || obj === null) {
      if (typeof obj === 'string') {
        // Remove any script tags and dangerous HTML
        return obj
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
          .trim();
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => sanitize(item));
    }

    const sanitized = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitize(obj[key]);
      }
    }
    return sanitized;
  };

  // Sanitize body, query, and params
  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);

  next();
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder?.toUpperCase() || 'DESC';

  // Validate page
  if (page < 1) {
    return res.status(400).json({
      success: false,
      error: 'Page number must be greater than 0'
    });
  }

  // Validate limit
  if (limit < 1 || limit > 100) {
    return res.status(400).json({
      success: false,
      error: 'Limit must be between 1 and 100'
    });
  }

  // Validate sort order
  if (!['ASC', 'DESC'].includes(sortOrder)) {
    return res.status(400).json({
      success: false,
      error: 'Sort order must be ASC or DESC'
    });
  }

  // Add validated pagination to request
  req.pagination = {
    page,
    limit,
    offset: (page - 1) * limit,
    sortBy,
    sortOrder
  };

  next();
};

/**
 * Validate UUID parameter
 */
export const validateUUID = (paramName = 'id') => {
  return (req, res, next) => {
    const uuid = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuid || !uuidRegex.test(uuid)) {
      return res.status(400).json({
        success: false,
        error: `Invalid ${paramName} format. Must be a valid UUID.`
      });
    }

    next();
  };
};

/**
 * Validate date range
 */
export const validateDateRange = (req, res, next) => {
  const { startDate, endDate } = req.query;

  if (startDate && !isValidDate(startDate)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid start date format'
    });
  }

  if (endDate && !isValidDate(endDate)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid end date format'
    });
  }

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      return res.status(400).json({
        success: false,
        error: 'Start date must be before end date'
      });
    }

    // Check if date range is not too large (e.g., max 1 year)
    const maxRange = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
    if (end - start > maxRange) {
      return res.status(400).json({
        success: false,
        error: 'Date range cannot exceed 1 year'
      });
    }
  }

  next();
};

/**
 * Helper function to validate date
 */
const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

/**
 * Validate file upload
 */
export const validateFileUpload = (options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    required = false
  } = options;

  return (req, res, next) => {
    if (!req.file && !req.files) {
      if (required) {
        return res.status(400).json({
          success: false,
          error: 'File upload is required'
        });
      }
      return next();
    }

    const files = req.files || [req.file];
    
    for (const file of files) {
      // Check file size
      if (file.size > maxSize) {
        return res.status(400).json({
          success: false,
          error: `File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`
        });
      }

      // Check file type
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: `File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`
        });
      }
    }

    next();
  };
};

export default {
  validateRequest,
  sanitizeInput,
  validatePagination,
  validateUUID,
  validateDateRange,
  validateFileUpload
};