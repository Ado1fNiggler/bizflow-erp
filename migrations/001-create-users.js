// migrations/001-create-users.js
// Migration for creating users table

export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('users', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
      comment: 'Primary key'
    },
    
    // Authentication fields
    email: {
      type: Sequelize.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      },
      comment: 'User email address'
    },
    
    username: {
      type: Sequelize.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'Unique username'
    },
    
    password: {
      type: Sequelize.STRING(255),
      allowNull: false,
      comment: 'Hashed password'
    },
    
    // Personal information
    firstName: {
      type: Sequelize.STRING(100),
      allowNull: false,
      field: 'first_name',
      comment: 'First name'
    },
    
    lastName: {
      type: Sequelize.STRING(100),
      allowNull: false,
      field: 'last_name',
      comment: 'Last name'
    },
    
    phone: {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: 'Phone number'
    },
    
    mobile: {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: 'Mobile number'
    },
    
    // Role and permissions
    role: {
      type: Sequelize.ENUM('admin', 'manager', 'accountant', 'user', 'viewer'),
      defaultValue: 'user',
      allowNull: false,
      comment: 'User role'
    },
    
    permissions: {
      type: Sequelize.JSON,
      defaultValue: [],
      comment: 'Additional permissions'
    },
    
    // Company association
    companyId: {
      type: Sequelize.UUID,
      allowNull: true,
      field: 'company_id',
      comment: 'Associated company'
    },
    
    // Profile
    avatar: {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: 'Avatar URL'
    },
    
    language: {
      type: Sequelize.STRING(5),
      defaultValue: 'el',
      comment: 'Preferred language'
    },
    
    timezone: {
      type: Sequelize.STRING(50),
      defaultValue: 'Europe/Athens',
      comment: 'User timezone'
    },
    
    dateFormat: {
      type: Sequelize.STRING(20),
      defaultValue: 'DD/MM/YYYY',
      field: 'date_format',
      comment: 'Preferred date format'
    },
    
    // Security
    twoFactorEnabled: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      field: 'two_factor_enabled',
      comment: '2FA enabled'
    },
    
    twoFactorSecret: {
      type: Sequelize.STRING(255),
      allowNull: true,
      field: 'two_factor_secret',
      comment: '2FA secret'
    },
    
    emailVerified: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      field: 'email_verified',
      comment: 'Email verification status'
    },
    
    emailVerificationToken: {
      type: Sequelize.STRING(255),
      allowNull: true,
      field: 'email_verification_token',
      comment: 'Email verification token'
    },
    
    passwordResetToken: {
      type: Sequelize.STRING(255),
      allowNull: true,
      field: 'password_reset_token',
      comment: 'Password reset token'
    },
    
    passwordResetExpires: {
      type: Sequelize.DATE,
      allowNull: true,
      field: 'password_reset_expires',
      comment: 'Password reset token expiry'
    },
    
    // Activity tracking
    lastLogin: {
      type: Sequelize.DATE,
      allowNull: true,
      field: 'last_login',
      comment: 'Last login timestamp'
    },
    
    lastActivity: {
      type: Sequelize.DATE,
      allowNull: true,
      field: 'last_activity',
      comment: 'Last activity timestamp'
    },
    
    loginCount: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      field: 'login_count',
      comment: 'Total login count'
    },
    
    failedLoginAttempts: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      field: 'failed_login_attempts',
      comment: 'Failed login attempts'
    },
    
    lockoutUntil: {
      type: Sequelize.DATE,
      allowNull: true,
      field: 'lockout_until',
      comment: 'Account lockout expiry'
    },
    
    // Status
    isActive: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
      comment: 'Account active status'
    },
    
    deactivatedAt: {
      type: Sequelize.DATE,
      allowNull: true,
      field: 'deactivated_at',
      comment: 'Deactivation timestamp'
    },
    
    deactivationReason: {
      type: Sequelize.TEXT,
      allowNull: true,
      field: 'deactivation_reason',
      comment: 'Reason for deactivation'
    },
    
    // Metadata
    settings: {
      type: Sequelize.JSON,
      defaultValue: {},
      comment: 'User settings'
    },
    
    metadata: {
      type: Sequelize.JSON,
      defaultValue: {},
      comment: 'Additional metadata'
    },
    
    // Timestamps
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
      field: 'created_at',
      defaultValue: Sequelize.NOW
    },
    
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      field: 'updated_at',
      defaultValue: Sequelize.NOW
    },
    
    deletedAt: {
      type: Sequelize.DATE,
      allowNull: true,
      field: 'deleted_at',
      comment: 'Soft delete timestamp'
    }
  });
  
  // Create indexes
  await queryInterface.addIndex('users', ['email'], {
    unique: true,
    name: 'users_email_unique'
  });
  
  await queryInterface.addIndex('users', ['username'], {
    unique: true,
    name: 'users_username_unique'
  });
  
  await queryInterface.addIndex('users', ['company_id'], {
    name: 'users_company_id_index'
  });
  
  await queryInterface.addIndex('users', ['role'], {
    name: 'users_role_index'
  });
  
  await queryInterface.addIndex('users', ['is_active'], {
    name: 'users_is_active_index'
  });
  
  await queryInterface.addIndex('users', ['created_at'], {
    name: 'users_created_at_index'
  });
  
  // Add composite indexes
  await queryInterface.addIndex('users', ['is_active', 'role'], {
    name: 'users_active_role_index'
  });
  
  await queryInterface.addIndex('users', ['company_id', 'role', 'is_active'], {
    name: 'users_company_role_active_index'
  });
};

export const down = async (queryInterface, Sequelize) => {
  // Remove indexes
  await queryInterface.removeIndex('users', 'users_email_unique');
  await queryInterface.removeIndex('users', 'users_username_unique');
  await queryInterface.removeIndex('users', 'users_company_id_index');
  await queryInterface.removeIndex('users', 'users_role_index');
  await queryInterface.removeIndex('users', 'users_is_active_index');
  await queryInterface.removeIndex('users', 'users_created_at_index');
  await queryInterface.removeIndex('users', 'users_active_role_index');
  await queryInterface.removeIndex('users', 'users_company_role_active_index');
  
  // Drop table
  await queryInterface.dropTable('users');
};