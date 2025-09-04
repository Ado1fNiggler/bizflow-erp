// models/User.js
// User model με Sequelize για PostgreSQL

import { DataTypes } from 'sequelize';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import sequelize from '../config/database.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  
  // Authentication fields
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  
  // Personal information
  name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  
  // Role and permissions
  role: {
    type: DataTypes.ENUM('admin', 'manager', 'user'),
    defaultValue: 'user',
    allowNull: false
  },
  
  // Company association
  companyId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  
  // Status fields
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'pending', 'blocked'),
    defaultValue: 'pending',
    allowNull: false
  },
  
  emailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  
  // Security fields
  loginAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  lockedUntil: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Tokens
  verificationToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  verificationExpires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  resetToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  resetExpires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Activity tracking
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  lastLoginIp: {
    type: DataTypes.INET,
    allowNull: true
  },
  
  passwordChangedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Preferences
  preferences: {
    type: DataTypes.JSONB,
    defaultValue: {
      notifications: {
        email: true,
        sms: false
      },
      language: 'el'
    }
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['email'] },
    { fields: ['company_id'] },
    { fields: ['role'] }
  ]
});

// Hooks
User.beforeCreate(async (user) => {
  if (user.password) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  }
});

User.beforeUpdate(async (user) => {
  if (user.changed('password')) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  }
});

// Instance Methods
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

User.prototype.generateAuthToken = function() {
  const token = jwt.sign(
    { 
      userId: this.id,
      email: this.email,
      role: this.role
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRE || '7d' 
    }
  );
  
  return token;
};

User.prototype.generateVerificationToken = function() {
  const token = jwt.sign(
    { userId: this.id },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  this.verificationToken = token;
  return token;
};

User.prototype.generateResetPasswordToken = function() {
  const token = jwt.sign(
    { userId: this.id },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  
  this.resetPasswordToken = token;
  this.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 ώρα
  
  return token;
};

User.prototype.getFullName = function() {
  return `${this.firstName} ${this.lastName}`;
};

// Override toJSON to hide sensitive data
User.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  
  delete values.password;
  delete values.verificationToken;
  delete values.resetPasswordToken;
  delete values.resetPasswordExpires;
  
  return values;
};

// Static Methods
User.findByCredentials = async function(email, password) {
  const user = await this.findOne({ where: { email } });
  
  if (!user) {
    throw new Error('Λάθος email ή κωδικός');
  }
  
  const isMatch = await user.comparePassword(password);
  
  if (!isMatch) {
    throw new Error('Λάθος email ή κωδικός');
  }
  
  if (user.status !== 'active') {
    throw new Error('Ο λογαριασμός σας έχει απενεργοποιηθεί');
  }
  
  return user;
};

// Define associations
User.associate = (models) => {
  User.hasMany(models.RefreshToken, {
    foreignKey: 'userId',
    as: 'refreshTokens'
  });
  
  User.belongsTo(models.Company, {
    foreignKey: 'companyId',
    as: 'company'
  });
};

export default User;