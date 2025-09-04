// models/Invoice.js
// Invoice model for invoice management

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  
  // Invoice identification
  invoiceNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'invoice_number',
    comment: 'Unique invoice number'
  },
  
  series: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'A',
    comment: 'Invoice series'
  },
  
  type: {
    type: DataTypes.ENUM(
      'invoice',      // Τιμολόγιο
      'credit_note',  // Πιστωτικό σημείωμα
      'debit_note',   // Χρεωστικό σημείωμα
      'receipt',      // Απόδειξη
      'proforma'      // Προφορμά
    ),
    allowNull: false,
    defaultValue: 'invoice',
    comment: 'Document type'
  },
  
  // Client information
  companyId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'company_id',
    references: {
      model: 'companies',
      key: 'id'
    },
    comment: 'Customer company ID'
  },
  
  // Dates
  issueDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'issue_date',
    comment: 'Invoice issue date'
  },
  
  dueDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'due_date',
    comment: 'Payment due date'
  },
  
  deliveryDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'delivery_date',
    comment: 'Delivery date'
  },
  
  // Financial data
  subtotal: {
    type: DataTypes.DECIMAL(15, 4),
    allowNull: false,
    defaultValue: 0,
    comment: 'Subtotal before VAT'
  },
  
  vatAmount: {
    type: DataTypes.DECIMAL(15, 4),
    allowNull: false,
    defaultValue: 0,
    field: 'vat_amount',
    comment: 'Total VAT amount'
  },
  
  totalAmount: {
    type: DataTypes.DECIMAL(15, 4),
    allowNull: false,
    defaultValue: 0,
    field: 'total_amount',
    comment: 'Total amount including VAT'
  },
  
  discountAmount: {
    type: DataTypes.DECIMAL(15, 4),
    allowNull: false,
    defaultValue: 0,
    field: 'discount_amount',
    comment: 'Total discount amount'
  },
  
  discountPercent: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'discount_percent',
    comment: 'Discount percentage'
  },
  
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'EUR',
    comment: 'Currency code'
  },
  
  exchangeRate: {
    type: DataTypes.DECIMAL(10, 6),
    allowNull: false,
    defaultValue: 1,
    field: 'exchange_rate',
    comment: 'Exchange rate to EUR'
  },
  
  // Payment information
  paymentMethod: {
    type: DataTypes.ENUM(
      'cash',           // Μετρητά
      'card',           // Κάρτα
      'bank_transfer',  // Τραπεζική μεταφορά
      'check',          // Επιταγή
      'other'           // Άλλο
    ),
    allowNull: true,
    field: 'payment_method',
    comment: 'Payment method'
  },
  
  paymentTerms: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'payment_terms',
    comment: 'Payment terms description'
  },
  
  // Status
  status: {
    type: DataTypes.ENUM(
      'draft',      // Πρόχειρο
      'sent',       // Απεσταλμένο
      'paid',       // Πληρωμένο
      'overdue',    // Ληξιπρόθεσμο
      'cancelled'   // Ακυρωμένο
    ),
    allowNull: false,
    defaultValue: 'draft',
    comment: 'Invoice status'
  },
  
  // Greek tax compliance
  vatCategory: {
    type: DataTypes.ENUM(
      'normal',     // 24%
      'reduced',    // 13%
      'super_reduced', // 6%
      'exempt',     // 0%
      'reverse'     // Αντίστροφη φόρτωση
    ),
    allowNull: false,
    defaultValue: 'normal',
    field: 'vat_category',
    comment: 'VAT category for Greek tax'
  },
  
  // MyData integration
  mydataId: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'mydata_id',
    comment: 'MyData submission ID'
  },
  
  mydataStatus: {
    type: DataTypes.ENUM(
      'pending',      // Εκκρεμεί
      'submitted',    // Υποβλήθηκε
      'accepted',     // Έγκριση
      'rejected'      // Απόρριψη
    ),
    allowNull: true,
    defaultValue: 'pending',
    field: 'mydata_status',
    comment: 'MyData submission status'
  },
  
  mydataSubmittedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'mydata_submitted_at',
    comment: 'MyData submission timestamp'
  },
  
  // Additional information
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Invoice notes'
  },
  
  internalNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'internal_notes',
    comment: 'Internal notes (not shown to customer)'
  },
  
  // References
  referenceNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'reference_number',
    comment: 'Customer reference number'
  },
  
  parentInvoiceId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'parent_invoice_id',
    references: {
      model: 'invoices',
      key: 'id'
    },
    comment: 'Parent invoice for credit/debit notes'
  },
  
  // Metadata
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Additional metadata'
  },
  
  // Audit fields
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'created_by',
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User who created the invoice'
  },
  
  updatedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'updated_by',
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User who last updated the invoice'
  }
}, {
  tableName: 'invoices',
  timestamps: true,
  underscored: true,
  paranoid: true, // Soft deletes
  indexes: [
    { fields: ['invoice_number'], unique: true },
    { fields: ['company_id'] },
    { fields: ['issue_date'] },
    { fields: ['due_date'] },
    { fields: ['status'] },
    { fields: ['type'] },
    { fields: ['mydata_status'] },
    { fields: ['created_by'] },
    { fields: ['parent_invoice_id'] },
    { fields: ['series', 'invoice_number'] },
    { fields: ['status', 'due_date'] } // For overdue invoices
  ]
});

// Instance methods
Invoice.prototype.calculateTotals = function() {
  // This will be called after adding/updating items
  // Will be implemented with InvoiceItem associations
  return this;
};

Invoice.prototype.getDisplayNumber = function() {
  return `${this.series}-${this.invoiceNumber}`;
};

Invoice.prototype.isOverdue = function() {
  return this.dueDate && new Date() > this.dueDate && this.status !== 'paid';
};

Invoice.prototype.canEdit = function() {
  return this.status === 'draft';
};

Invoice.prototype.canCancel = function() {
  return ['draft', 'sent'].includes(this.status);
};

// Static methods
Invoice.generateNumber = async function(series = 'A') {
  const lastInvoice = await this.findOne({
    where: { series },
    order: [['createdAt', 'DESC']]
  });
  
  if (!lastInvoice) {
    return `${series}000001`;
  }
  
  const lastNumber = parseInt(lastInvoice.invoiceNumber.replace(series, ''));
  const nextNumber = (lastNumber + 1).toString().padStart(6, '0');
  
  return `${series}${nextNumber}`;
};

// Hooks
Invoice.beforeCreate(async (invoice) => {
  if (!invoice.invoiceNumber) {
    invoice.invoiceNumber = await Invoice.generateNumber(invoice.series);
  }
});

// Define associations
Invoice.associate = (models) => {
  Invoice.belongsTo(models.Company, {
    foreignKey: 'companyId',
    as: 'company'
  });
  
  Invoice.hasMany(models.InvoiceItem, {
    foreignKey: 'invoiceId',
    as: 'items',
    onDelete: 'CASCADE'
  });
  
  Invoice.belongsTo(models.User, {
    foreignKey: 'createdBy',
    as: 'creator'
  });
  
  Invoice.belongsTo(models.User, {
    foreignKey: 'updatedBy',
    as: 'updater'
  });
  
  Invoice.belongsTo(models.Invoice, {
    foreignKey: 'parentInvoiceId',
    as: 'parentInvoice'
  });
  
  Invoice.hasMany(models.Invoice, {
    foreignKey: 'parentInvoiceId',
    as: 'childInvoices'
  });
};

export default Invoice;