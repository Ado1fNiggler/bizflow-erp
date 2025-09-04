// models/Document.js
// Document Model για διαχείριση παραστατικών

import { DataTypes, Op } from 'sequelize';
import sequelize from '../config/database.js';
import Company from './Company.js';
import User from './User.js';

const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Βασικά στοιχεία παραστατικού
  documentType: {
    type: DataTypes.ENUM(
      'invoice',           // Τιμολόγιο
      'receipt',          // Απόδειξη
      'credit_note',      // Πιστωτικό
      'debit_note',       // Χρεωστικό
      'quote',            // Προσφορά
      'order',            // Παραγγελία
      'delivery_note',    // Δελτίο αποστολής
      'proforma'          // Proforma
    ),
    allowNull: false,
    comment: 'Τύπος παραστατικού'
  },
  
  documentNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Αριθμός παραστατικού'
  },
  
  documentSeries: {
    type: DataTypes.STRING(10),
    defaultValue: 'A',
    comment: 'Σειρά παραστατικού'
  },
  
  documentDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Ημερομηνία έκδοσης'
  },
  
  dueDate: {
    type: DataTypes.DATEONLY,
    comment: 'Ημερομηνία λήξης'
  },
  
  // Συνδεδεμένες οντότητες
  companyId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Company,
      key: 'id'
    },
    comment: 'Εταιρία/Πελάτης'
  },
  
  relatedDocumentId: {
    type: DataTypes.UUID,
    references: {
      model: 'Document',
      key: 'id'
    },
    comment: 'Συσχετιζόμενο παραστατικό'
  },
  
  // Οικονομικά στοιχεία
  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Καθαρή αξία'
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
  
  vatRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 24,
    comment: 'Συντελεστής ΦΠΑ'
  },
  
  vatAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Ποσό ΦΠΑ'
  },
  
  withholdingTaxRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    comment: 'Παρακράτηση φόρου %'
  },
  
  withholdingTaxAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Ποσό παρακράτησης'
  },
  
  otherCharges: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Λοιπές χρεώσεις'
  },
  
  total: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Συνολικό ποσό'
  },
  
  // Πληρωμές
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'card', 'bank_transfer', 'check', 'credit', 'other'),
    defaultValue: 'cash',
    comment: 'Τρόπος πληρωμής'
  },
  
  paymentTerms: {
    type: DataTypes.STRING(255),
    comment: 'Όροι πληρωμής'
  },
  
  paidAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Εξοφλημένο ποσό'
  },
  
  balanceDue: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Υπόλοιπο προς πληρωμή'
  },
  
  // Κατάσταση
  status: {
    type: DataTypes.ENUM('draft', 'pending', 'sent', 'viewed', 'paid', 'partial', 'overdue', 'cancelled'),
    defaultValue: 'draft',
    comment: 'Κατάσταση παραστατικού'
  },
  
  // Περιγραφές και σημειώσεις
  description: {
    type: DataTypes.TEXT,
    comment: 'Περιγραφή'
  },
  
  internalNotes: {
    type: DataTypes.TEXT,
    comment: 'Εσωτερικές σημειώσεις'
  },
  
  customerNotes: {
    type: DataTypes.TEXT,
    comment: 'Σημειώσεις για πελάτη'
  },
  
  // myDATA
  mydataMark: {
    type: DataTypes.STRING(100),
    comment: 'MARK από myDATA'
  },
  
  mydataUid: {
    type: DataTypes.STRING(100),
    comment: 'UID από myDATA'
  },
  
  mydataStatus: {
    type: DataTypes.ENUM('pending', 'submitted', 'accepted', 'rejected', 'cancelled'),
    comment: 'Κατάσταση myDATA'
  },
  
  mydataSubmittedAt: {
    type: DataTypes.DATE,
    comment: 'Ημερομηνία υποβολής myDATA'
  },
  
  // Αρχεία
  pdfUrl: {
    type: DataTypes.STRING(500),
    comment: 'URL του PDF'
  },
  
  attachments: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'Συνημμένα αρχεία'
  },
  
  // Metadata
  createdBy: {
    type: DataTypes.UUID,
    references: {
      model: User,
      key: 'id'
    },
    comment: 'Δημιουργός'
  },
  
  updatedBy: {
    type: DataTypes.UUID,
    references: {
      model: User,
      key: 'id'
    },
    comment: 'Τελευταία ενημέρωση από'
  },
  
  lockedBy: {
    type: DataTypes.UUID,
    references: {
      model: User,
      key: 'id'
    },
    comment: 'Κλειδωμένο από χρήστη'
  },
  
  lockedAt: {
    type: DataTypes.DATE,
    comment: 'Ώρα κλειδώματος'
  },
  
  sentAt: {
    type: DataTypes.DATE,
    comment: 'Ημερομηνία αποστολής'
  },
  
  viewedAt: {
    type: DataTypes.DATE,
    comment: 'Ημερομηνία προβολής'
  },
  
  printedAt: {
    type: DataTypes.DATE,
    comment: 'Ημερομηνία εκτύπωσης'
  },
  
  emailedTo: {
    type: DataTypes.STRING(255),
    comment: 'Email αποστολής'
  }
}, {
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      unique: true,
      fields: ['document_type', 'document_series', 'document_number']
    },
    {
      fields: ['document_date']
    },
    {
      fields: ['company_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['mydata_status']
    }
  ]
});

