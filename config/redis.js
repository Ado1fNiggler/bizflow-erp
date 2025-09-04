// config/redis.js
// Redis configuration for caching and sessions

import Redis from 'ioredis';
import { logger } from '../middleware/logger.js';

// Redis connection options
const redisConfig = {
  development: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: process.env.REDIS_DB || 0,
    keyPrefix: 'bizflow:dev:',
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    reconnectOnError: (err) => {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        return true;
      }
      return false;
    },
    showFriendlyErrorStack: true,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3
  },
  
  production: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB || 0,
    keyPrefix: 'bizflow:prod:',
    retryStrategy: (times) => {
      const delay = Math.min(times * 100, 3000);
      return delay;
    },
    reconnectOnError: (err) => {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        return true;
      }
      return false;
    },
    enableOfflineQueue: true,
    connectTimeout: 10000,
    disconnectTimeout: 2000,
    commandTimeout: 5000,
    maxRetriesPerRequest: 3,
    // TLS for production (if using Redis with SSL)
    ...(process.env.REDIS_TLS === 'true' && {
      tls: {
        rejectUnauthorized: false
      }
    })
  }
};

// Get current environment configuration
const env = process.env.NODE_ENV || 'development';
const config = redisConfig[env];

// Create Redis client
let redisClient = null;
let isConnected = false;

// Initialize Redis connection
export const initializeRedis = () => {
  if (!config.host) {
    logger.warn('Redis host not configured, skipping Redis initialization');
    return null;
  }
  
  try {
    // Use Redis URL if available (for cloud services like Redis Cloud, Heroku Redis)
    if (process.env.REDIS_URL) {
      redisClient = new Redis(process.env.REDIS_URL, {
        ...config,
        lazyConnect: true
      });
    } else {
      redisClient = new Redis(config);
    }
    
    // Connection event handlers
    redisClient.on('connect', () => {
      logger.info('✅ Redis client connected');
      isConnected = true;
    });
    
    redisClient.on('ready', () => {
      logger.info('✅ Redis client ready');
    });
    
    redisClient.on('error', (err) => {
      logger.error('❌ Redis client error:', err);
      isConnected = false;
    });
    
    redisClient.on('close', () => {
      logger.warn('Redis client connection closed');
      isConnected = false;
    });
    
    redisClient.on('reconnecting', (delay) => {
      logger.info(`Redis client reconnecting in ${delay}ms`);
    });
    
    redisClient.on('end', () => {
      logger.warn('Redis client connection ended');
      isConnected = false;
    });
    
    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    return null;
  }
};

// Cache wrapper class
export class CacheService {
  constructor(client = redisClient, options = {}) {
    this.client = client;
    this.defaultTTL = options.ttl || 3600; // 1 hour default
    this.prefix = options.prefix || '';
  }
  
  // Get cache key
  getKey(key) {
    return this.prefix ? `${this.prefix}:${key}` : key;
  }
  
  // Get value from cache
  async get(key) {
    if (!this.client || !isConnected) return null;
    
    try {
      const value = await this.client.get(this.getKey(key));
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }
  
  // Set value in cache
  async set(key, value, ttl = this.defaultTTL) {
    if (!this.client || !isConnected) return false;
    
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.client.setex(this.getKey(key), ttl, serialized);
      } else {
        await this.client.set(this.getKey(key), serialized);
      }
      return true;
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }
  
