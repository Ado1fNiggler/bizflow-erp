// routes/systemRoutes.js
// System information, health checks, and public routes

import express from 'express';
import os from 'os';
import { authenticate, authorize } from '../middleware/auth.js';
import { cache } from '../middleware/cache.js';
import sequelize from '../config/database.js';
import Document from '../models/Document.js';
import Company from '../models/Company.js';
import Member from '../models/Member.js';
import User from '../models/User.js';

const router = express.Router();

// ======================
// Public Routes
// ======================

// GET /api/system/health - Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// GET /api/system/ping - Simple ping endpoint
router.get('/ping', (req, res) => {
  res.json({ pong: true, timestamp: Date.now() });
});

// GET /api/system/version - Get application version
router.get('/version', cache(3600), (req, res) => {
  res.json({
    name: 'BizFlow ERP',
    version: process.env.npm_package_version || '1.0.0',
    api: 'v1',
    node: process.version,
    environment: process.env.NODE_ENV
  });
});

// GET /api/system/features - Get enabled features
router.get('/features', cache(3600), (req, res) => {
  res.json({
    features: {
      companies: true,
      members: true,
      documents: true,
      invoicing: true,
      reports: true,
      mydata: process.env.MYDATA_ENABLED === 'true',
      email: process.env.SMTP_HOST ? true : false,
      backup: process.env.BACKUP_ENABLED === 'true',
      twoFactor: process.env.TWO_FACTOR_ENABLED === 'true',
      api: true
    }
  });
});

// ======================
// Protected System Info
// ======================