// Instance Methods
Document.prototype.calculateTotals = function() {
  const subtotal = parseFloat(this.subtotal) || 0;
  const discountAmount = parseFloat(this.discountAmount) || 0;
  const netAmount = subtotal - discountAmount;
  
  const vatAmount = netAmount * (parseFloat(this.vatRate) / 100);
  const withholdingTaxAmount = netAmount * (parseFloat(this.withholdingTaxRate) / 100);
  const otherCharges = parseFloat(this.otherCharges) || 0;
  
  this.vatAmount = vatAmount.toFixed(2);
  this.withholdingTaxAmount = withholdingTaxAmount.toFixed(2);
  this.total = (netAmount + vatAmount - withholdingTaxAmount + otherCharges).toFixed(2);
  this.balanceDue = (parseFloat(this.total) - parseFloat(this.paidAmount)).toFixed(2);
};

Document.prototype.generateDocumentNumber = async function() {
  const year = new Date().getFullYear();
  const lastDoc = await Document.findOne({
    where: {
      documentType: this.documentType,
      documentSeries: this.documentSeries,
      documentDate: {
        [Op.between]: [`${year}-01-01`, `${year}-12-31`]
      }
    },
    order: [['documentNumber', 'DESC']]
  });
  
  let nextNumber = 1;
  if (lastDoc && lastDoc.documentNumber) {
    const match = lastDoc.documentNumber.match(/\d+$/);
    if (match) {
      nextNumber = parseInt(match[0]) + 1;
    }
  }
  
  this.documentNumber = `${this.documentSeries}-${String(nextNumber).padStart(6, '0')}`;
};

Document.prototype.canBeEdited = function() {
  return ['draft', 'pending'].includes(this.status) && 
         !this.lockedBy && 
         !this.mydataMark;
};

Document.prototype.canBeCancelled = function() {
  return !['cancelled'].includes(this.status) && !this.mydataMark;
};

// Hooks
Document.beforeCreate(async (document) => {
  if (!document.documentNumber) {
    await document.generateDocumentNumber();
  }
  document.calculateTotals();
});

Document.beforeUpdate((document) => {
  if (document.changed('subtotal') || 
      document.changed('discountAmount') || 
      document.changed('vatRate') || 
      document.changed('withholdingTaxRate') || 
      document.changed('otherCharges')) {
    document.calculateTotals();
  }
});

export default Document;