  // Delete from cache
  async delete(key) {
    if (!this.client || !isConnected) return false;
    
    try {
      await this.client.del(this.getKey(key));
      return true;
    } catch (error) {
      logger.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }
  
  // Clear cache by pattern
  async clearPattern(pattern) {
    if (!this.client || !isConnected) return false;
    
    try {
      const keys = await this.client.keys(this.getKey(pattern));
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      return true;
    } catch (error) {
      logger.error(`Redis CLEAR error for pattern ${pattern}:`, error);
      return false;
    }
  }
  
  // Check if key exists
  async exists(key) {
    if (!this.client || !isConnected) return false;
    
    try {
      const exists = await this.client.exists(this.getKey(key));
      return exists === 1;
    } catch (error) {
      logger.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }
  
  // Get TTL for key
  async ttl(key) {
    if (!this.client || !isConnected) return -1;
    
    try {
      return await this.client.ttl(this.getKey(key));
    } catch (error) {
      logger.error(`Redis TTL error for key ${key}:`, error);
      return -1;
    }
  }
  
  // Increment counter
  async increment(key, amount = 1) {
    if (!this.client || !isConnected) return 0;
    
    try {
      return await this.client.incrby(this.getKey(key), amount);
    } catch (error) {
      logger.error(`Redis INCR error for key ${key}:`, error);
      return 0;
    }
  }
  
  // Add to set
  async addToSet(key, ...members) {
    if (!this.client || !isConnected) return false;
    
    try {
      await this.client.sadd(this.getKey(key), ...members);
      return true;
    } catch (error) {
      logger.error(`Redis SADD error for key ${key}:`, error);
      return false;
    }
  }
  
  // Get set members
  async getSetMembers(key) {
    if (!this.client || !isConnected) return [];
    
    try {
      return await this.client.smembers(this.getKey(key));
    } catch (error) {
      logger.error(`Redis SMEMBERS error for key ${key}:`, error);
      return [];
    }
  }
  
  // Cache with refresh
  async getOrSet(key, fetchFunction, ttl = this.defaultTTL) {
    // Try to get from cache
    let value = await this.get(key);
    
    if (value === null) {
      // Fetch fresh value
      value = await fetchFunction();
      
      // Store in cache
      if (value !== null && value !== undefined) {
        await this.set(key, value, ttl);
      }
    }
    
    return value;
  }
}

// Rate limiter using Redis
export class RedisRateLimiter {
  constructor(client = redisClient, options = {}) {
    this.client = client;
    this.windowMs = options.windowMs || 60000; // 1 minute
    this.max = options.max || 100;
  }
  
  async isAllowed(identifier) {
    if (!this.client || !isConnected) return true; // Allow if Redis is down
    
    const key = `ratelimit:${identifier}`;
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    try {
      // Remove old entries
      await this.client.zremrangebyscore(key, '-inf', windowStart);
      
      // Count current entries
      const count = await this.client.zcard(key);
      
      if (count < this.max) {
        // Add current request
        await this.client.zadd(key, now, `${now}-${Math.random()}`);
        await this.client.expire(key, Math.ceil(this.windowMs / 1000));
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Redis rate limiter error:', error);
      return true; // Allow if error
    }
  }
  
  async reset(identifier) {
    if (!this.client || !isConnected) return;
    
    const key = `ratelimit:${identifier}`;
    await this.client.del(key);
  }
}

// Session store for Express using Redis
export class RedisSessionStore {
  constructor(client = redisClient, options = {}) {
    this.client = client;
    this.prefix = options.prefix || 'sess:';
    this.ttl = options.ttl || 86400; // 24 hours
  }
  
  async get(sid) {
    if (!this.client || !isConnected) return null;
    
    const key = `${this.prefix}${sid}`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }
  
  async set(sid, session) {
    if (!this.client || !isConnected) return;
    
    const key = `${this.prefix}${sid}`;
    await this.client.setex(key, this.ttl, JSON.stringify(session));
  }
  
  async destroy(sid) {
    if (!this.client || !isConnected) return;
    
    const key = `${this.prefix}${sid}`;
    await this.client.del(key);
  }
  
  async touch(sid) {
    if (!this.client || !isConnected) return;
    
    const key = `${this.prefix}${sid}`;
    await this.client.expire(key, this.ttl);
  }
}

// Initialize Redis client on module load
if (process.env.REDIS_ENABLED === 'true') {
  initializeRedis();
}

// Create cache service instance
export const cache = new CacheService(redisClient);

// Create rate limiter instance
export const rateLimiter = new RedisRateLimiter(redisClient);

// Export utilities
export const getRedisClient = () => redisClient;
export const isRedisConnected = () => isConnected;
export const closeRedisConnection = async () => {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis connection closed');
  }
};

export default {
  client: redisClient,
  cache,
  rateLimiter,
  CacheService,
  RedisRateLimiter,
  RedisSessionStore,
  initializeRedis,
  getRedisClient,
  isRedisConnected,
  closeRedisConnection
};