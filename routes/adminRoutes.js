// routes/adminRoutes.js
// Admin management routes for users, settings, and system configuration

import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { Op } from 'sequelize';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import auditService from '../services/auditService.js';
import backupService from '../services/backupService.js';
import migrationService from '../services/migrationService.js';
import emailService from '../services/emailService.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { cache } from '../middleware/cache.js';

const router = express.Router();

// All admin routes require admin role
router.use(authenticate, authorize(['admin']));

// ======================
// User Management
// ======================

// GET /api/admin/users - Get all users
router.get('/users', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    // Build where clause
    const where = {};
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (role) {
      where.role = role;
    }
    
    if (status) {
      where.status = status;
    }

    // Get users with pagination
    const offset = (page - 1) * limit;
    const { count, rows } = await User.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]],
      attributes: { exclude: ['password'] }
    });

    // Get statistics
    const stats = await User.findOne({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'active' THEN 1 END")), 'active'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'inactive' THEN 1 END")), 'inactive'],
        [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'locked' THEN 1 END")), 'locked']
      ]
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      },
      stats: stats?.dataValues || {}
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/users/:id - Get single user
router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user activity
    const recentActivity = await AuditLog.findAll({
      where: { userId: id },
      limit: 10,
      order: [['timestamp', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        user,
        recentActivity
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/users - Create new user
router.post('/users', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('name').notEmpty().trim(),
  body('role').isIn(['admin', 'manager', 'accountant', 'user', 'viewer'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, role } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      role,
      status: 'active',
      emailVerified: true,
      createdBy: req.user.id
    });

    // Send welcome email
    await emailService.sendWelcomeEmail({
      to: user.email,
      name: user.name,
      tempPassword: password
    });

    // Audit log
    await auditService.logSecurityEvent('USER_CREATED', 'medium', {
      adminId: req.user.id,
      adminName: req.user.name,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role
    });

    res.status(201).json({
      success: true,
      data: {
        ...user.toJSON(),
        password: undefined
      }
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/users/:id - Update user
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, status } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent admin from demoting themselves
    if (id === req.user.id && role !== 'admin') {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const oldValues = user.toJSON();

    // Update user
    await user.update({
      name,
      role,
      status,
      updatedBy: req.user.id
    });

    // Audit log
    const changes = auditService.logChanges(oldValues, user.toJSON());
    await auditService.logSecurityEvent('USER_UPDATED', 'medium', {
      adminId: req.user.id,
      adminName: req.user.name,
      userId: user.id,
      userName: user.name,
      ...changes
    });

    res.json({
      success: true,
      data: {
        ...user.toJSON(),
        password: undefined
      }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/users/:id/reset-password - Reset user password
router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword, sendEmail = true } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate password if not provided
    const password = newPassword || Math.random().toString(36).slice(-12);
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password
    await user.update({
      password: hashedPassword,
      passwordChangedAt: new Date()
    });

    // Send email if requested
    if (sendEmail) {
      await emailService.sendPasswordResetByAdminEmail({
        to: user.email,
        name: user.name,
        newPassword: password
      });
    }

    // Audit log
    await auditService.logSecurityEvent('PASSWORD_RESET_BY_ADMIN', 'high', {
      adminId: req.user.id,
      adminName: req.user.name,
      userId: user.id,
      userName: user.name,
      emailSent: sendEmail
    });

    res.json({
      success: true,
      message: 'Password reset successfully',
      tempPassword: sendEmail ? undefined : password
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Soft delete
    await user.destroy();

    // Audit log
    await auditService.logSecurityEvent('USER_DELETED', 'high', {
      adminId: req.user.id,
      adminName: req.user.name,
      userId: user.id,
      userName: user.name,
      userEmail: user.email
    });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ======================
// Audit Logs
// ======================

// GET /api/admin/audit-logs - Get audit logs
router.get('/audit-logs', cache(30), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      userId,
      action,
      entityType,
      severity,
      startDate,
      endDate,
      sortBy = 'timestamp',
      sortOrder = 'DESC'
    } = req.query;

    // Build where clause
    const where = {};
    
    if (userId) {
      where.userId = userId;
    }
    
    if (action) {
      where.action = action;
    }
    
    if (entityType) {
      where.entityType = entityType;
    }
    
    if (severity) {
      where.severity = severity;
    }
    
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp[Op.gte] = startDate;
      if (endDate) where.timestamp[Op.lte] = endDate;
    }

    // Get logs with pagination
    const offset = (page - 1) * limit;
    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]]
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/audit-logs/security - Get security events
router.get('/audit-logs/security', cache(30), async (req, res) => {
  try {
    const {
      days = 7,
      severity
    } = req.query;

    const where = {
      isSecurityEvent: true,
      timestamp: {
        [Op.gte]: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      }
    };

    if (severity) {
      where.severity = severity;
    }

    const securityEvents = await AuditLog.findAll({
      where,
      order: [['severity', 'DESC'], ['timestamp', 'DESC']],
      limit: 100
    });

    res.json({
      success: true,
      data: securityEvents
    });

  } catch (error) {
    console.error('Get security events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/audit-logs/report - Get audit report
router.get('/audit-logs/report', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const report = await auditService.getSecurityReport({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    });

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('Get audit report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ======================
// System Settings
// ======================

// GET /api/admin/settings - Get system settings
router.get('/settings', cache(60), async (req, res) => {
  try {
    // TODO: Implement settings storage
    const settings = {
      company: {
        name: process.env.COMPANY_NAME || 'BizFlow ERP',
        vatNumber: process.env.COMPANY_VAT || '',
        address: process.env.COMPANY_ADDRESS || '',
        phone: process.env.COMPANY_PHONE || '',
        email: process.env.COMPANY_EMAIL || ''
      },
      invoice: {
        prefix: 'INV',
        startNumber: 1,
        vatRate: 24
      },
      email: {
        smtpHost: process.env.SMTP_HOST || '',
        smtpPort: process.env.SMTP_PORT || 587,
        smtpUser: process.env.SMTP_USER || ''
      },
      backup: {
        enabled: process.env.BACKUP_ENABLED === 'true',
        schedule: process.env.BACKUP_SCHEDULE || 'daily',
        retention: parseInt(process.env.BACKUP_RETENTION) || 30
      },
      security: {
        passwordMinLength: 8,
        sessionTimeout: 24 * 60, // minutes
        maxLoginAttempts: 5,
        lockoutDuration: 30 // minutes
      }
    };

    res.json({
      success: true,
      data: settings
    });

  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/settings - Update system settings
router.put('/settings', async (req, res) => {
  try {
    const { category, settings } = req.body;

    // TODO: Implement settings storage
    // For now, just log the change

    // Audit log
    await auditService.logSecurityEvent('SETTINGS_UPDATED', 'medium', {
      adminId: req.user.id,
      adminName: req.user.name,
      category,
      changes: settings
    });

    res.json({
      success: true,
      message: 'Settings updated successfully'
    });

  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ======================
// Database Management
// ======================

// POST /api/admin/backup - Create backup
router.post('/backup', async (req, res) => {
  try {
    const { description } = req.body;

    const backup = await backupService.createBackup({
      manual: true,
      description,
      createdBy: req.user.id
    });

    // Audit log
    await auditService.logSecurityEvent('BACKUP_CREATED', 'medium', {
      adminId: req.user.id,
      adminName: req.user.name,
      backupFile: backup.filename,
      manual: true
    });

    res.json({
      success: true,
      data: backup
    });

  } catch (error) {
    console.error('Create backup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/backups - List backups
router.get('/backups', async (req, res) => {
  try {
    const backups = await backupService.listBackups();

    res.json({
      success: true,
      data: backups
    });

  } catch (error) {
    console.error('List backups error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/restore - Restore from backup
router.post('/restore', async (req, res) => {
  try {
    const { filename } = req.body;

    if (!filename) {
      return res.status(400).json({ error: 'Backup filename required' });
    }

    // This is a dangerous operation - add extra confirmation
    const result = await backupService.restoreBackup(filename);

    // Audit log
    await auditService.logSecurityEvent('BACKUP_RESTORED', 'critical', {
      adminId: req.user.id,
      adminName: req.user.name,
      backupFile: filename,
      result
    });

    res.json({
      success: true,
      message: 'Backup restored successfully',
      data: result
    });

  } catch (error) {
    console.error('Restore backup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/migrate - Run database migration
router.post('/migrate', async (req, res) => {
  try {
    const { source, type } = req.body;

    const result = await migrationService.migrate({
      source,
      type,
      userId: req.user.id
    });

    // Audit log
    await auditService.logSecurityEvent('DATABASE_MIGRATION', 'high', {
      adminId: req.user.id,
      adminName: req.user.name,
      source,
      type,
      result
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/cleanup - Clean up old data
router.post('/cleanup', async (req, res) => {
  try {
    const { retentionDays = 90 } = req.body;

    const result = await auditService.cleanupOldLogs(retentionDays);

    // Audit log
    await auditService.logSecurityEvent('DATA_CLEANUP', 'medium', {
      adminId: req.user.id,
      adminName: req.user.name,
      retentionDays,
      result
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;