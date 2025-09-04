// backend/server.js
// Main server entry point for VegeMarket Pro

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

// Import app and database
import app from './app.js';
import sequelize from './config/database.js';
import { logger } from './utils/logger.js';

// Server configuration
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Database sync options
const syncOptions = {
  force: false, // Never drop tables in production
  alter: NODE_ENV === 'development', // Only alter in development
  logging: NODE_ENV === 'development' ? console.log : false
};

// Initialize server
const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('✅ Database connection established successfully');
    
    // Sync database models
    await sequelize.sync(syncOptions);
    logger.info('✅ Database models synchronized');
    
    // Start Express server
    const server = app.listen(PORT, HOST, () => {
      logger.info(`
        🚀 Server is running!
        🔧 Environment: ${NODE_ENV}
        🌐 URL: http://${HOST}:${PORT}
        📚 API: http://${HOST}:${PORT}/api/v1
        📖 Docs: http://${HOST}:${PORT}/api-docs
        🕐 Started: ${new Date().toISOString()}
      `);
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      
      // Close server
      server.close(async () => {
        logger.info('✅ HTTP server closed');
        
        try {
          // Close database connection
          await sequelize.close();
          logger.info('✅ Database connection closed');
          
          // Exit process
          process.exit(0);
        } catch (error) {
          logger.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });
      
      // Force close after 10 seconds
      setTimeout(() => {
        logger.error('❌ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('❌ Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;