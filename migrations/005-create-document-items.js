// migrations/005-create-document-items.js
// Migration for creating document items table (invoice lines, etc.)

export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('document_items', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
      comment: 'Primary key'
    },
    
    // Document reference
    documentId: {
      type: Sequelize.UUID,
      allowNull: false,
      field: 'document_id',
      references: {
        model: 'documents',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'Parent document'
    },
    
    // Line number
    lineNumber: {
      type: Sequelize.INTEGER,
      allowNull: false,
      field: 'line_number',
      comment: 'Line number/position'
    },
    
    // Item type
    itemType: {
      type: Sequelize.ENUM(
        'product',      // Προϊόν
        'service',      // Υπηρεσία
        'expense',      // Δαπάνη
        'discount',     // Έκπτωση
        'charge',       // Χρέωση
        'comment',      // Σχόλιο
        'subtotal'      // Υποσύνολο
      ),
      defaultValue: 'product',
      field: 'item_type',
      comment: 'Item type'
    },
    
    // Product/Service reference
    productId: {
      type: Sequelize.UUID,
      allowNull: true,
      field: 'product_id',
      comment: 'Product/Service ID (if applicable)'
    },
    
    productCode: {
      type: Sequelize.STRING(50),
      allowNull: true,
      field: 'product_code',
      comment: 'Product/Service code'
    },
    
    productName: {
      type: Sequelize.STRING(255),
      allowNull: true,
      field: 'product_name',
      comment: 'Product/Service name'
    },
    
    // SKU and Barcode
    sku: {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'Stock keeping unit'
    },
    
    barcode: {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'Product barcode'
    },
    
    // Description
    description: {
      type: Sequelize.TEXT,
      allowNull: false,
      comment: 'Item description'
    },
    
    longDescription: {
      type: Sequelize.TEXT,
      allowNull: true,
      field: 'long_description',
      comment: 'Detailed description'
    },
    
    // Quantity and units
    quantity: {
      type: Sequelize.DECIMAL(15, 4),
      defaultValue: 1,
      allowNull: false,
      comment: 'Quantity'
    },
    
    unit: {
      type: Sequelize.STRING(20),
      defaultValue: 'τεμ',
      comment: 'Unit of measure'
    },
    
    unitPrice: {
      type: Sequelize.DECIMAL(15, 4),
      defaultValue: 0,
      allowNull: false,
      field: 'unit_price',
      comment: 'Unit price (net)'
    },
    
    // Alternative units
    secondaryQuantity: {
      type: Sequelize.DECIMAL(15, 4),
      allowNull: true,
      field: 'secondary_quantity',
      comment: 'Secondary quantity'
    },
    
    secondaryUnit: {
      type: Sequelize.STRING(20),
      allowNull: true,
      field: 'secondary_unit',
      comment: 'Secondary unit'
    },
    
    conversionFactor: {
      type: Sequelize.DECIMAL(10, 6),
      defaultValue: 1,
      field: 'conversion_factor',
      comment: 'Conversion factor between units'
    },
    
    // Pricing
    listPrice: {
      type: Sequelize.DECIMAL(15, 4),
      allowNull: true,
      field: 'list_price',
      comment: 'List price before discounts'
    },
    
    cost: {
      type: Sequelize.DECIMAL(15, 4),
      allowNull: true,
      comment: 'Item cost'
    },
    
    margin: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Profit margin %'
    },
    
    // Discounts
    discountPercentage: {
      type: Sequelize.DECIMAL(5, 2),
      defaultValue: 0,
      field: 'discount_percentage',
      comment: 'Discount percentage'
    },
    
    discountAmount: {
      type: Sequelize.DECIMAL(15, 2),
      defaultValue: 0,
      field: 'discount_amount',
      comment: 'Discount amount'
    },
    
    discountReason: {
      type: Sequelize.STRING(255),
      allowNull: true,
      field: 'discount_reason',
      comment: 'Reason for discount'
    },
    
    // Tax
    taxRate: {
      type: Sequelize.DECIMAL(5, 2),
      defaultValue: 24,
      field: 'tax_rate',
      comment: 'VAT/Tax rate %'
    },
    
    taxCategory: {
      type: Sequelize.STRING(10),
      defaultValue: '1',
      field: 'tax_category',
      comment: 'Tax category code (myDATA)'
    },
    
    taxExempt: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      field: 'tax_exempt',
      comment: 'Tax exemption flag'
    },
    
    taxExemptReason: {
      type: Sequelize.STRING(255),
      allowNull: true,
      field: 'tax_exempt_reason',
      comment: 'Tax exemption reason'
    },
    
    // Amounts (calculated)
    subtotal: {
      type: Sequelize.DECIMAL(15, 2),
      defaultValue: 0,
      comment: 'Subtotal (quantity × unit price)'
    },
    
    netAmount: {
      type: Sequelize.DECIMAL(15, 2),
      defaultValue: 0,
      field: 'net_amount',
      comment: 'Net amount (subtotal - discount)'
    },
    
    taxAmount: {
      type: Sequelize.DECIMAL(15, 2),
      defaultValue: 0,
      field: 'tax_amount',
      comment: 'Tax amount'
    },
    
    totalAmount: {
      type: Sequelize.DECIMAL(15, 2),
      defaultValue: 0,
      field: 'total_amount',
      comment: 'Total amount (net + tax)'
    },
    
    // Withholding tax (for services)
    withholdingRate: {
      type: Sequelize.DECIMAL(5, 2),
      defaultValue: 0,
      field: 'withholding_rate',
      comment: 'Withholding tax rate %'
    },
    
    withholdingAmount: {
      type: Sequelize.DECIMAL(15, 2),
      defaultValue: 0,
      field: 'withholding_amount',
      comment: 'Withholding tax amount'
    },
    
    // Warehouse/Location
    warehouseId: {
      type: Sequelize.UUID,
      allowNull: true,
      field: 'warehouse_id',
      comment: 'Source warehouse'
    },
    
    warehouseCode: {
      type: Sequelize.STRING(20),
      allowNull: true,
      field: 'warehouse_code',
      comment: 'Warehouse code'
    },
    
    locationCode: {
      type: Sequelize.STRING(50),
      allowNull: true,
      field: 'location_code',
      comment: 'Storage location'
    },
    
    // Lot/Serial tracking
    lotNumber: {
      type: Sequelize.STRING(50),
      allowNull: true,
      field: 'lot_number',
      comment: 'Lot/Batch number'
    },
    
    serialNumbers: {
      type: Sequelize.JSON,
      defaultValue: [],
      field: 'serial_numbers',
      comment: 'Serial numbers array'
    },
    
    expiryDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
      field: 'expiry_date',
      comment: 'Product expiry date'
    },
    
    // Delivery
    deliveryDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
      field: 'delivery_date',
      comment: 'Expected delivery date'
    },
    
    deliveredQuantity: {
      type: Sequelize.DECIMAL(15, 4),
      defaultValue: 0,
      field: 'delivered_quantity',
      comment: 'Quantity delivered'
    },
    
    pendingQuantity: {
      type: Sequelize.DECIMAL(15, 4),
      defaultValue: 0,
      field: 'pending_quantity',
      comment: 'Quantity pending delivery'
    },
    
    // Returns
    returnedQuantity: {
      type: Sequelize.DECIMAL(15, 4),
      defaultValue: 0,
      field: 'returned_quantity',
      comment: 'Quantity returned'
    },
    
    returnReason: {
      type: Sequelize.STRING(255),
      allowNull: true,
      field: 'return_reason',
      comment: 'Return reason'
    },
    
    // Project/Cost center
    projectId: {
      type: Sequelize.UUID,
      allowNull: true,
      field: 'project_id',
      comment: 'Related project'
    },
    
    projectCode: {
      type: Sequelize.STRING(50),
      allowNull: true,
      field: 'project_code',
      comment: 'Project code'
    },
    
    costCenter: {
      type: Sequelize.STRING(50),
      allowNull: true,
      field: 'cost_center',
      comment: 'Cost center'
    },
    
    // Accounting
    accountCode: {
      type: Sequelize.STRING(20),
      allowNull: true,
      field: 'account_code',
      comment: 'GL account code'
    },
    
    incomeClassification: {
      type: Sequelize.STRING(50),
      allowNull: true,
      field: 'income_classification',
      comment: 'Income classification (myDATA E3)'
    },
    
    expenseClassification: {
      type: Sequelize.STRING(50),
      allowNull: true,
      field: 'expense_classification',
      comment: 'Expense classification (myDATA E3)'
    },
    
    // Dimensions
    weight: {
      type: Sequelize.DECIMAL(10, 3),
      allowNull: true,
      comment: 'Weight (kg)'
    },
    
    volume: {
      type: Sequelize.DECIMAL(10, 3),
      allowNull: true,
      comment: 'Volume (m³)'
    },
    
    length: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Length (cm)'
    },
    
    width: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Width (cm)'
    },
    
    height: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Height (cm)'
    },
    
    // Notes
    notes: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Item notes'
    },
    
    internalNotes: {
      type: Sequelize.TEXT,
      allowNull: true,
      field: 'internal_notes',
      comment: 'Internal notes'
    },
    
    // Custom fields
    customFields: {
      type: Sequelize.JSON,
      defaultValue: {},
      field: 'custom_fields',
      comment: 'Custom fields'
    },
    
    // Display options
    isPrinted: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      field: 'is_printed',
      comment: 'Print on document'
    },
    
    hidePrice: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      field: 'hide_price',
      comment: 'Hide price on printout'
    },
    
    hideAmount: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      field: 'hide_amount',
      comment: 'Hide amount on printout'
    },
    
    isOptional: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      field: 'is_optional',
      comment: 'Optional item flag'
    },
    
    // Sorting
    sortOrder: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      field: 'sort_order',
      comment: 'Custom sort order'
    },
    
    groupName: {
      type: Sequelize.STRING(100),
      allowNull: true,
      field: 'group_name',
      comment: 'Item grouping'
    },
    
    // References
    referenceType: {
      type: Sequelize.STRING(50),
      allowNull: true,
      field: 'reference_type',
      comment: 'Reference document type'
    },
    
    referenceId: {
      type: Sequelize.UUID,
      allowNull: true,
      field: 'reference_id',
      comment: 'Reference document item ID'
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
    }
  });
  
  // Create indexes
  await queryInterface.addIndex('document_items', ['document_id'], {
    name: 'document_items_document_index'
  });
  
  await queryInterface.addIndex('document_items', ['document_id', 'line_number'], {
    unique: true,
    name: 'document_items_document_line_unique'
  });
  
  await queryInterface.addIndex('document_items', ['product_id'], {
    name: 'document_items_product_index'
  });
  
  await queryInterface.addIndex('document_items', ['product_code'], {
    name: 'document_items_product_code_index'
  });
  
  await queryInterface.addIndex('document_items', ['item_type'], {
    name: 'document_items_type_index'
  });
  
  await queryInterface.addIndex('document_items', ['warehouse_id'], {
    name: 'document_items_warehouse_index'
  });
  
  await queryInterface.addIndex('document_items', ['project_id'], {
    name: 'document_items_project_index'
  });
  
  // Composite indexes
  await queryInterface.addIndex('document_items', ['document_id', 'item_type'], {
    name: 'document_items_document_type_index'
  });
  
  await queryInterface.addIndex('document_items', ['product_id', 'warehouse_id'], {
    name: 'document_items_product_warehouse_index'
  });
};

export const down = async (queryInterface, Sequelize) => {
  // Remove indexes
  await queryInterface.removeIndex('document_items', 'document_items_document_index');
  await queryInterface.removeIndex('document_items', 'document_items_document_line_unique');
  await queryInterface.removeIndex('document_items', 'document_items_product_index');
  await queryInterface.removeIndex('document_items', 'document_items_product_code_index');
  await queryInterface.removeIndex('document_items', 'document_items_type_index');
  await queryInterface.removeIndex('document_items', 'document_items_warehouse_index');
  await queryInterface.removeIndex('document_items', 'document_items_project_index');
  await queryInterface.removeIndex('document_items', 'document_items_document_type_index');
  await queryInterface.removeIndex('document_items', 'document_items_product_warehouse_index');
  
  // Drop table
  await queryInterface.dropTable('document_items');
};