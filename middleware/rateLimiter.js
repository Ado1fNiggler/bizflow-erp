// middleware/rateLimiter.js
// Advanced rate limiting middleware with different strategies

import rateLimit from 'express-rate-limit';
// import RedisStore from 'rate-limit-redis'; // Optional - only if Redis is configured
import { logger } from '../utils/logger.js';
import auditService from '../services/auditService.js';

// In-memory store for tracking
const requestCounts = new Map();

/**
 * Get client identifier for rate limiting
 */
const getClientId = (req) => {
  // Priority: User ID > API Key > IP Address
  if (req.user?.id) {
    return `user:${req.user.id}`;
  }
  
  if (req.headers['x-api-key']) {
    return `api:${req.headers['x-api-key']}`;
  }
  
  // Get real IP behind proxy
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
             req.headers['x-real-ip'] || 
             req.connection.remoteAddress;
  
  return `ip:${ip}`;
};

/**
 * Skip successful requests option for auth endpoints
 */
const skipSuccessfulRequests = (req, res) => {
  return res.statusCode < 400;
};

/**
 * Custom rate limit configurations
 */
const rateLimitConfigs = {
  // Strict limit for authentication
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: 'Too many authentication attempts. Please try again later.',
    skipSuccessfulRequests: true
  },
  
  // Strict limit for password reset
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 requests per hour
    message: 'Too many password reset requests. Please try again later.'
  },
  
  // API general limit
  api: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: 'Too many requests. Please slow down.'
  },
  
  // Strict limit for file uploads
  upload: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // 10 uploads per 5 minutes
    message: 'Too many file uploads. Please wait before uploading more files.'
  },
  
  // Report generation limit
  reports: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5, // 5 reports per 5 minutes
    message: 'Too many report requests. Please wait before generating more reports.'
  },
  
  // Export limit
  export: {
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 10, // 10 exports per 10 minutes
    message: 'Too many export requests. Please wait before exporting more data.'
  },
  
  // Search/query limit
  search: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 searches per minute
    message: 'Too many search requests. Please slow down.'
  }
};

/**
 * Create rate limiter with configuration
 */
export const createRateLimiter = (config, customOptions = {}) => {
  const options = {
    ...config,
    ...customOptions,
    keyGenerator: getClientId,
    handler: async (req, res) => {
      // Log rate limit exceeded
      logger.warn('Rate limit exceeded', {
        clientId: getClientId(req),
        path: req.path,
        method: req.method
      });
      
      // Audit log for security
      await auditService.logSecurityEvent('RATE_LIMIT_EXCEEDED', 'medium', {
        clientId: getClientId(req),
        path: req.path,
        method: req.method,
        headers: req.headers,
        ip: req.ip
      });
      
      res.status(429).json({
        error: 'Too Many Requests',
        message: config.message || 'Too many requests, please try again later.',
        retryAfter: Math.ceil(config.windowMs / 1000)
      });
    },
    skip: (req) => {
      // Skip rate limiting for admin users in development
      if (process.env.NODE_ENV === 'development' && req.user?.role === 'admin') {
        return true;
      }
      return false;
    }
  };
  
  // Use Redis store in production
  if (process.env.REDIS_URL && process.env.NODE_ENV === 'production') {
    options.store = new RedisStore({
      client: redis,
      prefix: 'rl:'
    });
  }
  
  return rateLimit(options);
};

/**
 * Dynamic rate limiter based on endpoint
 */
export const rateLimiter = (type = 'api') => {
  const config = rateLimitConfigs[type] || rateLimitConfigs.api;
  return createRateLimiter(config);
};

/**
 * Adaptive rate limiting based on user behavior
 */
