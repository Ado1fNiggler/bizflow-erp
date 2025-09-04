// migrations/003-create-members.js
// Migration for creating members table

export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('members', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
      comment: 'Primary key'
    },
    
    // Member identification
    memberNumber: {
      type: Sequelize.STRING(20),
      allowNull: false,
      unique: true,
      field: 'member_number',
      comment: 'Unique member number'
    },
    
    barcode: {
      type: Sequelize.STRING(50),
      allowNull: true,
      unique: true,
      comment: 'Member card barcode'
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
    
    fatherName: {
      type: Sequelize.STRING(100),
      allowNull: true,
      field: 'father_name',
      comment: 'Father\'s name'
    },
    
    motherName: {
      type: Sequelize.STRING(100),
      allowNull: true,
      field: 'mother_name',
      comment: 'Mother\'s name'
    },
    
    // Identification documents
    idNumber: {
      type: Sequelize.STRING(20),
      allowNull: true,
      field: 'id_number',
      comment: 'ID card number'
    },
    
    passportNumber: {
      type: Sequelize.STRING(20),
      allowNull: true,
      field: 'passport_number',
      comment: 'Passport number'
    },
    
    taxNumber: {
      type: Sequelize.STRING(20),
      allowNull: true,
      field: 'tax_number',
      comment: 'Tax number (AFM)'
    },
    
    socialSecurityNumber: {
      type: Sequelize.STRING(20),
      allowNull: true,
      field: 'social_security_number',
      comment: 'Social security number (AMKA)'
    },
    
    // Contact information
    email: {
      type: Sequelize.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true
      },
      comment: 'Email address'
    },
    
    emailSecondary: {
      type: Sequelize.STRING(255),
      allowNull: true,
      field: 'email_secondary',
      validate: {
        isEmail: true
      },
      comment: 'Secondary email'
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
    
    fax: {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: 'Fax number'
    },
    
    // Address
    address: {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Street address'
    },
    
    city: {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'City'
    },
    
    region: {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Region/State'
    },
    
    postalCode: {
      type: Sequelize.STRING(10),
      allowNull: true,
      field: 'postal_code',
      comment: 'Postal code'
    },
    
    country: {
      type: Sequelize.STRING(2),
      defaultValue: 'GR',
      comment: 'Country code'
    },
    
    // Demographics
    gender: {
      type: Sequelize.ENUM('male', 'female', 'other'),
      allowNull: true,
      comment: 'Gender'
    },
    
    birthDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
      field: 'birth_date',
      comment: 'Date of birth'
    },
    
    birthPlace: {
      type: Sequelize.STRING(100),
      allowNull: true,
      field: 'birth_place',
      comment: 'Place of birth'
    },
    
    nationality: {
      type: Sequelize.STRING(50),
      defaultValue: 'Greek',
      comment: 'Nationality'
    },
    
    maritalStatus: {
      type: Sequelize.ENUM('single', 'married', 'divorced', 'widowed'),
      allowNull: true,
      field: 'marital_status',
      comment: 'Marital status'
    },
    
    // Professional information
    profession: {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Profession/Occupation'
    },
    
    companyId: {
      type: Sequelize.UUID,
      allowNull: true,
      field: 'company_id',
      references: {
        model: 'companies',
        key: 'id'
      },
      comment: 'Associated company'
    },
    
    department: {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Department'
    },
    
    position: {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Position/Title'
    },
    
    // Membership information
    membershipType: {
      type: Sequelize.ENUM('regular', 'silver', 'gold', 'platinum', 'vip'),
      defaultValue: 'regular',
      field: 'membership_type',
      comment: 'Membership type'
    },
    
    membershipCategory: {
      type: Sequelize.STRING(50),
      allowNull: true,
      field: 'membership_category',
      comment: 'Membership category'
    },
    
    status: {
      type: Sequelize.ENUM('active', 'inactive', 'suspended', 'expired', 'pending'),
      defaultValue: 'pending',
      comment: 'Membership status'
    },
    
    joinDate: {
      type: Sequelize.DATEONLY,
      allowNull: false,
      field: 'join_date',
      defaultValue: Sequelize.NOW,
      comment: 'Membership join date'
    },
    
    expiryDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
      field: 'expiry_date',
      comment: 'Membership expiry date'
    },
    
    renewalDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
      field: 'renewal_date',
      comment: 'Next renewal date'
    },
    
    // Financial
    subscriptionFee: {
      type: Sequelize.DECIMAL(10, 2),
      defaultValue: 0,
      field: 'subscription_fee',
      comment: 'Annual subscription fee'
    },
    
    subscriptionPaid: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      field: 'subscription_paid',
      comment: 'Subscription payment status'
    },
    
    lastPaymentDate: {
      type: Sequelize.DATE,
      allowNull: true,
      field: 'last_payment_date',
      comment: 'Last payment date'
    },
    
    lastPaymentAmount: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      field: 'last_payment_amount',
      comment: 'Last payment amount'
    },
    
    balance: {
      type: Sequelize.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Account balance'
    },
    
    discount: {
      type: Sequelize.DECIMAL(5, 2),
      defaultValue: 0,
      comment: 'Discount percentage'
    },
    
    // Points and rewards
    points: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      comment: 'Reward points'
    },
    
    lifetimePoints: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      field: 'lifetime_points',
      comment: 'Total lifetime points'
    },
    
    tier: {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: 'Loyalty tier'
    },
    
    // Preferences
    newsletter: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      comment: 'Newsletter subscription'
    },
    
    smsNotifications: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      field: 'sms_notifications',
      comment: 'SMS notifications'
    },
    
    emailNotifications: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      field: 'email_notifications',
      comment: 'Email notifications'
    },
    
    language: {
      type: Sequelize.STRING(5),
      defaultValue: 'el',
      comment: 'Preferred language'
    },
    
    // Social media
    website: {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Personal website'
    },
    
    linkedin: {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'LinkedIn profile'
    },
    
    facebook: {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Facebook profile'
    },
    
    twitter: {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Twitter handle'
    },
    
    instagram: {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Instagram handle'
    },
    
    // Emergency contact
    emergencyContact: {
      type: Sequelize.STRING(200),
      allowNull: true,
      field: 'emergency_contact',
      comment: 'Emergency contact name'
    },
    
    emergencyPhone: {
      type: Sequelize.STRING(20),
      allowNull: true,
      field: 'emergency_phone',
      comment: 'Emergency contact phone'
    },
    
    emergencyRelation: {
      type: Sequelize.STRING(50),
      allowNull: true,
      field: 'emergency_relation',
      comment: 'Emergency contact relation'
    },
    
    // Consent and GDPR
    marketingConsent: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      field: 'marketing_consent',
      comment: 'Marketing consent'
    },
    
    dataProcessingConsent: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      field: 'data_processing_consent',
      comment: 'Data processing consent'
    },
    
    consentDate: {
      type: Sequelize.DATE,
      allowNull: true,
      field: 'consent_date',
      comment: 'Consent given date'
    },
    
    // Additional information
    notes: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Internal notes'
    },
    
    tags: {
      type: Sequelize.JSON,
      defaultValue: [],
      comment: 'Member tags'
    },
    
    preferences: {
      type: Sequelize.JSON,
      defaultValue: {},
      comment: 'Member preferences'
    },
    
    customFields: {
      type: Sequelize.JSON,
      defaultValue: {},
      field: 'custom_fields',
      comment: 'Custom fields'
    },
    
    // Photos
    photo: {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: 'Profile photo URL'
    },
    
    idCardFront: {
      type: Sequelize.STRING(500),
      allowNull: true,
      field: 'id_card_front',
      comment: 'ID card front scan'
    },
    
    idCardBack: {
      type: Sequelize.STRING(500),
      allowNull: true,
      field: 'id_card_back',
      comment: 'ID card back scan'
    },
    
    // Relationships
    referredBy: {
      type: Sequelize.UUID,
      allowNull: true,
      field: 'referred_by',
      references: {
        model: 'members',
        key: 'id'
      },
      comment: 'Referring member'
    },
    
    userId: {
      type: Sequelize.UUID,
      allowNull: true,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Associated user account'
    },
    
    // Audit fields
    createdBy: {
      type: Sequelize.UUID,
      allowNull: true,
      field: 'created_by',
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Created by user'
    },
    
    updatedBy: {
      type: Sequelize.UUID,
      allowNull: true,
      field: 'updated_by',
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Updated by user'
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
  await queryInterface.addIndex('members', ['member_number'], {
    unique: true,
    name: 'members_number_unique'
  });
  
  await queryInterface.addIndex('members', ['barcode'], {
    unique: true,
    where: { barcode: { [Sequelize.Op.ne]: null } },
    name: 'members_barcode_unique'
  });
  
  await queryInterface.addIndex('members', ['email'], {
    name: 'members_email_index'
  });
  
  await queryInterface.addIndex('members', ['last_name', 'first_name'], {
    name: 'members_name_index'
  });
  
  await queryInterface.addIndex('members', ['company_id'], {
    name: 'members_company_index'
  });
  
  await queryInterface.addIndex('members', ['membership_type'], {
    name: 'members_type_index'
  });
  
  await queryInterface.addIndex('members', ['status'], {
    name: 'members_status_index'
  });
  
  await queryInterface.addIndex('members', ['join_date'], {
    name: 'members_join_date_index'
  });
  
  await queryInterface.addIndex('members', ['expiry_date'], {
    name: 'members_expiry_date_index'
  });
  
  await queryInterface.addIndex('members', ['referred_by'], {
    name: 'members_referrer_index'
  });
  
  // Composite indexes
  await queryInterface.addIndex('members', ['status', 'membership_type'], {
    name: 'members_status_type_index'
  });
  
  await queryInterface.addIndex('members', ['subscription_paid', 'expiry_date'], {
    name: 'members_payment_expiry_index'
  });
  
  // Full-text search index (if PostgreSQL)
  if (queryInterface.sequelize.options.dialect === 'postgres') {
    await queryInterface.sequelize.query(`
      CREATE INDEX members_search_index ON members 
      USING gin(to_tsvector('simple', coalesce(first_name, '') || ' ' || 
                                       coalesce(last_name, '') || ' ' || 
                                       coalesce(email, '') || ' ' || 
                                       coalesce(member_number, '')))
    `);
  }
};

export const down = async (queryInterface, Sequelize) => {
  // Remove full-text index if PostgreSQL
  if (queryInterface.sequelize.options.dialect === 'postgres') {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS members_search_index');
  }
  
  // Remove indexes
  await queryInterface.removeIndex('members', 'members_number_unique');
  await queryInterface.removeIndex('members', 'members_barcode_unique');
  await queryInterface.removeIndex('members', 'members_email_index');
  await queryInterface.removeIndex('members', 'members_name_index');
  await queryInterface.removeIndex('members', 'members_company_index');
  await queryInterface.removeIndex('members', 'members_type_index');
  await queryInterface.removeIndex('members', 'members_status_index');
  await queryInterface.removeIndex('members', 'members_join_date_index');
  await queryInterface.removeIndex('members', 'members_expiry_date_index');
  await queryInterface.removeIndex('members', 'members_referrer_index');
  await queryInterface.removeIndex('members', 'members_status_type_index');
  await queryInterface.removeIndex('members', 'members_payment_expiry_index');
  
  // Drop table
  await queryInterface.dropTable('members');
};