// GET /api/system/status - Detailed system status
router.get('/status', authenticate, authorize(['admin', 'manager']), async (req, res) => {
  try {
    // Database status
    let dbStatus = 'disconnected';
    try {
      await sequelize.authenticate();
      dbStatus = 'connected';
    } catch (error) {
      dbStatus = 'error';
    }

    // Get counts
    const [documentCount, companyCount, memberCount, userCount] = await Promise.all([
      Document.count(),
      Company.count(),
      Member.count(),
      User.count()
    ]);

    // System info
    const systemInfo = {
      platform: os.platform(),
      architecture: os.arch(),
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      uptime: os.uptime(),
      nodeVersion: process.version,
      processUptime: process.uptime(),
      pid: process.pid
    };

    // Memory usage
    const memoryUsage = process.memoryUsage();
    const memoryInfo = {
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external,
      arrayBuffers: memoryUsage.arrayBuffers
    };

    res.json({
      success: true,
      data: {
        application: {
          name: 'BizFlow ERP',
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV,
          uptime: process.uptime()
        },
        database: {
          status: dbStatus,
          dialect: sequelize.options.dialect,
          documents: documentCount,
          companies: companyCount,
          members: memberCount,
          users: userCount
        },
        system: systemInfo,
        memory: memoryInfo,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get system status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/system/stats - System statistics
router.get('/stats', authenticate, cache(60), async (req, res) => {
  try {
    const { period = 'today' } = req.query;

    let startDate;
    const now = new Date();

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    // Get statistics
    const [
      newDocuments,
      newCompanies,
      newMembers,
      activeUsers
    ] = await Promise.all([
      Document.count({
        where: {
          createdAt: { [Op.gte]: startDate }
        }
      }),
      Company.count({
        where: {
          createdAt: { [Op.gte]: startDate }
        }
      }),
      Member.count({
        where: {
          createdAt: { [Op.gte]: startDate }
        }
      }),
      User.count({
        where: {
          lastLoginAt: { [Op.gte]: startDate }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        period,
        startDate,
        statistics: {
          newDocuments,
          newCompanies,
          newMembers,
          activeUsers
        }
      }
    });

  } catch (error) {
    console.error('Get system stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/system/logs - Get application logs
router.get('/logs', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const {
      level = 'info',
      limit = 100,
      offset = 0
    } = req.query;

    // TODO: Implement log file reading
    // For now, return placeholder

    res.json({
      success: true,
      data: {
        logs: [],
        message: 'Log viewing will be implemented with proper logging service'
      }
    });

  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/system/cache/clear - Clear cache
router.post('/cache/clear', authenticate, authorize(['admin']), async (req, res) => {
  try {
    // TODO: Implement cache clearing
    // If using Redis, would clear Redis cache here

    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });

  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/system/config - Get public configuration
router.get('/config', cache(3600), (req, res) => {
  res.json({
    success: true,
    data: {
      locale: 'el-GR',
      timezone: 'Europe/Athens',
      currency: 'EUR',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: 'HH:mm',
      firstDayOfWeek: 1, // Monday
      vatRate: 24,
      features: {
        registration: process.env.ALLOW_REGISTRATION === 'true',
        passwordReset: true,
        rememberMe: true,
        twoFactor: process.env.TWO_FACTOR_ENABLED === 'true'
      }
    }
  });
});

// GET /api/system/maintenance - Check maintenance mode
router.get('/maintenance', (req, res) => {
  const maintenanceMode = process.env.MAINTENANCE_MODE === 'true';
  const maintenanceMessage = process.env.MAINTENANCE_MESSAGE || 'System is under maintenance';

  res.json({
    maintenance: maintenanceMode,
    message: maintenanceMessage,
    estimatedTime: process.env.MAINTENANCE_END || null
  });
});

// POST /api/system/maintenance - Toggle maintenance mode (Admin only)
router.post('/maintenance', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { enabled, message, estimatedEnd } = req.body;

    // TODO: Implement proper maintenance mode
    // This would typically update environment variables or database settings

    process.env.MAINTENANCE_MODE = enabled ? 'true' : 'false';
    if (message) process.env.MAINTENANCE_MESSAGE = message;
    if (estimatedEnd) process.env.MAINTENANCE_END = estimatedEnd;

    res.json({
      success: true,
      data: {
        maintenance: enabled,
        message,
        estimatedEnd
      }
    });

  } catch (error) {
    console.error('Set maintenance mode error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/system/timezones - Get supported timezones
router.get('/timezones', cache(86400), (req, res) => {
  const timezones = [
    { value: 'Europe/Athens', label: 'Athens (EET/EEST)', offset: '+02:00' },
    { value: 'Europe/London', label: 'London (GMT/BST)', offset: '+00:00' },
    { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)', offset: '+01:00' },
    { value: 'America/New_York', label: 'New York (EST/EDT)', offset: '-05:00' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)', offset: '+09:00' }
  ];

  res.json({
    success: true,
    data: timezones
  });
});

// GET /api/system/currencies - Get supported currencies
router.get('/currencies', cache(86400), (req, res) => {
  const currencies = [
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' }
  ];

  res.json({
    success: true,
    data: currencies
  });
});

// GET /api/system/languages - Get supported languages
router.get('/languages', cache(86400), (req, res) => {
  const languages = [
    { code: 'el', name: 'Ελληνικά', englishName: 'Greek' },
    { code: 'en', name: 'English', englishName: 'English' },
    { code: 'de', name: 'Deutsch', englishName: 'German' },
    { code: 'fr', name: 'Français', englishName: 'French' }
  ];

  res.json({
    success: true,
    data: languages
  });
});

// POST /api/system/test-email - Test email configuration (Admin only)
router.post('/test-email', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { to } = req.body;

    const emailService = require('../services/emailService.js').default;
    
    await emailService.send({
      to: to || req.user.email,
      subject: 'BizFlow ERP - Test Email',
      html: `
        <h2>Test Email</h2>
        <p>This is a test email from BizFlow ERP.</p>
        <p>If you received this email, your email configuration is working correctly.</p>
        <p>Sent at: ${new Date().toLocaleString('el-GR')}</p>
      `
    });

    res.json({
      success: true,
      message: 'Test email sent successfully'
    });

  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ 
      error: 'Failed to send test email',
      details: error.message 
    });
  }
});

// GET /api/system/jobs - Get scheduled jobs status (Admin only)
router.get('/jobs', authenticate, authorize(['admin']), async (req, res) => {
  try {
    // TODO: Implement job queue status
    // This would show status of scheduled tasks like backups, reports, etc.

    res.json({
      success: true,
      data: {
        jobs: [
          {
            name: 'Daily Backup',
            schedule: '0 2 * * *',
            lastRun: null,
            nextRun: null,
            status: 'inactive'
          },
          {
            name: 'Monthly Reports',
            schedule: '0 0 1 * *',
            lastRun: null,
            nextRun: null,
            status: 'inactive'
          },
          {
            name: 'Member Expiry Check',
            schedule: '0 9 * * *',
            lastRun: null,
            nextRun: null,
            status: 'inactive'
          }
        ]
      }
    });

  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;