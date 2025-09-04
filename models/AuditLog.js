// models/AuditLog.js
// Audit Log Model για καταγραφή ενεργειών

import { DataTypes, Op } from 'sequelize';
import sequelize from '../config/database.js';
import User from './User.js';

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Χρήστης που έκανε την ενέργεια
  userId: {
    type: DataTypes.UUID,
    comment: 'Χρήστης που εκτέλεσε την ενέργεια'
  },
  
  userName: {
    type: DataTypes.STRING(255),
    comment: 'Όνομα χρήστη (cached)'
  },
  
  userEmail: {
    type: DataTypes.STRING(255),
    comment: 'Email χρήστη (cached)'
  },
  
  // Στοιχεία ενέργειας
  action: {
    type: DataTypes.ENUM(
      'create',
      'read',
      'update',
      'delete',
      'login',
      'logout',
      'export',
      'import',
      'print',
      'email',
      'approve',
      'reject',
      'cancel',
      'restore',
      'lock',
      'unlock'
    ),
    allowNull: false,
    comment: 'Τύπος ενέργειας'
  },
  
  category: {
    type: DataTypes.STRING(50),
    comment: 'Κατηγορία ενέργειας'
  },
  
  // Στοιχεία οντότητας
  entityType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Τύπος οντότητας (π.χ. Document, Company)'
  },
  
  entityId: {
    type: DataTypes.STRING(255),
    comment: 'ID οντότητας'
  },
  
  entityName: {
    type: DataTypes.STRING(255),
    comment: 'Όνομα/περιγραφή οντότητας'
  },
  
  // Λεπτομέρειες αλλαγών
  changes: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Αλλαγές που έγιναν'
  },
  
  oldValues: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Προηγούμενες τιμές'
  },
  
  newValues: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Νέες τιμές'
  },
  
  // Πρόσθετες πληροφορίες
  description: {
    type: DataTypes.TEXT,
    comment: 'Περιγραφή ενέργειας'
  },
  
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Επιπλέον metadata'
  },
  
  // Request πληροφορίες
  ipAddress: {
    type: DataTypes.STRING(45),
    comment: 'IP διεύθυνση'
  },
  
  userAgent: {
    type: DataTypes.TEXT,
    comment: 'User agent string'
  },
  
  requestMethod: {
    type: DataTypes.STRING(10),
    comment: 'HTTP method'
  },
  
  requestUrl: {
    type: DataTypes.TEXT,
    comment: 'Request URL'
  },
  
  sessionId: {
    type: DataTypes.STRING(255),
    comment: 'Session ID'
  },
  
  // Αποτέλεσμα
  status: {
    type: DataTypes.ENUM('success', 'failure', 'warning', 'info'),
    defaultValue: 'success',
    comment: 'Κατάσταση ενέργειας'
  },
  
  errorMessage: {
    type: DataTypes.TEXT,
    comment: 'Μήνυμα σφάλματος'
  },
  
  errorStack: {
    type: DataTypes.TEXT,
    comment: 'Error stack trace'
  },
  
  // Performance metrics
  duration: {
    type: DataTypes.INTEGER,
    comment: 'Διάρκεια σε ms'
  },
  
  // Ασφάλεια
  severity: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'low',
    comment: 'Σοβαρότητα ενέργειας'
  },
  
  isSecurityEvent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Είναι θέμα ασφαλείας'
  },
  
  // Timestamp
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
    comment: 'Χρόνος ενέργειας'
  }
}, {
  timestamps: false,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['action']
    },
    {
      fields: ['entity_type', 'entity_id']
    },
    {
      fields: ['timestamp']
    },
    {
      fields: ['status']
    },
    {
      fields: ['severity']
    },
    {
      fields: ['is_security_event']
    }
  ]
});

// Static Methods
AuditLog.logAction = async function(data) {
  try {
    const logEntry = await AuditLog.create(data);
    
    // Αν είναι κρίσιμο security event, στείλε alert
    if (data.isSecurityEvent && data.severity === 'critical') {
      // TODO: Send security alert
      console.error('🚨 CRITICAL SECURITY EVENT:', data);
    }
    
    return logEntry;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Δεν πρέπει να διακόψουμε τη λειτουργία αν αποτύχει το logging
    return null;
  }
};

// Helper για δημιουργία audit log από Express request
AuditLog.logRequest = async function(req, action, details = {}) {
  const userId = req.user?.id;
  const userName = req.user?.name;
  const userEmail = req.user?.email;
  
  return await AuditLog.logAction({
    userId,
    userName,
    userEmail,
    action,
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    requestMethod: req.method,
    requestUrl: req.originalUrl,
    sessionId: req.session?.id,
    ...details
  });
};

// Helper για σύγκριση και καταγραφή αλλαγών
AuditLog.logChanges = function(oldObj, newObj) {
  const changes = {};
  const oldValues = {};
  const newValues = {};
  
  // Βρες τα πεδία που άλλαξαν
  for (const key in newObj) {
    if (oldObj[key] !== newObj[key]) {
      changes[key] = {
        from: oldObj[key],
        to: newObj[key]
      };
      oldValues[key] = oldObj[key];
      newValues[key] = newObj[key];
    }
  }
  
  return { changes, oldValues, newValues };
};

// Helper για ανάλυση audit logs
AuditLog.getActivityReport = async function(options = {}) {
  const {
    userId,
    entityType,
    entityId,
    startDate,
    endDate,
    action,
    limit = 100
  } = options;
  
  const where = {};
  
  if (userId) where.userId = userId;
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (action) where.action = action;
  
  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp[Op.gte] = startDate;
    if (endDate) where.timestamp[Op.lte] = endDate;
  }
  
  return await AuditLog.findAll({
    where,
    order: [['timestamp', 'DESC']],
    limit
  });
};

export default AuditLog;