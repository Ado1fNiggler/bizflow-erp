// models/Member.js
// Member model με Sequelize για PostgreSQL

import { DataTypes, Op } from 'sequelize';
import sequelize from '../config/database.js';

const Member = sequelize.define('Member', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  
  // Company association
  companyId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  
  // Member type
  memberType: {
    type: DataTypes.ENUM('individual', 'business'),
    allowNull: false
  },
  
  // Common fields
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
  
  // Address
  street: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  
  streetNumber: {
    type: DataTypes.STRING(20),
    allowNull: true
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
  
  // Individual fields (stored in JSONB)
  individualData: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  
  // Business fields (stored in JSONB)
  businessData: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  
  // AFM field (common, indexed)
  afm: {
    type: DataTypes.STRING(9),
    allowNull: true,
    validate: {
      is: /^\d{9}$/
    }
  },
  
  doy: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  // Financial data (JSONB)
  financial: {
    type: DataTypes.JSONB,
    defaultValue: {
      creditLimit: 0,
      currentBalance: 0,
      paymentTerms: 30,
      discount: 0,
      vatExempt: false,
      bankAccount: {}
    }
  },
  
  // Statistics (JSONB)
  statistics: {
    type: DataTypes.JSONB,
    defaultValue: {
      totalInvoices: 0,
      totalAmount: 0,
      totalPaid: 0,
      totalPending: 0,
      lastInvoiceDate: null,
      lastPaymentDate: null
    }
  },
  
  // Category
  category: {
    type: DataTypes.ENUM('customer', 'supplier', 'both'),
    defaultValue: 'customer',
    allowNull: false
  },
  
  // Tags (stored as JSON for SQLite compatibility)
  tags: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  
  // Additional fields
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Documents (JSONB array)
  documents: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  
  // Status
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  
  isFavorite: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  
  // Communication log (JSONB array)
  communicationLog: {
    type: DataTypes.JSONB,
    defaultValue: []
  }
}, {
  tableName: 'members',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['company_id', 'member_type'] },
    { fields: ['company_id', 'afm'], unique: true, where: { afm: { [Op.ne]: null } } },
    { fields: ['company_id', 'email'] },
    { fields: ['company_id', 'category'] },
    { fields: ['company_id', 'is_active'] }
  ]
});

// Hooks
Member.beforeSave(async (member) => {
  // Clean up data based on member type
  if (member.memberType === 'individual') {
    // For individuals, store AFM in individual data
    if (member.afm) {
      member.individualData = {
        ...member.individualData,
        afm: member.afm
      };
    }
    member.businessData = {};
  } else {
    // For businesses, store AFM in business data
    if (member.afm) {
      member.businessData = {
        ...member.businessData,
        afm: member.afm
      };
    }
    member.individualData = {};
  }
  
  // Update current balance
  member.financial.currentBalance = member.statistics.totalPending;
});

// Instance Methods
Member.prototype.getFullName = function() {
  if (this.memberType === 'individual') {
    const data = this.individualData || {};
    return `${data.firstName || ''} ${data.lastName || ''}`.trim();
  } else {
    const data = this.businessData || {};
    return data.name || data.legalName || '';
  }
};

Member.prototype.getFullAddress = function() {
  const number = this.streetNumber ? ` ${this.streetNumber}` : '';
  return `${this.street}${number}, ${this.postalCode} ${this.city}, ${this.country}`;
};

Member.prototype.addCommunication = function(data) {
  const log = this.communicationLog || [];
  
  log.push({
    date: new Date(),
    type: data.type,
    subject: data.subject,
    description: data.description,
    createdBy: data.userId
  });
  
  // Keep only last 50 communications
  if (log.length > 50) {
    this.communicationLog = log.slice(-50);
  } else {
    this.communicationLog = log;
  }
  
  return this.save();
};

Member.prototype.updateStatistics = async function() {
  const Invoice = sequelize.models.Invoice;
  
  if (Invoice) {
    const stats = await Invoice.findOne({
      where: { 
        companyId: this.companyId,
        memberId: this.id 
      },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalInvoices'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'totalAmount'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'paid' THEN total_amount ELSE 0 END")), 'totalPaid'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN status IN ('pending', 'overdue') THEN total_amount ELSE 0 END")), 'totalPending'],
        [sequelize.fn('MAX', sequelize.col('issue_date')), 'lastInvoiceDate']
      ],
      raw: true
    });
    
    if (stats) {
      this.statistics = {
        ...this.statistics,
        totalInvoices: parseInt(stats.totalInvoices) || 0,
        totalAmount: parseFloat(stats.totalAmount) || 0,
        totalPaid: parseFloat(stats.totalPaid) || 0,
        totalPending: parseFloat(stats.totalPending) || 0,
        lastInvoiceDate: stats.lastInvoiceDate
      };
    }
  }
  
  return this.save();
};

Member.prototype.checkCreditLimit = function(amount) {
  if (this.financial.creditLimit === 0) {
    return true; // No limit
  }
  
  return (this.financial.currentBalance + amount) <= this.financial.creditLimit;
};

// Static Methods
Member.findWithDebt = function(companyId) {
  return this.findAll({
    where: {
      companyId: companyId,
      'statistics.totalPending': { [DataTypes.Op.gt]: 0 },
      isActive: true
    }
  });
};

Member.findTopCustomers = function(companyId, limit = 10) {
  return this.findAll({
    where: {
      companyId: companyId,
      category: ['customer', 'both'],
      isActive: true
    },
    order: [[sequelize.literal('statistics->>\'totalAmount\''), 'DESC']],
    limit: limit
  });
};

export default Member;