export const adaptiveRateLimiter = () => {
  return async (req, res, next) => {
    const clientId = getClientId(req);
    const now = Date.now();
    
    // Get or create client record
    if (!requestCounts.has(clientId)) {
      requestCounts.set(clientId, {
        count: 0,
        windowStart: now,
        violations: 0,
        blocked: false,
        blockUntil: null
      });
    }
    
    const client = requestCounts.get(clientId);
    
    // Check if client is blocked
    if (client.blocked && client.blockUntil > now) {
      const remainingTime = Math.ceil((client.blockUntil - now) / 1000);
      
      logger.warn('Blocked client attempted access', {
        clientId,
        remainingBlockTime: remainingTime
      });
      
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'You have been temporarily blocked due to excessive requests.',
        retryAfter: remainingTime
      });
    }
    
    // Reset window if expired
    const windowMs = 60 * 1000; // 1 minute window
    if (now - client.windowStart > windowMs) {
      client.count = 0;
      client.windowStart = now;
      client.blocked = false;
    }
    
    // Increment request count
    client.count++;
    
    // Determine rate limit based on user type
    let maxRequests = 60; // Default
    
    if (req.user) {
      switch (req.user.role) {
        case 'admin':
          maxRequests = 200;
          break;
        case 'manager':
          maxRequests = 150;
          break;
        case 'user':
          maxRequests = 100;
          break;
        default:
          maxRequests = 60;
      }
    }
    
    // Check if limit exceeded
    if (client.count > maxRequests) {
      client.violations++;
      
      // Block client if too many violations
      if (client.violations >= 3) {
        client.blocked = true;
        client.blockUntil = now + (5 * 60 * 1000); // 5 minute block
        
        await auditService.logSecurityEvent('CLIENT_BLOCKED', 'high', {
          clientId,
          violations: client.violations,
          blockDuration: '5 minutes'
        });
      }
      
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please slow down.',
        retryAfter: Math.ceil((client.windowStart + windowMs - now) / 1000)
      });
    }
    
    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - client.count);
    res.setHeader('X-RateLimit-Reset', new Date(client.windowStart + windowMs).toISOString());
    
    next();
  };
};

/**
 * Distributed rate limiting using sliding window
 */
export class SlidingWindowRateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60000; // 1 minute
    this.max = options.max || 60;
    this.requests = new Map();
  }
  
  isAllowed(clientId) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Get or create client request log
    if (!this.requests.has(clientId)) {
      this.requests.set(clientId, []);
    }
    
    const clientRequests = this.requests.get(clientId);
    
    // Remove old requests outside window
    const validRequests = clientRequests.filter(time => time > windowStart);
    
    // Check if limit exceeded
    if (validRequests.length >= this.max) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(clientId, validRequests);
    
    return true;
  }
  
  middleware() {
    return (req, res, next) => {
      const clientId = getClientId(req);
      
      if (!this.isAllowed(clientId)) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded using sliding window.',
          retryAfter: Math.ceil(this.windowMs / 1000)
        });
      }
      
      next();
    };
  }
}

/**
 * Token bucket rate limiter for more flexible rate limiting
 */
export class TokenBucketRateLimiter {
  constructor(options = {}) {
    this.capacity = options.capacity || 10; // bucket capacity
    this.refillRate = options.refillRate || 1; // tokens per second
    this.buckets = new Map();
  }
  
  getBucket(clientId) {
    if (!this.buckets.has(clientId)) {
      this.buckets.set(clientId, {
        tokens: this.capacity,
        lastRefill: Date.now()
      });
    }
    
    const bucket = this.buckets.get(clientId);
    const now = Date.now();
    const timePassed = (now - bucket.lastRefill) / 1000;
    
    // Refill tokens
    bucket.tokens = Math.min(
      this.capacity,
      bucket.tokens + (timePassed * this.refillRate)
    );
    bucket.lastRefill = now;
    
    return bucket;
  }
  
  consume(clientId, tokens = 1) {
    const bucket = this.getBucket(clientId);
    
    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens;
      return true;
    }
    
    return false;
  }
  
  middleware(tokensRequired = 1) {
    return (req, res, next) => {
      const clientId = getClientId(req);
      
      if (!this.consume(clientId, tokensRequired)) {
        const bucket = this.getBucket(clientId);
        const refillTime = Math.ceil((tokensRequired - bucket.tokens) / this.refillRate);
        
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Token bucket empty.',
          retryAfter: refillTime
        });
      }
      
      next();
    };
  }
}

/**
 * Cost-based rate limiting for expensive operations
 */
export const costBasedRateLimiter = (getCost) => {
  const limiter = new TokenBucketRateLimiter({
    capacity: 100,
    refillRate: 10
  });
  
  return (req, res, next) => {
    const cost = getCost(req);
    const clientId = getClientId(req);
    
    if (!limiter.consume(clientId, cost)) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Operation cost (${cost}) exceeds available rate limit.`,
        cost,
        retryAfter: Math.ceil(cost / limiter.refillRate)
      });
    }
    
    res.setHeader('X-RateLimit-Cost', cost);
    next();
  };
};

/**
 * Cleanup old request counts periodically
 */
setInterval(() => {
  const now = Date.now();
  const windowMs = 60 * 1000;
  
  for (const [clientId, data] of requestCounts.entries()) {
    if (now - data.windowStart > windowMs * 10) { // Remove after 10 windows
      requestCounts.delete(clientId);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

export default rateLimiter;