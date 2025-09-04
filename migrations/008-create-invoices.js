// migrations/008-create-invoices.js
// Migration for creating invoices table

export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('invoices', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
      comment: 'Primary key'
    },
    
    // Invoice identification
    invoice_number: {
      type: Sequelize.STRING(50),
      allowNull: false,
      unique: true,
      comment: 'Unique invoice number'
    },
    
    series: {
      type: Sequelize.STRING(10),
      allowNull: false,
      defaultValue: 'A',
      comment: 'Invoice series'
    },
    
    type: {
      type: Sequelize.ENUM(
        'invoice',
        'credit_note',
        'debit_note',
        'receipt',
        'proforma'
      ),
      allowNull: false,
      defaultValue: 'invoice',
      comment: 'Document type'
    },
    
    // Client information
    company_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'companies',
        key: 'id'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
      comment: 'Customer company ID'
    },
    
    // Dates
    issue_date: {
      type: Sequelize.DATEONLY,
      allowNull: false,
      comment: 'Invoice issue date'
    },
    
    due_date: {
      type: Sequelize.DATEONLY,
      allowNull: true,
      comment: 'Payment due date'
    },
    
    delivery_date: {
      type: Sequelize.DATEONLY,
      allowNull: true,
      comment: 'Delivery date'
    },
    
    // Financial data
    subtotal: {
      type: Sequelize.DECIMAL(15, 4),
      allowNull: false,
      defaultValue: 0,
      comment: 'Subtotal before VAT'
    },
    
    vat_amount: {
      type: Sequelize.DECIMAL(15, 4),
      allowNull: false,
      defaultValue: 0,
      comment: 'Total VAT amount'
    },
    
    total_amount: {
      type: Sequelize.DECIMAL(15, 4),
      allowNull: false,
      defaultValue: 0,
      comment: 'Total amount including VAT'
    },
    
    discount_amount: {
      type: Sequelize.DECIMAL(15, 4),
      allowNull: false,
      defaultValue: 0,
      comment: 'Total discount amount'
    },
    
    discount_percent: {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Discount percentage'
    },
    
    currency: {
      type: Sequelize.STRING(3),
      allowNull: false,
      defaultValue: 'EUR',
      comment: 'Currency code'
    },
    
    exchange_rate: {
      type: Sequelize.DECIMAL(10, 6),
      allowNull: false,
      defaultValue: 1,
      comment: 'Exchange rate to EUR'
    },
    
    // Payment information
    payment_method: {
      type: Sequelize.ENUM(
        'cash',
        'card',
        'bank_transfer',
        'check',
        'other'
      ),
      allowNull: true,
      comment: 'Payment method'
    },
    
    payment_terms: {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Payment terms description'
    },
    
    // Status
    status: {
      type: Sequelize.ENUM(
        'draft',
        'sent',
        'paid',
        'overdue',
        'cancelled'
      ),
      allowNull: false,
      defaultValue: 'draft',
      comment: 'Invoice status'
    },
    
    // Greek tax compliance
    vat_category: {
      type: Sequelize.ENUM(
        'normal',
        'reduced',
        'super_reduced',
        'exempt',
        'reverse'
      ),
      allowNull: false,
      defaultValue: 'normal',
      comment: 'VAT category for Greek tax'
    },
    
    // MyData integration
    mydata_id: {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'MyData submission ID'
    },
    
    mydata_status: {
      type: Sequelize.ENUM(
        'pending',
        'submitted',
        'accepted',
        'rejected'
      ),
      allowNull: true,
      defaultValue: 'pending',
      comment: 'MyData submission status'
    },
    
    mydata_submitted_at: {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'MyData submission timestamp'
    },
    
    // Additional information
    notes: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Invoice notes'
    },
    
    internal_notes: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Internal notes (not shown to customer)'
    },
    
    // References
    reference_number: {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Customer reference number'
    },
    
    parent_invoice_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'invoices',
        key: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      comment: 'Parent invoice for credit/debit notes'
    },
    
    // Metadata
    metadata: {
      type: Sequelize.JSONB,
      defaultValue: {},
      comment: 'Additional metadata'
    },
    
    // Audit fields
    created_by: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      comment: 'User who created the invoice'
    },
    
    updated_by: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      comment: 'User who last updated the invoice'
    },
    
    // Timestamps
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
      comment: 'Creation timestamp'
    },
    
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
      comment: 'Last update timestamp'
    },
    
    deleted_at: {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Soft delete timestamp'
    }
  });
  
  // Create indexes for performance
  await queryInterface.addIndex('invoices', ['invoice_number'], {
    unique: true,
    name: 'invoices_invoice_number_unique'
  });
  
  await queryInterface.addIndex('invoices', ['company_id'], {
    name: 'invoices_company_id_index'
  });
  
  await queryInterface.addIndex('invoices', ['issue_date'], {
    name: 'invoices_issue_date_index'
  });
  
  await queryInterface.addIndex('invoices', ['due_date'], {
    name: 'invoices_due_date_index'
  });
  
  await queryInterface.addIndex('invoices', ['status'], {
    name: 'invoices_status_index'
  });
  
  await queryInterface.addIndex('invoices', ['type'], {
    name: 'invoices_type_index'
  });
  
  await queryInterface.addIndex('invoices', ['mydata_status'], {
    name: 'invoices_mydata_status_index'
  });
  
  await queryInterface.addIndex('invoices', ['created_by'], {
    name: 'invoices_created_by_index'
  });
  
  await queryInterface.addIndex('invoices', ['parent_invoice_id'], {
    name: 'invoices_parent_invoice_id_index'
  });
  
  // Composite indexes
  await queryInterface.addIndex('invoices', ['series', 'invoice_number'], {
    name: 'invoices_series_number_index'
  });
  
  await queryInterface.addIndex('invoices', ['status', 'due_date'], {
    name: 'invoices_status_due_date_index'
  });
  
  await queryInterface.addIndex('invoices', ['company_id', 'status'], {
    name: 'invoices_company_status_index'
  });
  
  await queryInterface.addIndex('invoices', ['mydata_status', 'mydata_submitted_at'], {
    name: 'invoices_mydata_tracking_index'
  });
};

export const down = async (queryInterface, Sequelize) => {
  // Remove indexes
  await queryInterface.removeIndex('invoices', 'invoices_invoice_number_unique');
  await queryInterface.removeIndex('invoices', 'invoices_company_id_index');
  await queryInterface.removeIndex('invoices', 'invoices_issue_date_index');
  await queryInterface.removeIndex('invoices', 'invoices_due_date_index');
  await queryInterface.removeIndex('invoices', 'invoices_status_index');
  await queryInterface.removeIndex('invoices', 'invoices_type_index');
  await queryInterface.removeIndex('invoices', 'invoices_mydata_status_index');
  await queryInterface.removeIndex('invoices', 'invoices_created_by_index');
  await queryInterface.removeIndex('invoices', 'invoices_parent_invoice_id_index');
  await queryInterface.removeIndex('invoices', 'invoices_series_number_index');
  await queryInterface.removeIndex('invoices', 'invoices_status_due_date_index');
  await queryInterface.removeIndex('invoices', 'invoices_company_status_index');
  await queryInterface.removeIndex('invoices', 'invoices_mydata_tracking_index');
  
  // Drop table
  await queryInterface.dropTable('invoices');
};