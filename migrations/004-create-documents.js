// migrations/004-create-documents.js
// Migration for creating documents table (invoices, receipts, etc.)

export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('documents', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
      comment: 'Primary key'
    },
    
    // Document identification
    documentNumber: {
      type: Sequelize.STRING(50),
      allowNull: false,
      unique: true,
      field: 'document_number',
      comment: 'Unique document number'
    },
    
    series: {
      type: Sequelize.STRING(10),
      defaultValue: 'A',
      comment: 'Document series'
    },
    
    type: {
      type: Sequelize.ENUM(
        'invoice',           // Τιμολόγιο
        'receipt',          // Απόδειξη
        'credit_note',      // Πιστωτικό
        'debit_note',       // Χρεωστικό
        'delivery_note',    // Δελτίο αποστολής
        'order',            // Παραγγελία
        'quote',            // Προσφορά
        'proforma',         // Proforma
        'purchase_order',   // Εντολή αγοράς
        'return_note'       // Δελτίο επιστροφής
      ),
      allowNull: false,
      comment: 'Document type'
    },
    
    subtype: {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'Document subtype'
    },
    
    // Status
    status: {
      type: Sequelize.ENUM(
        'draft',        // Πρόχειρο
        'pending',      // Εκκρεμεί
        'approved',     // Εγκρίθηκε
        'sent',         // Απεστάλη
        'cancelled',    // Ακυρώθηκε
        'paid',         // Εξοφλήθηκε
        'partial',      // Μερική εξόφληση
        'overdue'       // Ληξιπρόθεσμο
      ),
      defaultValue: 'draft',
      allowNull: false,
      comment: 'Document status'
    },
    
    // Related entities
    companyId: {
      type: Sequelize.UUID,
      allowNull: false,
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
      comment: 'Related member (if applicable)'
    },
    
    contactPerson: {
      type: Sequelize.STRING(200),
      allowNull: true,
      field: 'contact_person',
      comment: 'Contact person name'
    },
    
    // Dates
    date: {
      type: Sequelize.DATEONLY,
      allowNull: false,
      defaultValue: Sequelize.NOW,
      comment: 'Document date'
    },
    
    dueDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
      field: 'due_date',
      comment: 'Payment due date'
    },
    
    deliveryDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
      field: 'delivery_date',
      comment: 'Delivery date'
    },
    
    periodStart: {
      type: Sequelize.DATEONLY,
      allowNull: true,
      field: 'period_start',
      comment: 'Service period start'
    },
    
    periodEnd: {
      type: Sequelize.DATEONLY,
      allowNull: true,
      field: 'period_end',
      comment: 'Service period end'
    },
    
    // Reference documents
    referenceType: {
      type: Sequelize.STRING(50),
      allowNull: true,
      field: 'reference_type',
      comment: 'Reference document type'
    },
    
    referenceNumber: {
      type: Sequelize.STRING(50),
      allowNull: true,
      field: 'reference_number',
      comment: 'Reference document number'
    },
    
    referenceId: {
      type: Sequelize.UUID,
      allowNull: true,
      field: 'reference_id',
      references: {
        model: 'documents',
        key: 'id'
      },
      comment: 'Reference document ID'
    },
    
    orderNumber: {
      type: Sequelize.STRING(50),
      allowNull: true,
      field: 'order_number',
      comment: 'Customer order number'
    },
    
    contractNumber: {
      type: Sequelize.STRING(50),
      allowNull: true,
      field: 'contract_number',
      comment: 'Contract number'
    },
    
    // Shipping information
    shippingAddress: {
      type: Sequelize.STRING(255),
      allowNull: true,
      field: 'shipping_address',
      comment: 'Shipping address'
    },
    
    shippingCity: {
      type: Sequelize.STRING(100),
      allowNull: true,
      field: 'shipping_city',
      comment: 'Shipping city'
    },
    
    shippingPostalCode: {
      type: Sequelize.STRING(10),
      allowNull: true,
      field: 'shipping_postal_code',
      comment: 'Shipping postal code'
    },
    
    shippingCountry: {
      type: Sequelize.STRING(2),
      defaultValue: 'GR',
      field: 'shipping_country',
      comment: 'Shipping country'
    },
    
    shippingMethod: {
      type: Sequelize.STRING(100),
      allowNull: true,
      field: 'shipping_method',
      comment: 'Shipping method'
    },
    
    trackingNumber: {
      type: Sequelize.STRING(100),
      allowNull: true,
      field: 'tracking_number',
      comment: 'Shipping tracking number'
    },
    
    // Financial amounts (all amounts are stored as NET values)
    subtotal: {
      type: Sequelize.DECIMAL(15, 2),
      defaultValue: 0,
      comment: 'Subtotal before discounts and taxes'
    },
    
    discountPercentage: {
      type: Sequelize.DECIMAL(5, 2),
      defaultValue: 0,
      field: 'discount_percentage',
      comment: 'Overall discount percentage'
    },
    
    discountAmount: {
      type: Sequelize.DECIMAL(15, 2),
      defaultValue: 0,
      field: 'discount_amount',
      comment: 'Overall discount amount'
    },
    
    netAmount: {
      type: Sequelize.DECIMAL(15, 2),
      defaultValue: 0,
      field: 'net_amount',
      comment: 'Net amount after discounts'
    },
    
    taxAmount: {
      type: Sequelize.DECIMAL(15, 2),
      defaultValue: 0,
      field: 'tax_amount',
      comment: 'Total tax amount'
    },
    
    withholdingTax: {
      type: Sequelize.DECIMAL(15, 2),
      defaultValue: 0,
      field: 'withholding_tax',
      comment: 'Withholding tax amount'
    },
    
    stampDuty: {
      type: Sequelize.DECIMAL(15, 2),
      defaultValue: 0,
      field: 'stamp_duty',
      comment: 'Stamp duty amount'
    },
    
    shippingCost: {
      type: Sequelize.DECIMAL(15, 2),
      defaultValue: 0,
      field: 'shipping_cost',
      comment: 'Shipping cost'
    },
    
    otherCharges: {
      type: Sequelize.DECIMAL(15, 2),
      defaultValue: 0,
      field: 'other_charges',
      comment: 'Other charges'
    },
    
    totalAmount: {
      type: Sequelize.DECIMAL(15, 2),
      defaultValue: 0,
      field: 'total_amount',
      comment: 'Total amount (gross)'
    },
    
    // Payment information
    paidAmount: {
      type: Sequelize.DECIMAL(15, 2),
      defaultValue: 0,
      field: 'paid_amount',
      comment: 'Amount already paid'
    },
    
    balance: {
      type: Sequelize.DECIMAL(15, 2),
      defaultValue: 0,
      comment: 'Outstanding balance'
    },
    
    paymentMethod: {
      type: Sequelize.STRING(50),
      allowNull: true,
      field: 'payment_method',
      comment: 'Payment method'
    },
    
    paymentTerms: {
      type: Sequelize.INTEGER,
      defaultValue: 30,
      field: 'payment_terms',
      comment: 'Payment terms in days'
    },
    
    paymentReference: {
      type: Sequelize.STRING(100),
      allowNull: true,
      field: 'payment_reference',
      comment: 'Payment reference/transaction ID'
    },
    
    lastPaymentDate: {
      type: Sequelize.DATE,
      allowNull: true,
      field: 'last_payment_date',
      comment: 'Last payment received date'
    },
    
    // Currency
    currency: {
      type: Sequelize.STRING(3),
      defaultValue: 'EUR',
      comment: 'Currency code'
    },
    
    exchangeRate: {
      type: Sequelize.DECIMAL(10, 6),
      defaultValue: 1,
      field: 'exchange_rate',
      comment: 'Exchange rate to base currency'
    },
    
    // Tax details
    taxExempt: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      field: 'tax_exempt',
      comment: 'Tax exemption status'
    },
    
    taxExemptReason: {
      type: Sequelize.STRING(255),
      allowNull: true,
      field: 'tax_exempt_reason',
      comment: 'Tax exemption reason'
    },
    
    // myDATA (AADE) integration
    mydataStatus: {
      type: Sequelize.ENUM('pending', 'submitted', 'accepted', 'rejected', 'cancelled'),
      defaultValue: 'pending',
      field: 'mydata_status',
      comment: 'myDATA submission status'
    },
    
    mydataMark: {
      type: Sequelize.STRING(100),
      allowNull: true,
      field: 'mydata_mark',
      comment: 'myDATA mark number'
    },
    
    mydataUid: {
      type: Sequelize.STRING(100),
      allowNull: true,
      field: 'mydata_uid',
      comment: 'myDATA unique ID'
    },
    
    mydataQr: {
      type: Sequelize.TEXT,
      allowNull: true,
      field: 'mydata_qr',
      comment: 'myDATA QR code'
    },
    
    mydataSubmittedAt: {
      type: Sequelize.DATE,
      allowNull: true,
      field: 'mydata_submitted_at',
      comment: 'myDATA submission timestamp'
    },
    
    mydataCancelledAt: {
      type: Sequelize.DATE,
      allowNull: true,
      field: 'mydata_cancelled_at',
      comment: 'myDATA cancellation timestamp'
    },
    
    // Notes and descriptions
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Document description'
    },
    
    internalNotes: {
      type: Sequelize.TEXT,
      allowNull: true,
      field: 'internal_notes',
      comment: 'Internal notes (not printed)'
    },
    
    customerNotes: {
      type: Sequelize.TEXT,
      allowNull: true,
      field: 'customer_notes',
      comment: 'Customer notes (printed)'
    },
    
    termsAndConditions: {
      type: Sequelize.TEXT,
      allowNull: true,
      field: 'terms_and_conditions',
      comment: 'Terms and conditions'
    },
    
    // Files and attachments
    pdfPath: {
      type: Sequelize.STRING(500),
      allowNull: true,
      field: 'pdf_path',
      comment: 'Generated PDF file path'
    },
    
    attachments: {
      type: Sequelize.JSON,
      defaultValue: [],
      comment: 'Attached files'
    },
    
    // Printing and sending
    printCount: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      field: 'print_count',
      comment: 'Number of times printed'
    },
    
    lastPrintedAt: {
      type: Sequelize.DATE,
      allowNull: true,
      field: 'last_printed_at',
      comment: 'Last printed timestamp'
    },
    
    emailSent: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      field: 'email_sent',
      comment: 'Email sent status'
    },
    
    emailSentAt: {
      type: Sequelize.DATE,
      allowNull: true,
      field: 'email_sent_at',
      comment: 'Email sent timestamp'
    },
    
    emailRecipient: {
      type: Sequelize.STRING(255),
      allowNull: true,
      field: 'email_recipient',
      comment: 'Email recipient address'
    },
    
    // Flags
    isTemplate: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      field: 'is_template',
      comment: 'Template document flag'
    },
    
    isRecurring: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      field: 'is_recurring',
      comment: 'Recurring document flag'
    },
    
    recurringSchedule: {
      type: Sequelize.JSON,
      allowNull: true,
      field: 'recurring_schedule',
      comment: 'Recurring schedule settings'
    },
    
    isLocked: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      field: 'is_locked',
      comment: 'Document locked for editing'
    },
    
    lockedAt: {
      type: Sequelize.DATE,
      allowNull: true,
      field: 'locked_at',
      comment: 'Document locked timestamp'
    },
    
    lockedBy: {
      type: Sequelize.UUID,
      allowNull: true,
      field: 'locked_by',
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Locked by user'
    },
    
    // Metadata
    tags: {
      type: Sequelize.JSON,
      defaultValue: [],
      comment: 'Document tags'
    },
    
    customFields: {
      type: Sequelize.JSON,
      defaultValue: {},
      field: 'custom_fields',
      comment: 'Custom fields'
    },
    
    // Approval workflow
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
  await queryInterface.addIndex('documents', ['document_number'], {
    unique: true,
    name: 'documents_number_unique'
  });
  
  await queryInterface.addIndex('documents', ['type'], {
    name: 'documents_type_index'
  });
  
  await queryInterface.addIndex('documents', ['status'], {
    name: 'documents_status_index'
  });
  
  await queryInterface.addIndex('documents', ['company_id'], {
    name: 'documents_company_index'
  });
  
  await queryInterface.addIndex('documents', ['member_id'], {
    name: 'documents_member_index'
  });
  
  await queryInterface.addIndex('documents', ['date'], {
    name: 'documents_date_index'
  });
  
  await queryInterface.addIndex('documents', ['due_date'], {
    name: 'documents_due_date_index'
  });
  
  await queryInterface.addIndex('documents', ['reference_id'], {
    name: 'documents_reference_index'
  });
  
  await queryInterface.addIndex('documents', ['mydata_status'], {
    name: 'documents_mydata_status_index'
  });
  
  // Composite indexes
  await queryInterface.addIndex('documents', ['type', 'status'], {
    name: 'documents_type_status_index'
  });
  
  await queryInterface.addIndex('documents', ['company_id', 'type', 'status'], {
    name: 'documents_company_type_status_index'
  });
  
  await queryInterface.addIndex('documents', ['type', 'date'], {
    name: 'documents_type_date_index'
  });
  
  await queryInterface.addIndex('documents', ['series', 'type', 'created_at'], {
    name: 'documents_series_type_date_index'
  });
};

export const down = async (queryInterface, Sequelize) => {
  // Remove indexes
  await queryInterface.removeIndex('documents', 'documents_number_unique');
  await queryInterface.removeIndex('documents', 'documents_type_index');
  await queryInterface.removeIndex('documents', 'documents_status_index');
  await queryInterface.removeIndex('documents', 'documents_company_index');
  await queryInterface.removeIndex('documents', 'documents_member_index');
  await queryInterface.removeIndex('documents', 'documents_date_index');
  await queryInterface.removeIndex('documents', 'documents_due_date_index');
  await queryInterface.removeIndex('documents', 'documents_reference_index');
  await queryInterface.removeIndex('documents', 'documents_mydata_status_index');
  await queryInterface.removeIndex('documents', 'documents_type_status_index');
  await queryInterface.removeIndex('documents', 'documents_company_type_status_index');
  await queryInterface.removeIndex('documents', 'documents_type_date_index');
  await queryInterface.removeIndex('documents', 'documents_series_type_date_index');
  
  // Drop table
  await queryInterface.dropTable('documents');
};