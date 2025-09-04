// migrations/006-create-payments.js
// Migration for creating payments table

export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('payments', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
      comment: 'Primary key'
    },
    
    // Payment identification
    paymentNumber: {
      type: Sequelize.STRING(50),
      allowNull: false,
      unique: true,
      field: 'payment_number',
      comment: 'Unique payment number'
    },
    
    type: {
      type: Sequelize.ENUM(
        'incoming',     // Εισερχόμενη πληρωμή
        'outgoing',     // Εξερχόμενη πληρωμή
        'transfer',     // Μεταφορά
        'refund',       // Επιστροφή
        'advance',      // Προκαταβολή
        'deposit'       // Κατάθεση
      ),
      allowNull: false,
      comment: 'Payment type'
    },
    
    // Status
    status: {
      type: Sequelize.ENUM(
        'pending',      // Εκκρεμεί
        'processing',   // Σε επεξεργασία
        'completed',    // Ολοκληρώθηκε
        'failed',       // Απέτυχε
        'cancelled',    // Ακυρώθηκε
        'refunded'      // Επιστράφηκε
      ),
      defaultValue: 'pending',
      allowNull: false,
      comment: 'Payment status'
    },
    
    // Related entities
    companyId: {
      type: Sequelize.UUID,
      allowNull: true,
      field: 'company_id',
      references: {
        model: 'companies',
        key: 'id'
      },
      comment: 'Related company'
    },
    
    memberId: {
      type: Sequelize.UUID,
      allowNull: true,
      field: 'member_id',
      references: {
        model: 'members',
        key: 'id'
      },
      comment: 'Related member'
    },
    
    // Payment details
    paymentDate: {
      type: Sequelize.DATEONLY,
      allowNull: false,
      field: 'payment_date',
      defaultValue: Sequelize.NOW,
      comment: 'Payment date'
    },
    
    valueDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
      field: 'value_date',
      comment: 'Value date'
    },
    
    amount: {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: false,
      comment: 'Payment amount'
    },
    
    currency: {
      type: Sequelize.STRING(3),
      defaultValue: 'EUR',
      comment: 'Currency code'
    },
    
    exchangeRate: {
      type: Sequelize.DECIMAL(10, 6),
      defaultValue: 1,
      field: 'exchange_rate',
      comment: 'Exchange rate'
    },
    
    baseAmount: {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: false,
      field: 'base_amount',
      comment: 'Amount in base currency'
    },
    
    // Payment method
    paymentMethod: {
      type: Sequelize.ENUM(
        'cash',             // Μετρητά
        'bank_transfer',    // Τραπεζική μεταφορά
        'credit_card',      // Πιστωτική κάρτα
        'debit_card',       // Χρεωστική κάρτα
        'check',            // Επιταγή
        'paypal',           // PayPal
        'stripe',           // Stripe
        'pos',              // POS
        'web_banking',      // Web Banking
        'mobile_payment',   // Mobile Payment
        'cryptocurrency',   // Κρυπτονόμισμα
        'other'            // Άλλο
      ),
      allowNull: false,
      field: 'payment_method',
      comment: 'Payment method'
    },
    
    // Bank details
    bankName: {
      type: Sequelize.STRING(100),
      allowNull: true,
      field: 'bank_name',
      comment: 'Bank name'
    },
    
    bankAccount: {
      type: Sequelize.STRING(50),
      allowNull: true,
      field: 'bank_account',
      comment: 'Bank account number'
    },
    
    bankAccountId: {
      type: Sequelize.UUID,
      allowNull: true,
      field: 'bank_account_id',
      comment: 'Company bank account ID'
    },
    
    iban: {
      type: Sequelize.STRING(34),
      allowNull: true,
      comment: 'IBAN'
    },
    
    swift: {
      type: Sequelize.STRING(11),
      allowNull: true,
      comment: 'SWIFT/BIC code'
    },
    
    // Check details
    checkNumber: {
      type: Sequelize.STRING(50),
      allowNull: true,
      field: 'check_number',
      comment: 'Check number'
    },
    
    checkDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
      field: 'check_date',
      comment: 'Check date'
    },
    
    checkBank: {
      type: Sequelize.STRING(100),
      allowNull: true,
      field: 'check_bank',
      comment: 'Check issuing bank'
    },
    
    // Card details (masked)
    cardLastFour: {
      type: Sequelize.STRING(4),
      allowNull: true,
      field: 'card_last_four',
      comment: 'Last 4 digits of card'
    },
    
    cardType: {
      type: Sequelize.STRING(20),
      allowNull: true,
      field: 'card_type',
      comment: 'Card type (Visa, Mastercard, etc.)'
    },
    
    // Transaction references
    transactionId: {
      type: Sequelize.STRING(100),
      allowNull: true,
      field: 'transaction_id',
      comment: 'Bank transaction ID'
    },
    
    referenceNumber: {
      type: Sequelize.STRING(100),
      allowNull: true,
      field: 'reference_number',
      comment: 'Payment reference number'
    },
    
    processorReference: {
      type: Sequelize.STRING(100),
      allowNull: true,
      field: 'processor_reference',
      comment: 'Payment processor reference'
    },
    
    authorizationCode: {
      type: Sequelize.STRING(50),
      allowNull: true,
      field: 'authorization_code',
      comment: 'Authorization code'
    },
    
    // Fees and charges
    processingFee: {
      type: Sequelize.DECIMAL(10, 2),
      defaultValue: 0,
      field: 'processing_fee',
      comment: 'Processing fee'
    },
    
    bankCharges: {
      type: Sequelize.DECIMAL(10, 2),
      defaultValue: 0,
      field: 'bank_charges',
      comment: 'Bank charges'
    },
    
    netAmount: {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: false,
      field: 'net_amount',
      comment: 'Net amount after fees'
    },
    
    // Allocation
    allocatedAmount: {
      type: Sequelize.DECIMAL(15, 2),
      defaultValue: 0,
      field: 'allocated_amount',
      comment: 'Amount allocated to documents'
    },
    
    unallocatedAmount: {
      type: Sequelize.DECIMAL(15, 2),
      defaultValue: 0,
      field: 'unallocated_amount',
      comment: 'Unallocated amount'
    },
    
    isFullyAllocated: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      field: 'is_fully_allocated',
      comment: 'Fully allocated flag'
    },
    
    // Description
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Payment description'
    },
    
    notes: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Payment notes'
    },
    
    internalNotes: {
      type: Sequelize.TEXT,
      allowNull: true,
      field: 'internal_notes',
      comment: 'Internal notes'
    },
    
    // Reconciliation
    isReconciled: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      field: 'is_reconciled',
      comment: 'Bank reconciliation status'
    },
    
    reconciledDate: {
      type: Sequelize.DATE,
      allowNull: true,
      field: 'reconciled_date',
      comment: 'Reconciliation date'
    },
    
    reconciledBy: {
      type: Sequelize.UUID,
      allowNull: true,
      field: 'reconciled_by',
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Reconciled by user'
    },
    
    statementReference: {
      type: Sequelize.STRING(100),
      allowNull: true,
      field: 'statement_reference',
      comment: 'Bank statement reference'
    },
    
    // Approval
    requiresApproval: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      field: 'requires_approval',
      comment: 'Requires approval flag'
    },
    
    approvedBy: {
      type: Sequelize.UUID,
      allowNull: true,
      field: 'approved_by',
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Approved by user'
    },
    
    approvedAt: {
      type: Sequelize.DATE,
      allowNull: true,
      field: 'approved_at',
      comment: 'Approval timestamp'
    },
    
    // Cancellation
    cancelledBy: {
      type: Sequelize.UUID,
      allowNull: true,
      field: 'cancelled_by',
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Cancelled by user'
    },
    
    cancelledAt: {
      type: Sequelize.DATE,
      allowNull: true,
      field: 'cancelled_at',
      comment: 'Cancellation timestamp'
    },
    
    cancellationReason: {
      type: Sequelize.TEXT,
      allowNull: true,
      field: 'cancellation_reason',
      comment: 'Cancellation reason'
    },
    
    // Refund details
    isRefund: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      field: 'is_refund',
      comment: 'Is refund payment'
    },
    
    originalPaymentId: {
      type: Sequelize.UUID,
      allowNull: true,
      field: 'original_payment_id',
      references: {
        model: 'payments',
        key: 'id'
      },
      comment: 'Original payment (for refunds)'
    },
    
    refundReason: {
      type: Sequelize.TEXT,
      allowNull: true,
      field: 'refund_reason',
      comment: 'Refund reason'
    },
    
    // Receipt
    receiptNumber: {
      type: Sequelize.STRING(50),
      allowNull: true,
      field: 'receipt_number',
      comment: 'Receipt number'
    },
    
    receiptPath: {
      type: Sequelize.STRING(500),
      allowNull: true,
      field: 'receipt_path',
      comment: 'Receipt file path'
    },
    
    // Email notification
    emailSent: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      field: 'email_sent',
      comment: 'Email notification sent'
    },
    
    emailSentAt: {
      type: Sequelize.DATE,
      allowNull: true,
      field: 'email_sent_at',
      comment: 'Email sent timestamp'
    },
    
    // Metadata
    source: {
      type: Sequelize.STRING(50),
      defaultValue: 'manual',
      comment: 'Payment source (manual, api, import, etc.)'
    },
    
    tags: {
      type: Sequelize.JSON,
      defaultValue: [],
      comment: 'Payment tags'
    },
    
    customFields: {
      type: Sequelize.JSON,
      defaultValue: {},
      field: 'custom_fields',
      comment: 'Custom fields'
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
  
  // Create payment allocations table (many-to-many with documents)
  await queryInterface.createTable('payment_allocations', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    
    paymentId: {
      type: Sequelize.UUID,
      allowNull: false,
      field: 'payment_id',
      references: {
        model: 'payments',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    
    documentId: {
      type: Sequelize.UUID,
      allowNull: false,
      field: 'document_id',
      references: {
        model: 'documents',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    
    amount: {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: false,
      comment: 'Allocated amount'
    },
    
    allocationDate: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
      field: 'allocation_date',
      comment: 'Allocation date'
    },
    
    notes: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    
    createdBy: {
      type: Sequelize.UUID,
      allowNull: true,
      field: 'created_by',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    
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
    }
  });
  
  // Create indexes for payments
  await queryInterface.addIndex('payments', ['payment_number'], {
    unique: true,
    name: 'payments_number_unique'
  });
  
  await queryInterface.addIndex('payments', ['type'], {
    name: 'payments_type_index'
  });
  
  await queryInterface.addIndex('payments', ['status'], {
    name: 'payments_status_index'
  });
  
  await queryInterface.addIndex('payments', ['company_id'], {
    name: 'payments_company_index'
  });
  
  await queryInterface.addIndex('payments', ['member_id'], {
    name: 'payments_member_index'
  });
  
  await queryInterface.addIndex('payments', ['payment_date'], {
    name: 'payments_date_index'
  });
  
  await queryInterface.addIndex('payments', ['payment_method'], {
    name: 'payments_method_index'
  });
  
  await queryInterface.addIndex('payments', ['is_reconciled'], {
    name: 'payments_reconciled_index'
  });
  
  await queryInterface.addIndex('payments', ['original_payment_id'], {
    name: 'payments_original_index'
  });
  
  // Composite indexes
  await queryInterface.addIndex('payments', ['type', 'status'], {
    name: 'payments_type_status_index'
  });
  
  await queryInterface.addIndex('payments', ['company_id', 'payment_date'], {
    name: 'payments_company_date_index'
  });
  
  // Indexes for payment allocations
  await queryInterface.addIndex('payment_allocations', ['payment_id'], {
    name: 'allocations_payment_index'
  });
  
  await queryInterface.addIndex('payment_allocations', ['document_id'], {
    name: 'allocations_document_index'
  });
  
  await queryInterface.addIndex('payment_allocations', ['payment_id', 'document_id'], {
    unique: true,
    name: 'allocations_payment_document_unique'
  });
};

export const down = async (queryInterface, Sequelize) => {
  // Remove payment allocations indexes
  await queryInterface.removeIndex('payment_allocations', 'allocations_payment_index');
  await queryInterface.removeIndex('payment_allocations', 'allocations_document_index');
  await queryInterface.removeIndex('payment_allocations', 'allocations_payment_document_unique');
  
  // Remove payments indexes
  await queryInterface.removeIndex('payments', 'payments_number_unique');
  await queryInterface.removeIndex('payments', 'payments_type_index');
  await queryInterface.removeIndex('payments', 'payments_status_index');
  await queryInterface.removeIndex('payments', 'payments_company_index');
  await queryInterface.removeIndex('payments', 'payments_member_index');
  await queryInterface.removeIndex('payments', 'payments_date_index');
  await queryInterface.removeIndex('payments', 'payments_method_index');
  await queryInterface.removeIndex('payments', 'payments_reconciled_index');
  await queryInterface.removeIndex('payments', 'payments_original_index');
  await queryInterface.removeIndex('payments', 'payments_type_status_index');
  await queryInterface.removeIndex('payments', 'payments_company_date_index');
  
  // Drop tables
  await queryInterface.dropTable('payment_allocations');
  await queryInterface.dropTable('payments');
};