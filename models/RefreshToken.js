// models/RefreshToken.js
// Refresh token model για JWT authentication

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const RefreshToken = sequelize.define('RefreshToken', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  
  token: {
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true
  },
  
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  
  isRevoked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  revokedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  createdByIp: {
    type: DataTypes.INET,
    allowNull: true
  },
  
  revokedByIp: {
    type: DataTypes.INET,
    allowNull: true
  }
}, {
  tableName: 'refresh_tokens',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['token'], unique: true },
    { fields: ['expires_at'] }
  ]
});

// Instance methods
RefreshToken.prototype.isExpired = function() {
  return Date.now() >= this.expiresAt;
};

RefreshToken.prototype.isActive = function() {
  return !this.isRevoked && !this.isExpired();
};

RefreshToken.prototype.revoke = function(ipAddress) {
  this.isRevoked = true;
  this.revokedAt = new Date();
  this.revokedByIp = ipAddress;
};

// Static methods
RefreshToken.generateToken = function() {
  const crypto = require('crypto');
  return crypto.randomBytes(40).toString('hex');
};

export default RefreshToken;