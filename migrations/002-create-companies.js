// migrations/002-create-companies.js
// Migration for creating companies table

export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('companies', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
      comment: 'Primary key'
    },
    
    // Basic information
    code: {
      type: Sequelize.STRING(20),
      allowNull: false,
      unique: true,
      comment: 'Company code'
    },
    
    name: {
      type: Sequelize.STRING(255),
      allowNull: false,
      comment: 'Company name'
    },
    
    legalName: {
      type: Sequelize.STRING(255),
      allowNull: true,
      field: 'legal_name',
      comment: 'Legal company name'
    },
    
    tradeName: {
      type: Sequelize.STRING(255),
      allowNull: true,
      field: 'trade_name',
      comment: 'Trade name'
    },
    
    // Tax information
    vatNumber: {
      type: Sequelize.STRING(20),
      allowNull: true,
      unique: true,
      field: 'vat_number',
      comment: 'VAT/AFM number'
    },
    
    taxOffice: {
      type: Sequelize.STRING(100),
      allowNull: true,
      field: 'tax_office',
      comment: 'Tax office (ΔΟΥ)'
    },
    
    registrationNumber: {
      type: Sequelize.STRING(50),
      allowNull: true,
      field: 'registration_number',
      comment: 'Business registration number'
    },
    
    // Company type and category
    companyType: {
      type: Sequelize.ENUM('client', 'supplier', 'both'),
      defaultValue: 'client',
      allowNull: false,
      field: 'company_type',
      comment: 'Company type'
    },
    
    legalForm: {
      type: Sequelize.STRING(50),
      allowNull: true,
      field: 'legal_form',
      comment: 'Legal form (ΑΕ, ΕΠΕ, ΟΕ, etc.)'
    },
    
    category: {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'Business category'
    },
    
    industryCode: {
      type: Sequelize.STRING(20),
      allowNull: true,
      field: 'industry_code',
      comment: 'Industry code (ΚΑΔ)'
    },
    
    // Contact information
    email: {
      type: Sequelize.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true
      },
      comment: 'Primary email'
    },
    
    emailSecondary: {
      type: Sequelize.STRING(255),
      allowNull: true,
      field: 'email_secondary',
      validate: {
        isEmail: true
      },
      comment: 'Secondary email'
    },
    
    phone: {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: 'Primary phone'
    },
    
    phoneSecondary: {
      type: Sequelize.STRING(20),
      allowNull: true,
      field: 'phone_secondary',
      comment: 'Secondary phone'
    },
    
    mobile: {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: 'Mobile phone'
    },
    
    fax: {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: 'Fax number'
    },
    
    website: {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Company website'
    },
    
    // Address
    address: {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Street address'
    },
    
    city: {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'City'
    },
    
    region: {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Region/State'
    },
    
    postalCode: {
      type: Sequelize.STRING(10),
      allowNull: true,
      field: 'postal_code',
      comment: 'Postal code'
    },
    
    country: {
      type: Sequelize.STRING(2),
      defaultValue: 'GR',
      comment: 'Country code (ISO)'
    },
    
    // Billing address (if different)
    billingAddress: {
      type: Sequelize.STRING(255),
      allowNull: true,
      field: 'billing_address',
      comment: 'Billing address'
    },
    
    billingCity: {
      type: Sequelize.STRING(100),
      allowNull: true,
      field: 'billing_city',
      comment: 'Billing city'
    },
    
    billingPostalCode: {
      type: Sequelize.STRING(10),
      allowNull: true,
      field: 'billing_postal_code',
      comment: 'Billing postal code'
    },
    
    // Financial information
    creditLimit: {
      type: Sequelize.DECIMAL(15, 2),
      defaultValue: 0,
      field: 'credit_limit',
      comment: 'Credit limit'
    },
    
    balance: {
      type: Sequelize.DECIMAL(15, 2),
      defaultValue: 0,
      comment: 'Current balance'
    },
    
    openBalance: {
      type: Sequelize.DECIMAL(15, 2),
      defaultValue: 0,
      field: 'open_balance',
      comment: 'Opening balance'
    },
    
    turnover: {
      type: Sequelize.DECIMAL(15, 2),
      defaultValue: 0,
      comment: 'Annual turnover'
    },
    
    discount: {
      type: Sequelize.DECIMAL(5, 2),
      defaultValue: 0,
      comment: 'Default discount %'
    },
    
    paymentTerms: {
      type: Sequelize.INTEGER,
      defaultValue: 30,
      field: 'payment_terms',
      comment: 'Payment terms (days)'
    },
    
    paymentMethod: {
      type: Sequelize.STRING(50),
      allowNull: true,
      field: 'payment_method',
      comment: 'Preferred payment method'
    },
    
    // Banking information
    bankName: {
      type: Sequelize.STRING(100),
      allowNull: true,
      field: 'bank_name',
      comment: 'Bank name'
    },
    
    bankBranch: {
      type: Sequelize.STRING(100),
      allowNull: true,
      field: 'bank_branch',
      comment: 'Bank branch'
    },
    
    bankAccount: {
      type: Sequelize.STRING(50),
      allowNull: true,
      field: 'bank_account',
      comment: 'Bank account number'
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
    
    // Contact person
    contactPerson: {
      type: Sequelize.STRING(200),
      allowNull: true,
      field: 'contact_person',
      comment: 'Primary contact person'
    },
    
    contactTitle: {
      type: Sequelize.STRING(100),
      allowNull: true,
      field: 'contact_title',
      comment: 'Contact person title'
    },
    
    contactEmail: {
      type: Sequelize.STRING(255),
      allowNull: true,
      field: 'contact_email',
      comment: 'Contact person email'
    },
    
    contactPhone: {
      type: Sequelize.STRING(20),
      allowNull: true,
      field: 'contact_phone',
      comment: 'Contact person phone'
    },
    
    // Rating and classification
    rating: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      comment: 'Company rating (1-5)'
    },
    
    creditRating: {
      type: Sequelize.STRING(10),
      allowNull: true,
      field: 'credit_rating',
      comment: 'Credit rating (AAA-D)'
    },
    
    priceList: {
      type: Sequelize.STRING(50),
      allowNull: true,
      field: 'price_list',
      comment: 'Assigned price list'
    },
    
    // Status and flags
    status: {
      type: Sequelize.ENUM('active', 'inactive', 'blocked', 'pending'),
      defaultValue: 'active',
      comment: 'Company status'
    },
    
    isActive: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
      comment: 'Active status'
    },
    
    isVerified: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      field: 'is_verified',
      comment: 'Verification status'
    },
    
    isTaxExempt: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      field: 'is_tax_exempt',
      comment: 'Tax exemption status'
    },
    
    blacklisted: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      comment: 'Blacklist status'
    },
    
    // Notes and metadata
    notes: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Internal notes'
    },
    
    tags: {
      type: Sequelize.JSON,
      defaultValue: [],
      comment: 'Tags for categorization'
    },
    
    customFields: {
      type: Sequelize.JSON,
      defaultValue: {},
      field: 'custom_fields',
      comment: 'Custom fields'
    },
    
    // Relationships
    parentCompanyId: {
      type: Sequelize.UUID,
      allowNull: true,
      field: 'parent_company_id',
      references: {
        model: 'companies',
        key: 'id'
      },
      comment: 'Parent company (for subsidiaries)'
    },
    
    salesRepId: {
      type: Sequelize.UUID,
      allowNull: true,
      field: 'sales_rep_id',
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Assigned sales representative'
    },
    
    // Timestamps
    lastOrderDate: {
      type: Sequelize.DATE,
      allowNull: true,
      field: 'last_order_date',
      comment: 'Last order date'
    },
    
    lastPaymentDate: {
      type: Sequelize.DATE,
      allowNull: true,
      field: 'last_payment_date',
      comment: 'Last payment date'
    },
    
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
      comment: 'Last updated by user'
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
    },
    
    deletedAt: {
      type: Sequelize.DATE,
      allowNull: true,
      field: 'deleted_at',
      comment: 'Soft delete timestamp'
    }
  });
  
  // Create indexes
  await queryInterface.addIndex('companies', ['code'], {
    unique: true,
    name: 'companies_code_unique'
  });
  
  await queryInterface.addIndex('companies', ['vat_number'], {
    unique: true,
    where: { vat_number: { [Sequelize.Op.ne]: null } },
    name: 'companies_vat_number_unique'
  });
  
  await queryInterface.addIndex('companies', ['name'], {
    name: 'companies_name_index'
  });
  
  await queryInterface.addIndex('companies', ['company_type'], {
    name: 'companies_type_index'
  });
  
  await queryInterface.addIndex('companies', ['status'], {
    name: 'companies_status_index'
  });
  
  await queryInterface.addIndex('companies', ['is_active'], {
    name: 'companies_is_active_index'
  });
  
  await queryInterface.addIndex('companies', ['created_at'], {
    name: 'companies_created_at_index'
  });
  
  await queryInterface.addIndex('companies', ['parent_company_id'], {
    name: 'companies_parent_id_index'
  });
  
  await queryInterface.addIndex('companies', ['sales_rep_id'], {
    name: 'companies_sales_rep_index'
  });
  
  // Composite indexes
  await queryInterface.addIndex('companies', ['company_type', 'is_active'], {
    name: 'companies_type_active_index'
  });
  
  await queryInterface.addIndex('companies', ['city', 'country'], {
    name: 'companies_location_index'
  });
  
  // Full-text search index (if PostgreSQL)
  if (queryInterface.sequelize.options.dialect === 'postgres') {
    await queryInterface.sequelize.query(`
      CREATE INDEX companies_search_index ON companies 
      USING gin(to_tsvector('simple', coalesce(name, '') || ' ' || 
                                       coalesce(legal_name, '') || ' ' || 
                                       coalesce(vat_number, '') || ' ' || 
                                       coalesce(email, '')))
    `);
  }
};

export const down = async (queryInterface, Sequelize) => {
  // Remove full-text index if PostgreSQL
  if (queryInterface.sequelize.options.dialect === 'postgres') {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS companies_search_index');
  }
  
  // Remove indexes
  await queryInterface.removeIndex('companies', 'companies_code_unique');
  await queryInterface.removeIndex('companies', 'companies_vat_number_unique');
  await queryInterface.removeIndex('companies', 'companies_name_index');
  await queryInterface.removeIndex('companies', 'companies_type_index');
  await queryInterface.removeIndex('companies', 'companies_status_index');
  await queryInterface.removeIndex('companies', 'companies_is_active_index');
  await queryInterface.removeIndex('companies', 'companies_created_at_index');
  await queryInterface.removeIndex('companies', 'companies_parent_id_index');
  await queryInterface.removeIndex('companies', 'companies_sales_rep_index');
  await queryInterface.removeIndex('companies', 'companies_type_active_index');
  await queryInterface.removeIndex('companies', 'companies_location_index');
  
  // Drop table
  await queryInterface.dropTable('companies');
};