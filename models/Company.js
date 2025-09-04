// models/Company.js
// Company model με Sequelize για PostgreSQL

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Company = sequelize.define('Company', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  
  // Basic information
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  
  legalName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  
  afm: {
    type: DataTypes.STRING(9),
    allowNull: false,
    unique: true,
    validate: {
      is: /^\d{9}$/
    }
  },
  
  doy: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  
  // Owner
  ownerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  
  // Contact information
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  
  mobile: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  
  fax: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  
  website: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  
  // Address
  street: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  
  streetNumber: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  
  city: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  
  postalCode: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  
  country: {
    type: DataTypes.STRING(100),
    defaultValue: 'Ελλάδα',
    allowNull: false
  },
  
  // Business details
  businessType: {
    type: DataTypes.ENUM('ΕΠΕ', 'ΑΕ', 'ΙΚΕ', 'ΟΕ', 'ΕΕ', 'Ατομική'),
    allowNull: false
  },
  
  industry: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  logo: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  
  // Settings (JSONB for PostgreSQL)
  settings: {
    type: DataTypes.JSONB,
    defaultValue: {
      invoicePrefix: 'INV',
      invoiceStartNumber: 1,
      currentInvoiceNumber: 1,
      defaultPaymentTerms: 30,
      defaultVatRate: 24,
      bankAccounts: []
    }
  },
  
  // Subscription
  subscriptionPlan: {
    type: DataTypes.ENUM('basic', 'professional', 'enterprise'),
    defaultValue: 'basic',
    allowNull: false
  },
  
  subscriptionStatus: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended', 'trial'),
    defaultValue: 'trial',
    allowNull: false
  },
  
  subscriptionStartDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  },
  
  subscriptionEndDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  },
  
  // Features (JSONB)
  features: {
    type: DataTypes.JSONB,
    defaultValue: {
      maxMembers: 5,
      maxInvoices: 100,
      hasReports: false,
      hasAPI: false
    }
  },
  
  // Statistics (JSONB)
  statistics: {
    type: DataTypes.JSONB,
    defaultValue: {
      totalMembers: 0,
      totalInvoices: 0,
      totalRevenue: 0,
      lastInvoiceDate: null
    }
  },
  
  // Status
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'companies',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['afm'] },
    { fields: ['owner_id'] },
    { fields: ['subscription_status'] },
    { fields: ['is_active'] }
  ]
});

// Instance Methods
Company.prototype.getFullAddress = function() {
  return `${this.street} ${this.streetNumber}, ${this.postalCode} ${this.city}, ${this.country}`;
};

Company.prototype.getNextInvoiceNumber = function() {
  const settings = this.settings;
  const invoiceNumber = `${settings.invoicePrefix}-${String(settings.currentInvoiceNumber).padStart(6, '0')}`;
  
  // Update current invoice number
  settings.currentInvoiceNumber += 1;
  this.settings = settings;
  
  return invoiceNumber;
};

Company.prototype.hasActiveSubscription = function() {
  return this.subscriptionStatus === 'active' || 
         (this.subscriptionStatus === 'trial' && this.subscriptionEndDate > new Date());
};

Company.prototype.canAddMember = function() {
  return this.statistics.totalMembers < this.features.maxMembers;
};

Company.prototype.canCreateInvoice = function() {
  return this.statistics.totalInvoices < this.features.maxInvoices;
};

Company.prototype.updateStatistics = async function() {
  const Member = sequelize.models.Member;
  const Invoice = sequelize.models.Invoice;
  
  // Ενημέρωση αριθμού μελών
  if (Member) {
    const memberCount = await Member.count({ 
      where: { 
        companyId: this.id, 
        isActive: true 
      }
    });
    
    this.statistics.totalMembers = memberCount;
  }
  
  // Ενημέρωση τιμολογίων (αν υπάρχει το model)
  if (Invoice) {
    const invoiceStats = await Invoice.findOne({
      where: { companyId: this.id },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'totalAmount'],
        [sequelize.fn('MAX', sequelize.col('issue_date')), 'lastDate']
      ],
      raw: true
    });
    
    if (invoiceStats) {
      this.statistics.totalInvoices = parseInt(invoiceStats.count) || 0;
      this.statistics.totalRevenue = parseFloat(invoiceStats.totalAmount) || 0;
      this.statistics.lastInvoiceDate = invoiceStats.lastDate;
    }
  }
  
  return this.save();
};

// Static Methods
Company.findActive = function() {
  return this.findAll({ 
    where: {
      isActive: true,
      subscriptionStatus: ['active', 'trial']
    }
  });
};

export default Company;