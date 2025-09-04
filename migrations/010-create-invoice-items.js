// migrations/010-create-invoice-items.js
// Migration for creating invoice_items table

export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('invoice_items', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
      comment: 'Primary key'
    },
    
    // Invoice reference
    invoice_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'invoices',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      comment: 'Invoice reference'
    },
    
    // Product information
    product_code: {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'Product/Service code'
    },
    
    description: {
      type: Sequelize.TEXT,
      allowNull: false,
      comment: 'Product/Service description'
    },
    
    // Quantity and units
    quantity: {
      type: Sequelize.DECIMAL(15, 4),
      allowNull: false,
      defaultValue: 1,
      comment: 'Quantity'
    },
    
    unit: {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'τεμ',
      comment: 'Unit of measure'
    },
    
    // Pricing
    unit_price: {
      type: Sequelize.DECIMAL(15, 4),
      allowNull: false,
      comment: 'Unit price before VAT'
    },
    
    total_price: {
      type: Sequelize.DECIMAL(15, 4),
      allowNull: false,
      comment: 'Total price before VAT (quantity * unitPrice)'
    },
    
    // Discount
    discount_percent: {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Line discount percentage'
    },
    
    discount_amount: {
      type: Sequelize.DECIMAL(15, 4),
      allowNull: false,
      defaultValue: 0,
      comment: 'Line discount amount'
    },
    
    // VAT information
    vat_rate: {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      comment: 'VAT rate percentage (24, 13, 6, 0)'
    },
    
    vat_amount: {
      type: Sequelize.DECIMAL(15, 4),
      allowNull: false,
      comment: 'VAT amount'
    },
    
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
    
    // Final amounts
    net_amount: {
      type: Sequelize.DECIMAL(15, 4),
      allowNull: false,
      comment: 'Net amount after discount, before VAT'
    },
    
    total_amount: {
      type: Sequelize.DECIMAL(15, 4),
      allowNull: false,
      comment: 'Total amount including VAT'
    },
    
    // Greek tax compliance
    vat_exemption_reason: {
      type: Sequelize.STRING(200),
      allowNull: true,
      comment: 'VAT exemption reason (when vatCategory is exempt)'
    },
    
    // MyData integration
    income_classification: {
      type: Sequelize.ENUM(
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
      comment: 'MyData income classification'
    },
    
    vat_exception_category: {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'VAT exception category for MyData'
    },
    
    // Additional information
    notes: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Line item notes'
    },
    
    // Sorting
    sort_order: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Sort order within invoice'
    },
    
    // Metadata
    metadata: {
      type: Sequelize.JSONB,
      defaultValue: {},
      comment: 'Additional metadata'
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
    }
  });
  
  // Create indexes for performance
  await queryInterface.addIndex('invoice_items', ['invoice_id'], {
    name: 'invoice_items_invoice_id_index'
  });
  
  await queryInterface.addIndex('invoice_items', ['product_code'], {
    name: 'invoice_items_product_code_index'
  });
  
  await queryInterface.addIndex('invoice_items', ['vat_category'], {
    name: 'invoice_items_vat_category_index'
  });
  
  await queryInterface.addIndex('invoice_items', ['income_classification'], {
    name: 'invoice_items_income_classification_index'
  });
  
  // Composite indexes
  await queryInterface.addIndex('invoice_items', ['invoice_id', 'sort_order'], {
    name: 'invoice_items_invoice_sort_index'
  });
  
  await queryInterface.addIndex('invoice_items', ['vat_category', 'vat_rate'], {
    name: 'invoice_items_vat_tracking_index'
  });
};

export const down = async (queryInterface, Sequelize) => {
  // Remove indexes
  await queryInterface.removeIndex('invoice_items', 'invoice_items_invoice_id_index');
  await queryInterface.removeIndex('invoice_items', 'invoice_items_product_code_index');
  await queryInterface.removeIndex('invoice_items', 'invoice_items_vat_category_index');
  await queryInterface.removeIndex('invoice_items', 'invoice_items_income_classification_index');
  await queryInterface.removeIndex('invoice_items', 'invoice_items_invoice_sort_index');
  await queryInterface.removeIndex('invoice_items', 'invoice_items_vat_tracking_index');
  
  // Drop table
  await queryInterface.dropTable('invoice_items');
};