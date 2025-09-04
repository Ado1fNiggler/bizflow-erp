// models/DocumentItem.js
// Document Item Model για γραμμές παραστατικών

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Document from './Document.js';

const DocumentItem = sequelize.define('DocumentItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  documentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Document,
      key: 'id'
    },
    onDelete: 'CASCADE',
    comment: 'Παραστατικό'
  },
  
  lineNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Αριθμός γραμμής'
  },
  
  // Στοιχεία προϊόντος/υπηρεσίας
  itemCode: {
    type: DataTypes.STRING(50),
    comment: 'Κωδικός είδους'
  },
  
  itemType: {
    type: DataTypes.ENUM('product', 'service', 'expense', 'other'),
    defaultValue: 'product',
    comment: 'Τύπος είδους'
  },
  
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Περιγραφή'
  },
  
  detailedDescription: {
    type: DataTypes.TEXT,
    comment: 'Αναλυτική περιγραφή'
  },
  
  // Ποσότητες και μονάδες
  quantity: {
    type: DataTypes.DECIMAL(12, 3),
    allowNull: false,
    defaultValue: 1,
    comment: 'Ποσότητα'
  },
  
  unit: {
    type: DataTypes.STRING(20),
    defaultValue: 'ΤΕΜ',
    comment: 'Μονάδα μέτρησης'
  },
  
  // Τιμές
  unitPrice: {
    type: DataTypes.DECIMAL(12, 4),
    allowNull: false,
    defaultValue: 0,
    comment: 'Τιμή μονάδας'
  },
  
  discountPercentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    comment: 'Ποσοστό έκπτωσης'
  },
  
  discountAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Ποσό έκπτωσης'
  },
  
  netAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Καθαρή αξία'
  },
  
  // ΦΠΑ
  vatRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 24,
    comment: 'Συντελεστής ΦΠΑ'
  },
  
  vatCategory: {
    type: DataTypes.ENUM(
      'standard',      // Κανονικός συντελεστής
      'reduced',       // Μειωμένος συντελεστής  
      'super_reduced', // Υπερμειωμένος
      'exempt',        // Απαλλαγή
      'without'        // Χωρίς ΦΠΑ
    ),
    defaultValue: 'standard',
    comment: 'Κατηγορία ΦΠΑ'
  },
  
  vatAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Ποσό ΦΠΑ'
  },
  
  totalAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Συνολική αξία'
  },
  
  // Λογιστική κατηγοριοποίηση
  incomeCategory: {
    type: DataTypes.STRING(50),
    comment: 'Κατηγορία εσόδου (Ε3)'
  },
  
  expenseCategory: {
    type: DataTypes.STRING(50),
    comment: 'Κατηγορία εξόδου'
  },
  
  accountCode: {
    type: DataTypes.STRING(20),
    comment: 'Λογιστικός κωδικός'
  },
  
  // myDATA στοιχεία
  classificationCategory: {
    type: DataTypes.STRING(20),
    comment: 'Κατηγορία χαρακτηρισμού myDATA'
  },
  
  classificationType: {
    type: DataTypes.STRING(20),
    comment: 'Τύπος χαρακτηρισμού myDATA'
  },
  
  // Πρόσθετα στοιχεία
  notes: {
    type: DataTypes.TEXT,
    comment: 'Σημειώσεις γραμμής'
  },
  
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Σειρά ταξινόμησης'
  },
  
  isGift: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Είναι δώρο'
  },
  
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Επιπλέον δεδομένα'
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['document_id']
    },
    {
      fields: ['item_code']
    }
  ]
});

// Instance Methods
DocumentItem.prototype.calculateAmounts = function() {
  const quantity = parseFloat(this.quantity) || 0;
  const unitPrice = parseFloat(this.unitPrice) || 0;
  const discountPercentage = parseFloat(this.discountPercentage) || 0;
  
  // Υπολογισμός καθαρής αξίας
  let grossAmount = quantity * unitPrice;
  let discountAmount = grossAmount * (discountPercentage / 100);
  
  if (this.discountAmount && this.discountAmount > 0) {
    discountAmount = parseFloat(this.discountAmount);
  }
  
  this.netAmount = (grossAmount - discountAmount).toFixed(2);
  
  // Υπολογισμός ΦΠΑ
  const vatRate = parseFloat(this.vatRate) || 0;
  this.vatAmount = (parseFloat(this.netAmount) * (vatRate / 100)).toFixed(2);
  
  // Συνολική αξία
  this.totalAmount = (parseFloat(this.netAmount) + parseFloat(this.vatAmount)).toFixed(2);
};

// Hooks
DocumentItem.beforeSave((item) => {
  item.calculateAmounts();
});

DocumentItem.afterCreate(async (item) => {
  await updateDocumentTotals(item.documentId);
});

DocumentItem.afterUpdate(async (item) => {
  await updateDocumentTotals(item.documentId);
});

DocumentItem.afterDestroy(async (item) => {
  await updateDocumentTotals(item.documentId);
});

// Helper function για ενημέρωση συνόλων παραστατικού
async function updateDocumentTotals(documentId) {
  const document = await Document.findByPk(documentId);
  if (!document) return;
  
  const items = await DocumentItem.findAll({
    where: { documentId },
    order: [['sortOrder', 'ASC'], ['lineNumber', 'ASC']]
  });
  
  let subtotal = 0;
  let totalVat = 0;
  
  items.forEach(item => {
    subtotal += parseFloat(item.netAmount) || 0;
    totalVat += parseFloat(item.vatAmount) || 0;
  });
  
  document.subtotal = subtotal.toFixed(2);
  document.vatAmount = totalVat.toFixed(2);
  document.calculateTotals();
  
  await document.save();
}

export default DocumentItem;