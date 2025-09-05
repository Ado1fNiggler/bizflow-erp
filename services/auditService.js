// services/auditService.js
// Service για διαχείριση audit trail και security monitoring

import { Op, Sequelize } from 'sequelize';
import AuditLog from '../models/AuditLog.js';
import emailService from './emailService.js';
import moment from 'moment';
import sequelize from '../config/database.js';

class AuditService {
  constructor() {
    this.securityAlertThresholds = {
      failedLogins: 5,           // Σε 5 λεπτά
      suspiciousActivity: 10,    // Σε 10 λεπτά
      dataExports: 100,          // Σε 1 ώρα
      deletions: 50               // Σε 1 ώρα
    };
  }

  // ======================
  // Logging Methods
  // ======================

  async log(data) {
    try {
      // Only disable if explicitly set
      if (process.env.DISABLE_AUDIT_LOGGING === 'true') {
        console.log('🔍 Audit event (logging disabled):', { action: data.action, entityType: data.entityType });
        return null;
      }
      
      // Check if AuditLog table exists
      await AuditLog.describe();
      
      // Βασική καταγραφή
      const logEntry = await AuditLog.create({
        ...data,
        timestamp: data.timestamp || new Date()
      });

      // Έλεγχος για security alerts
      await this.checkSecurityThresholds(data);

      // Real-time monitoring για critical events
      if (data.severity === 'critical' || data.isSecurityEvent) {
        await this.handleCriticalEvent(logEntry);
      }

      return logEntry;
    } catch (error) {
      // Log error but don't break the application
      if (error.name === 'SequelizeDatabaseError' && error.message.includes('does not exist')) {
        console.warn('⚠️ Audit log table not found, skipping audit logging');
      } else {
        console.error('Audit logging error:', error);
      }
      // Δεν πετάμε error για να μην διακοπεί η κανονική λειτουργία
      return null;
    }
  }

  async logUserAction(userId, action, details = {}) {
    return await this.log({
      userId,
      action,
      ...details
    });
  }

  async logSystemEvent(event, details = {}) {
    return await this.log({
      action: event,
      entityType: 'system',
      category: 'system',
      ...details
    });
  }

  async logSecurityEvent(event, severity = 'high', details = {}) {
    return await this.log({
      action: event,
      severity,
      isSecurityEvent: true,
      category: 'security',
      ...details
    });
  }

  // ======================
  // Security Monitoring
  // ======================

  async checkSecurityThresholds(logData) {
    // Only disable if explicitly set
    if (process.env.DISABLE_AUDIT_LOGGING === 'true') {
      return;
    }

    const { action, userId, ipAddress } = logData;

    // Failed login attempts
    if (action === 'login' && logData.status === 'failure') {
      await this.checkFailedLogins(userId, ipAddress);
    }

    // Mass data exports
    if (action === 'export') {
      await this.checkDataExports(userId);
    }

    // Mass deletions
    if (action === 'delete') {
      await this.checkMassDeletions(userId);
    }

    // Unusual activity patterns
    await this.detectAnomalies(userId, ipAddress);
  }

  async checkFailedLogins(userId, ipAddress) {
    try {
      const recentFailures = await AuditLog.count({
        where: {
          action: 'login',
          status: 'failure',
          [Op.or]: [
            { userId },
            { ipAddress }
          ],
          timestamp: {
            [Op.gte]: moment().subtract(5, 'minutes').toDate()
          }
        }
      });

      if (recentFailures >= this.securityAlertThresholds.failedLogins) {
        await this.triggerSecurityAlert({
          type: 'BRUTE_FORCE_ATTEMPT',
          severity: 'high',
          details: {
            userId,
            ipAddress,
            failedAttempts: recentFailures
          }
        });
      }
    } catch (error) {
      console.error('Error checking failed logins:', error);
    }
  }

  async checkDataExports(userId) {
    const recentExports = await AuditLog.count({
      where: {
        userId,
        action: 'export',
        timestamp: {
          [Op.gte]: moment().subtract(1, 'hour').toDate()
        }
      }
    });

    if (recentExports >= this.securityAlertThresholds.dataExports) {
      await this.triggerSecurityAlert({
        type: 'MASS_DATA_EXPORT',
        severity: 'medium',
        details: {
          userId,
          exportCount: recentExports
        }
      });
    }
  }

