// middleware/cache.js
// Response caching middleware

import crypto from 'crypto';
import { logger } from './logger.js';

// In-memory cache store (for development/small deployments)
// For production, consider using Redis
const cacheStore = new Map();

/**
 * Generate cache key from request
 */
const generateCacheKey = (req) => {
  const { url, method, query, params } = req;
  const userId = req.user?.id || 'anonymous';
  
  const keyData = {
    method,
    url,
    query,
    params,
    userId
  };
  
  return crypto
    .createHash('md5')
    .update(JSON.stringify(keyData))
    .digest('hex');
};

/**
 * Check if cache entry is still valid
 */
const isCacheValid = (entry) => {
  if (!entry) return false;
  
  const now = Date.now();
  return now < entry.expiresAt;
};

/**
 * Cache middleware factory
 * @param {number} duration - Cache duration in seconds
 * @param {object} options - Cache options
 */
export const cache = (duration = 60, options = {}) => {
  const {
    keyGenerator = generateCacheKey,
    condition = () => true,
    varyBy = ['user'],
    cacheControl = true
  } = options;
  
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Skip if condition not met
    if (!condition(req)) {
      return next();
    }
    
    // Skip if user wants fresh data
    if (req.headers['cache-control'] === 'no-cache' || 
        req.headers['pragma'] === 'no-cache') {
      return next();
    }
    
    // Generate cache key
    const cacheKey = keyGenerator(req);
    
    // Check if cached response exists
    const cachedEntry = cacheStore.get(cacheKey);
    
    if (cachedEntry && isCacheValid(cachedEntry)) {
      // Send cached response
      logger.debug('Cache hit', {
        key: cacheKey,
        path: req.path,
        remainingTTL: Math.floor((cachedEntry.expiresAt - Date.now()) / 1000)
      });
      
      // Set cache headers
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-Key', cacheKey);
      res.setHeader('X-Cache-TTL', duration);
      
      if (cacheControl) {
        res.setHeader('Cache-Control', `public, max-age=${duration}`);
      }
      
      // Send cached response
      res.status(cachedEntry.statusCode || 200);
      
      // Set cached headers
      Object.entries(cachedEntry.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      
      return res.json(cachedEntry.data);
    }
    
    // Cache miss - proceed with request
    logger.debug('Cache miss', {
      key: cacheKey,
      path: req.path
    });
    
    // Override res.json to cache the response
    const originalJson = res.json.bind(res);
    
    res.json = function(data) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const cacheEntry = {
          data,
          statusCode: res.statusCode,
          headers: {
            'Content-Type': 'application/json'
          },
          createdAt: Date.now(),
          expiresAt: Date.now() + (duration * 1000)
        };
        
        // Store in cache
        cacheStore.set(cacheKey, cacheEntry);
        
        // Set cache headers
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Cache-Key', cacheKey);
        res.setHeader('X-Cache-TTL', duration);
        
        if (cacheControl) {
          res.setHeader('Cache-Control', `public, max-age=${duration}`);
        }
        
        logger.debug('Response cached', {
          key: cacheKey,
          path: req.path,
          ttl: duration
        });
      }
      
      return originalJson(data);
    };
    
    next();
  };
};

/**
 * Clear cache for specific pattern or all
 */
export const clearCache = (pattern = null) => {
  if (!pattern) {
    // Clear all cache
    const size = cacheStore.size;
    cacheStore.clear();
    logger.info('Cache cleared', { entriesRemoved: size });
    return size;
  }
  
  // Clear matching pattern
  let removed = 0;
  for (const [key, value] of cacheStore.entries()) {
    if (key.includes(pattern)) {
      cacheStore.delete(key);
      removed++;
    }
  }
  
  logger.info('Cache cleared by pattern', {
    pattern,
    entriesRemoved: removed
  });
  
  return removed;
};

/**
 * Cache invalidation middleware
 * Clears cache after write operations
 */
export const invalidateCache = (patterns = []) => {
  return (req, res, next) => {
    // Only invalidate on write operations
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      // Override res.json to invalidate cache after response
      const originalJson = res.json.bind(res);
      
      res.json = function(data) {
        // Only invalidate on successful operations
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Determine patterns to invalidate
          const invalidationPatterns = patterns.length > 0 
            ? patterns 
            : [req.baseUrl, req.path.split('/')[1]];
          
          invalidationPatterns.forEach(pattern => {
            clearCache(pattern);
          });
          
          logger.debug('Cache invalidated', {
            method: req.method,
            path: req.path,
            patterns: invalidationPatterns
          });
        }
        
        return originalJson(data);
      };
    }
    
    next();
  };
};

/**
 * Periodic cache cleanup
 * Removes expired entries
 */
export const startCacheCleanup = (interval = 300000) => { // 5 minutes
  setInterval(() => {
    const now = Date.now();
    let removed = 0;
    
    for (const [key, entry] of cacheStore.entries()) {
      if (!isCacheValid(entry)) {
        cacheStore.delete(key);
        removed++;
      }
    }
    
    if (removed > 0) {
      logger.debug('Cache cleanup completed', {
        entriesRemoved: removed,
        remainingEntries: cacheStore.size
      });
    }
  }, interval);
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  const now = Date.now();
  let validEntries = 0;
  let expiredEntries = 0;
  let totalSize = 0;
  
  for (const [key, entry] of cacheStore.entries()) {
    if (isCacheValid(entry)) {
      validEntries++;
    } else {
      expiredEntries++;
    }
    
    // Estimate size (rough)
    totalSize += JSON.stringify(entry).length;
  }
  
  return {
    totalEntries: cacheStore.size,
    validEntries,
    expiredEntries,
    estimatedSize: `${(totalSize / 1024).toFixed(2)} KB`,
    hitRate: 0, // Would need to track hits/misses
    timestamp: new Date().toISOString()
  };
};

/**
 * Redis cache implementation (for production)
 * Uncomment and configure if using Redis
 */
/*
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  db: process.env.REDIS_DB || 0,
  keyPrefix: 'cache:'
});

export const redisCache = (duration = 60, options = {}) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }
    
    const cacheKey = generateCacheKey(req);
    
    try {
      // Check Redis cache
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        const data = JSON.parse(cached);
        res.setHeader('X-Cache', 'HIT');
        return res.json(data);
      }
      
      // Cache miss
      const originalJson = res.json.bind(res);
      
      res.json = function(data) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Store in Redis with TTL
          redis.setex(cacheKey, duration, JSON.stringify(data));
          res.setHeader('X-Cache', 'MISS');
        }
        
        return originalJson(data);
      };
      
    } catch (error) {
      logger.error('Redis cache error', { error: error.message });
    }
    
    next();
  };
};

export const clearRedisCache = async (pattern = '*') => {
  const keys = await redis.keys(`cache:${pattern}`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  return keys.length;
};
*/

// Start cleanup on module load
startCacheCleanup();

export default cache;