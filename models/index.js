// models/index.js
// Central model registry with associations

import sequelize from '../config/database.js';

// Import all models
import User from './User.js';
import Company from './Company.js';
import Member from './Member.js';
import Document from './Document.js';
import DocumentItem from './DocumentItem.js';
import Invoice from './Invoice.js';
import InvoiceItem from './InvoiceItem.js';
import AuditLog from './AuditLog.js';
import RefreshToken from './RefreshToken.js';

// Model registry
const models = {
  User,
  Company,
  Member,
  Document,
  DocumentItem,
  Invoice,
  InvoiceItem,
  AuditLog,
  RefreshToken,
  sequelize
};

// Define all associations
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// Manual associations for models that don't have associate method
// RefreshToken associations (if not defined in User.associate)
RefreshToken.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// Company-Member associations
Company.hasMany(Member, {
  foreignKey: 'companyId',
  as: 'members'
});

Member.belongsTo(Company, {
  foreignKey: 'companyId',
  as: 'company'
});

// Document associations
Company.hasMany(Document, {
  foreignKey: 'companyId',
  as: 'documents'
});

Document.belongsTo(Company, {
  foreignKey: 'companyId',
  as: 'company'
});

Document.hasMany(DocumentItem, {
  foreignKey: 'documentId',
  as: 'items',
  onDelete: 'CASCADE'
});

DocumentItem.belongsTo(Document, {
  foreignKey: 'documentId',
  as: 'document'
});

// User activity associations
User.hasMany(AuditLog, {
  foreignKey: 'userId',
  as: 'auditLogs'
});

AuditLog.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');
  } catch (error) {
    console.error('❌ Unable to connect to database:', error.message);
    throw error;
  }
};

// Sync models with database
const syncModels = async (options = {}) => {
  try {
    await sequelize.sync(options);
    console.log('✅ All models synchronized successfully');
  } catch (error) {
    console.error('❌ Model synchronization failed:', error.message);
    throw error;
  }
};

export {
  User,
  Company,
  Member,
  Document,
  DocumentItem,
  Invoice,
  InvoiceItem,
  AuditLog,
  RefreshToken,
  sequelize,
  testConnection,
  syncModels
};

export default models;