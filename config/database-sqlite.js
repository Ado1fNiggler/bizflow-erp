// config/database-sqlite.js
// SQLite configuration for development without PostgreSQL

import { Sequelize } from 'sequelize';
import { logger } from '../middleware/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SQLite configuration
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../database.sqlite'),
  logging: false, // Set to console.log for debugging
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Test database connection
export const testDatabaseConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('✅ SQLite database connection established successfully');
    return true;
  } catch (error) {
    logger.error('❌ Unable to connect to SQLite database:', error);
    return false;
  }
};

// Sync database (create tables if not exist)
export const syncDatabase = async (force = false) => {
  try {
    await sequelize.sync({ force });
    logger.info(`✅ SQLite database synchronized ${force ? '(force)' : ''}`);
    return true;
  } catch (error) {
    logger.error('❌ Database synchronization failed:', error);
    return false;
  }
};

// Close database connection
export const closeDatabaseConnection = async () => {
  try {
    await sequelize.close();
    logger.info('✅ SQLite database connection closed gracefully');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
};

// Query hooks for monitoring
const env = process.env.NODE_ENV || 'development';
if (env === 'development') {
  sequelize.addHook('beforeBulkCreate', (options) => {
    logger.debug('Bulk creating records...');
  });
  
  sequelize.addHook('afterBulkCreate', (options) => {
    logger.debug('Bulk create completed');
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeDatabaseConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeDatabaseConnection();
  process.exit(0);
});

export default sequelize;