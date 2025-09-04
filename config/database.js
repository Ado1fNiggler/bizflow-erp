// config/database.js
// Database configuration and connection

import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';
import { logger } from '../middleware/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check database type
const useSQLite = process.env.USE_SQLITE === 'true';
const useMySQL = process.env.DB_PORT === '3306' && !useSQLite;

// Database configuration based on environment
const config = {
  development: useSQLite ? {
    dialect: 'sqlite',
    storage: path.join(__dirname, '../database.sqlite'),
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  } : useMySQL ? {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    logging: (msg) => logger.debug(msg),
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      supportBigNumbers: true,
      bigNumberStrings: true
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true,
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    },
    timezone: '+02:00' // Athens timezone
  } : {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'bizflow_dev',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: (msg) => logger.debug(msg),
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      ssl: false,
      decimalNumbers: true,
      charset: 'utf8',
      supportBigNumbers: true,
      bigNumberStrings: false
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true,
      charset: 'utf8',
      collate: 'utf8_general_ci'
    },
    timezone: '+02:00' // Athens timezone
  },
  
  test: {
    username: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'postgres',
    database: process.env.TEST_DB_NAME || 'bizflow_test',
    host: process.env.TEST_DB_HOST || 'localhost',
    port: process.env.TEST_DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      ssl: false,
      decimalNumbers: true
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true
    },
    timezone: '+02:00'
  },
  
  production: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 20,
      min: 5,
      acquire: 60000,
      idle: 10000,
      evict: 10000
    },
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // For Heroku
      },
      keepAlive: true,
      decimalNumbers: true,
      charset: 'utf8',
      supportBigNumbers: true,
      bigNumberStrings: false
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true,
      charset: 'utf8',
      collate: 'utf8_general_ci'
    },
    timezone: '+02:00',
    retry: {
      max: 3,
      timeout: 5000,
      match: [
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/
      ]
    }
  }
};

// Get current environment
const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Initialize Sequelize
let sequelize;

// Re-check if SQLite should be used (in case it was set during pg import error)
const shouldUseSQLite = process.env.USE_SQLITE === 'true';

if (shouldUseSQLite) {
  // SQLite configuration
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../database.sqlite'),
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  });
} else if (dbConfig.use_env_variable) {
  // Production - use DATABASE_URL
  sequelize = new Sequelize(process.env[dbConfig.use_env_variable], dbConfig);
} else {
  // Development/Test - use individual parameters
  sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    dbConfig
  );
}

// Test database connection
export const connectDatabase = async () => {
  try {
    await sequelize.authenticate();
    logger.info('✅ Database connection established successfully');
    
    // Sync models in development (be careful in production!)
    if (env === 'development' && process.env.DB_SYNC === 'true') {
      await sequelize.sync({ alter: true });
      logger.info('✅ Database models synchronized');
    }
    
    return true;
  } catch (error) {
    logger.error('❌ Unable to connect to database:', error);
    
    // Retry logic for production
    if (env === 'production') {
      logger.info('Retrying database connection in 5 seconds...');
      setTimeout(() => connectDatabase(), 5000);
    } else {
      throw error;
    }
  }
};

// Database health check
export const checkDatabaseHealth = async () => {
  try {
    const result = await sequelize.query('SELECT 1 + 1 AS result');
    return {
      status: 'healthy',
      message: 'Database is responding',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

// Get database statistics
export const getDatabaseStats = async () => {
  try {
    const [results] = await sequelize.query(`
      SELECT 
        pg_database_size(current_database()) as database_size,
        pg_size_pretty(pg_database_size(current_database())) as database_size_pretty,
        (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) as active_connections,
        (SELECT count(*) FROM pg_tables WHERE schemaname = 'public') as table_count,
        (SELECT count(*) FROM pg_indexes WHERE schemaname = 'public') as index_count
    `);
    
    return results[0];
  } catch (error) {
    logger.error('Error getting database stats:', error);
    return null;
  }
};

// Graceful shutdown
export const closeDatabaseConnection = async () => {
  try {
    await sequelize.close();
    logger.info('✅ Database connection closed gracefully');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
};

// Handle connection events
// Note: connectionManager events not available in newer Sequelize versions
// Use hooks instead if needed

// Query hooks for monitoring
if (env === 'development') {
  sequelize.addHook('beforeBulkCreate', (options) => {
    logger.debug('Bulk creating records:', options.model);
  });
  
  sequelize.addHook('beforeBulkUpdate', (options) => {
    logger.debug('Bulk updating records:', options.model);
  });
  
  sequelize.addHook('beforeBulkDestroy', (options) => {
    logger.debug('Bulk deleting records:', options.model);
  });
}

// Add custom validators
Sequelize.prototype.validateGreekVAT = function(value) {
  if (!value) return true;
  
  const cleanVAT = value.toString().replace(/\s/g, '');
  if (!/^\d{9}$/.test(cleanVAT)) {
    throw new Error('Greek VAT must be 9 digits');
  }
  
  const digits = cleanVAT.split('').map(Number);
  let sum = 0;
  
  for (let i = 0; i < 8; i++) {
    sum += digits[i] * Math.pow(2, 8 - i);
  }
  
  const checkDigit = sum % 11 === 10 ? 0 : sum % 11;
  
  if (checkDigit !== digits[8]) {
    throw new Error('Invalid Greek VAT number');
  }
  
  return true;
};

// Export Sequelize instance and utilities
export default sequelize;

export {
  Sequelize,
  config as databaseConfig,
  env as environment
};