  async checkMassDeletions(userId) {
    const recentDeletions = await AuditLog.count({
      where: {
        userId,
        action: 'delete',
        timestamp: {
          [Op.gte]: moment().subtract(1, 'hour').toDate()
        }
      }
    });

    if (recentDeletions >= this.securityAlertThresholds.deletions) {
      await this.triggerSecurityAlert({
        type: 'MASS_DELETION',
        severity: 'critical',
        details: {
          userId,
          deletionCount: recentDeletions
        }
      });
    }
  }

  async detectAnomalies(userId, ipAddress) {
    if (!userId) return;

    // Έλεγχος για πρόσβαση από νέα IP
    const userIPs = await AuditLog.findAll({
      attributes: ['ipAddress'],
      where: {
        userId,
        timestamp: {
          [Op.gte]: moment().subtract(30, 'days').toDate()
        }
      },
      group: ['ipAddress']
    });

    const knownIPs = userIPs.map(log => log.ipAddress);
    
    if (ipAddress && !knownIPs.includes(ipAddress)) {
      await this.log({
        userId,
        action: 'login',
        category: 'security',
        severity: 'low',
        description: 'Login from new IP address',
        metadata: { newIP: ipAddress, knownIPs }
      });
    }

    // Έλεγχος για ασυνήθιστη ώρα πρόσβασης
    const hour = moment().hour();
    if (hour >= 2 && hour <= 5) {
      await this.log({
        userId,
        action: 'access',
        category: 'security',
        severity: 'low',
        description: 'Access during unusual hours',
        metadata: { hour }
      });
    }
  }

  // ======================
  // Alert Management
  // ======================

  async triggerSecurityAlert(alert) {
    const { type, severity, details } = alert;

    // Log the security alert
    await this.logSecurityEvent(type, severity, details);

    // Send email notification for high/critical alerts
    if (['high', 'critical'].includes(severity)) {
      await this.sendSecurityEmail(alert);
    }

    // Additional actions based on alert type
    switch (type) {
      case 'BRUTE_FORCE_ATTEMPT':
        // TODO: Temporarily block IP or lock account
        break;
      case 'MASS_DELETION':
        // TODO: Temporarily revoke delete permissions
        break;
      case 'MASS_DATA_EXPORT':
        // TODO: Rate limit exports
        break;
    }

    console.warn(`🚨 Security Alert: ${type}`, details);
  }

  async sendSecurityEmail(alert) {
    try {
      await emailService.send({
        to: process.env.SECURITY_EMAIL || process.env.ADMIN_EMAIL,
        subject: `🚨 Security Alert: ${alert.type}`,
        html: this.generateAlertEmailHTML(alert)
      });
    } catch (error) {
      console.error('Failed to send security email:', error);
    }
  }

  generateAlertEmailHTML(alert) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc3545; color: white; padding: 20px; text-align: center;">
          <h1>Security Alert</h1>
        </div>
        <div style="padding: 20px; background: #f8f9fa;">
          <h2>Alert Type: ${alert.type}</h2>
          <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
          <p><strong>Time:</strong> ${moment().format('DD/MM/YYYY HH:mm:ss')}</p>
          
          <h3>Details:</h3>
          <pre style="background: white; padding: 15px; border-radius: 5px;">
${JSON.stringify(alert.details, null, 2)}
          </pre>
          
