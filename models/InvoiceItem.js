// models/InvoiceItem.js
// Invoice item model for invoice line items

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const InvoiceItem = sequelize.define('InvoiceItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  
  // Invoice reference
  invoiceId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'invoice_id',
    references: {
      model: 'invoices',
      key: 'id'
    },
    comment: 'Invoice reference'
  },
  
  // Product information
  productCode: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'product_code',
    comment: 'Product/Service code'
  },
  
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Product/Service description'
  },
  
  // Quantity and units
  quantity: {
    type: DataTypes.DECIMAL(15, 4),
    allowNull: false,
    defaultValue: 1,
    comment: 'Quantity'
  },
  
  unit: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'τεμ',
    comment: 'Unit of measure (τεμ, κιλά, λίτρα, etc.)'
  },
  
  // Pricing
  unitPrice: {
    type: DataTypes.DECIMAL(15, 4),
    allowNull: false,
    field: 'unit_price',
    comment: 'Unit price before VAT'
  },
  
  totalPrice: {
    type: DataTypes.DECIMAL(15, 4),
    allowNull: false,
    field: 'total_price',
    comment: 'Total price before VAT (quantity * unitPrice)'
  },
  
  // Discount
  discountPercent: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'discount_percent',
    comment: 'Line discount percentage'
  },
  
  discountAmount: {
    type: DataTypes.DECIMAL(15, 4),
    allowNull: false,
    defaultValue: 0,
    field: 'discount_amount',
    comment: 'Line discount amount'
  },
  
  // VAT information
  vatRate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    field: 'vat_rate',
    comment: 'VAT rate percentage (24, 13, 6, 0)'
  },
  
  vatAmount: {
    type: DataTypes.DECIMAL(15, 4),
    allowNull: false,
    field: 'vat_amount',
    comment: 'VAT amount'
  },
  
  vatCategory: {
    type: DataTypes.ENUM(
      'normal',        // 24%
      'reduced',       // 13%
      'super_reduced', // 6%
      'exempt',        // 0%
      'reverse'        // Αντίστροφη φόρτωση
    ),
    allowNull: false,
    defaultValue: 'normal',
    field: 'vat_category',
    comment: 'VAT category for Greek tax'
  },
  
  // Final amounts
  netAmount: {
    type: DataTypes.DECIMAL(15, 4),
    allowNull: false,
    field: 'net_amount',
    comment: 'Net amount after discount, before VAT'
  },
  
  totalAmount: {
    type: DataTypes.DECIMAL(15, 4),
    allowNull: false,
    field: 'total_amount',
    comment: 'Total amount including VAT'
  },
  
  // Greek tax compliance
  vatExemptionReason: {
    type: DataTypes.STRING(200),
    allowNull: true,
    field: 'vat_exemption_reason',
    comment: 'VAT exemption reason (when vatCategory is exempt)'
  },
  
  // MyData integration
  incomeClassification: {
    type: DataTypes.ENUM(
      'E3_561_001',  // Πώληση αγαθών (+)
      'E3_561_002',  // Πώληση αγαθών Ενδοκοινοτική (+)
      'E3_561_003',  // Πώληση αγαθών Τρίτες Χώρες (+)
      'E3_561_004',  // Πώληση αγαθών Λιανική - Επιτηδευματιών (+)
      'E3_561_005',  // Πώληση αγαθών Λιανική - Ιδιωτών (+)
      'E3_562_001',  // Πώληση αγαθών που υπάγονται σε ΕΦΚ (+)
      'E3_563_001',  // Πώληση αγαθών σε λιανική (+)
      'E3_564_001',  // Πώληση παγίων (+)
      'E3_881_001',  // Πώληση για λογ/σμό τρίτων (+)
      'E3_598_001'   // Πώληση υπηρεσιών (+)
    ),
    allowNull: true,
    field: 'income_classification',
    comment: 'MyData income classification'
  },
  
  vatExceptionCategory: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'vat_exception_category',
    comment: 'VAT exception category for MyData'
  },
  
  // Additional information
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Line item notes'
  },
  
  // Sorting
  sortOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'sort_order',
    comment: 'Sort order within invoice'
  },
  
  // Metadata
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Additional metadata'
  }
}, {
  tableName: 'invoice_items',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['invoice_id'] },
    { fields: ['product_code'] },
    { fields: ['vat_category'] },
    { fields: ['income_classification'] },
    { fields: ['invoice_id', 'sort_order'] }
  ]
});

// Instance methods
InvoiceItem.prototype.calculateAmounts = function() {
  // Calculate total price before discount
  this.totalPrice = this.quantity * this.unitPrice;
  
  // Calculate discount amount
  if (this.discountPercent > 0) {
    this.discountAmount = (this.totalPrice * this.discountPercent) / 100;
  }
  
  // Calculate net amount (after discount, before VAT)
  this.netAmount = this.totalPrice - this.discountAmount;
  
  // Calculate VAT amount
  this.vatAmount = (this.netAmount * this.vatRate) / 100;
  
  // Calculate total amount (including VAT)
  this.totalAmount = this.netAmount + this.vatAmount;
  
  return this;
};

InvoiceItem.prototype.getVATRate = function() {
  const vatRates = {
    'normal': 24,
    'reduced': 13,
    'super_reduced': 6,
    'exempt': 0,
    'reverse': 0
  };
  
  return vatRates[this.vatCategory] || 24;
};

// Static methods
InvoiceItem.getDefaultVATRate = function(category) {
  const vatRates = {
    'normal': 24,
    'reduced': 13,
    'super_reduced': 6,
    'exempt': 0,
    'reverse': 0
  };
  
  return vatRates[category] || 24;
};

// Hooks
InvoiceItem.beforeSave(async (item) => {
  // Ensure VAT rate matches category
  item.vatRate = item.getVATRate();
  
  // Recalculate amounts
  item.calculateAmounts();
});

// Define associations
InvoiceItem.associate = (models) => {
  InvoiceItem.belongsTo(models.Invoice, {
    foreignKey: 'invoiceId',
    as: 'invoice',
    onDelete: 'CASCADE'
  });
};

export default InvoiceItem;