          <p style="margin-top: 20px;">
            <a href="${process.env.APP_URL}/admin/audit-logs" 
               style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              View Audit Logs
            </a>
          </p>
        </div>
      </div>
    `;
  }

  async handleCriticalEvent(logEntry) {
    // Immediate notification
    console.error('⚠️ CRITICAL EVENT:', {
      id: logEntry.id,
      action: logEntry.action,
      userId: logEntry.userId,
      entityType: logEntry.entityType,
      entityId: logEntry.entityId
    });

    // Store in critical events cache for dashboard
    // TODO: Implement Redis cache for real-time dashboard
  }

  // ======================
  // Reporting & Analytics
  // ======================

  async getSecurityReport(options = {}) {
    const {
      startDate = moment().subtract(7, 'days').toDate(),
      endDate = new Date()
    } = options;

    const [
      totalEvents,
      securityEvents,
      failedLogins,
      userActivity,
      topActions
    ] = await Promise.all([
      this.getTotalEvents(startDate, endDate),
      this.getSecurityEvents(startDate, endDate),
      this.getFailedLogins(startDate, endDate),
      this.getUserActivity(startDate, endDate),
      this.getTopActions(startDate, endDate)
    ]);

    return {
      period: {
        startDate: moment(startDate).format('DD/MM/YYYY'),
        endDate: moment(endDate).format('DD/MM/YYYY')
      },
      summary: {
        totalEvents,
        securityEvents: securityEvents.length,
        failedLogins,
        activeUsers: userActivity.length
      },
      securityEvents,
      userActivity,
      topActions,
      generatedAt: new Date()
    };
  }

  async getTotalEvents(startDate, endDate) {
    return await AuditLog.count({
      where: {
        timestamp: {
          [Op.between]: [startDate, endDate]
        }
      }
    });
  }

  async getSecurityEvents(startDate, endDate) {
    return await AuditLog.findAll({
      where: {
        isSecurityEvent: true,
        timestamp: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['severity', 'DESC'], ['timestamp', 'DESC']],
      limit: 100
    });
  }

  async getFailedLogins(startDate, endDate) {
    return await AuditLog.count({
      where: {
        action: 'login',
        status: 'failure',
        timestamp: {
          [Op.between]: [startDate, endDate]
        }
      }
    });
  }

  async getUserActivity(startDate, endDate) {
    return await AuditLog.findAll({
      attributes: [
        'userId',
        'userName',
        [sequelize.fn('COUNT', sequelize.col('id')), 'actionCount'],
        [sequelize.fn('MAX', sequelize.col('timestamp')), 'lastActivity']
      ],
      where: {
        userId: {
          [Op.ne]: null
        },
        timestamp: {
          [Op.between]: [startDate, endDate]
        }
      },
      group: ['userId', 'userName'],
      order: [[sequelize.literal('actionCount'), 'DESC']],
      limit: 20
    });
  }

  async getTopActions(startDate, endDate) {
    return await AuditLog.findAll({
      attributes: [
        'action',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        timestamp: {
          [Op.between]: [startDate, endDate]
        }
      },
      group: ['action'],
      order: [[sequelize.literal('count'), 'DESC']],
      limit: 10
    });
  }

  // ======================
  // Cleanup & Maintenance
  // ======================

  async cleanupOldLogs(retentionDays = 90) {
    try {
      const cutoffDate = moment().subtract(retentionDays, 'days').toDate();
      
      // Archive critical logs before deletion
      const criticalLogs = await AuditLog.findAll({
        where: {
          timestamp: {
            [Op.lt]: cutoffDate
          },
          [Op.or]: [
            { severity: 'critical' },
            { isSecurityEvent: true }
          ]
        }
      });

      if (criticalLogs.length > 0) {
        // TODO: Archive to long-term storage (S3, etc.)
        console.log(`Archiving ${criticalLogs.length} critical logs`);
      }

      // Delete old non-critical logs
      const deleted = await AuditLog.destroy({
        where: {
          timestamp: {
            [Op.lt]: cutoffDate
          },
          severity: {
            [Op.ne]: 'critical'
          },
          isSecurityEvent: false
        }
      });

      console.log(`Cleaned up ${deleted} old audit logs`);
      
      await this.logSystemEvent('cleanup', {
        description: 'Automated audit log cleanup',
        metadata: {
          retentionDays,
          deletedCount: deleted,
          archivedCount: criticalLogs.length
        }
      });

      return { deleted, archived: criticalLogs.length };
    } catch (error) {
      console.error('Error cleaning up audit logs:', error);
      throw error;
    }
  }

  // ======================
  // Compliance & GDPR
  // ======================

  async exportUserAuditTrail(userId, options = {}) {
    const logs = await AuditLog.findAll({
      where: {
        userId
      },
      order: [['timestamp', 'DESC']]
    });

    // Φιλτράρισμα ευαίσθητων πληροφοριών
    const sanitizedLogs = logs.map(log => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityName: log.entityName,
      timestamp: log.timestamp,
      status: log.status,
      description: log.description
      // Αποκλείουμε: IP addresses, user agents, κλπ
    }));

    return sanitizedLogs;
  }

  async anonymizeUserLogs(userId) {
    // Για GDPR compliance - διατήρηση logs χωρίς προσωπικά δεδομένα
    await AuditLog.update({
      userId: null,
      userName: 'ANONYMIZED',
      userEmail: null,
      ipAddress: null,
      userAgent: null
    }, {
      where: { userId }
    });

    await this.logSystemEvent('anonymization', {
      description: 'User data anonymized for GDPR compliance',
      metadata: { userId }
    });
  }
}

export default new AuditService();