// migrations/008-create-settings.js
// Migration for creating settings table

export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('settings', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
      comment: 'Primary key'
    },
    
    // Setting identification
    key: {
      type: Sequelize.STRING(100),
      allowNull: false,
      unique: true,
      comment: 'Setting key'
    },
    
    category: {
      type: Sequelize.STRING(50),
      allowNull: false,
      comment: 'Setting category'
    },
    
    subcategory: {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'Setting subcategory'
    },
    
    // Setting value
    value: {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Setting value (JSON)'
    },
    
    defaultValue: {
      type: Sequelize.JSON,
      allowNull: true,
      field: 'default_value',
      comment: 'Default value'
    },
    
    // Value type and validation
    dataType: {
      type: Sequelize.ENUM(
        'string',
        'number',
        'boolean',
        'date',
        'json',
        'array',
        'email',
        'url',
        'color',
        'file'
      ),
      defaultValue: 'string',
      field: 'data_type',
      comment: 'Data type'
    },
    
    validation: {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Validation rules'
    },
    
    options: {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Available options (for select fields)'
    },
    
    // Scope
    scope: {
      type: Sequelize.ENUM(
        'system',      // System-wide
        'company',     // Company-specific
        'branch',      // Branch-specific
        'user',        // User-specific
        'role',        // Role-specific
        'module'       // Module-specific
      ),
      defaultValue: 'system',
      comment: 'Setting scope'
    },
    
    scopeId: {
      type: Sequelize.STRING(100),
      allowNull: true,
      field: 'scope_id',
      comment: 'Scope entity ID'
    },
    
    // Metadata
    name: {
      type: Sequelize.STRING(100),
      allowNull: false,
      comment: 'Display name'
    },
    
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Setting description'
    },
    
    helpText: {
      type: Sequelize.TEXT,
      allowNull: true,
      field: 'help_text',
      comment: 'Help text for users'
    },
    
    // Access control
    isPublic: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      field: 'is_public',
      comment: 'Publicly accessible'
    },
    
    isReadonly: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      field: 'is_readonly',
      comment: 'Read-only setting'
    },
    
    isSystem: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      field: 'is_system',
      comment: 'System setting (cannot be deleted)'
    },
    
    isEncrypted: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      field: 'is_encrypted',
      comment: 'Value is encrypted'
    },
    
    isSensitive: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      field: 'is_sensitive',
      comment: 'Sensitive data (hide in logs)'
    },
    
    // Permissions
    viewPermission: {
      type: Sequelize.STRING(100),
      allowNull: true,
      field: 'view_permission',
      comment: 'Required permission to view'
    },
    
    editPermission: {
      type: Sequelize.STRING(100),
      allowNull: true,
      field: 'edit_permission',
      comment: 'Required permission to edit'
    },
    
    // UI configuration
    uiConfig: {
      type: Sequelize.JSON,
      defaultValue: {},
      field: 'ui_config',
      comment: 'UI configuration (input type, etc.)'
    },
    
    displayOrder: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      field: 'display_order',
      comment: 'Display order'
    },
    
    groupName: {
      type: Sequelize.STRING(100),
      allowNull: true,
      field: 'group_name',
      comment: 'Settings group'
    },
    
    icon: {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'Icon class/name'
    },
    
    // Dependencies
    dependencies: {
      type: Sequelize.JSON,
      defaultValue: [],
      comment: 'Dependent settings'
    },
    
    affects: {
      type: Sequelize.JSON,
      defaultValue: [],
      comment: 'Settings affected by this'
    },
    
    // Versioning
    version: {
      type: Sequelize.INTEGER,
      defaultValue: 1,
      comment: 'Setting version'
    },
    
    previousValue: {
      type: Sequelize.JSON,
      allowNull: true,
      field: 'previous_value',
      comment: 'Previous value'
    },
    
    // Cache control
    cacheable: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      comment: 'Can be cached'
    },
    
    cacheTime: {
      type: Sequelize.INTEGER,
      defaultValue: 3600,
      field: 'cache_time',
      comment: 'Cache duration in seconds'
    },
    
    // Change tracking
    lastModifiedBy: {
      type: Sequelize.UUID,
      allowNull: true,
      field: 'last_modified_by',
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Last modified by user'
    },
    
    lastModifiedAt: {
      type: Sequelize.DATE,
      allowNull: true,
      field: 'last_modified_at',
      comment: 'Last modification timestamp'
    },
    
    // Effective dates
    effectiveFrom: {
      type: Sequelize.DATE,
      allowNull: true,
      field: 'effective_from',
      comment: 'Setting effective from'
    },
    
    effectiveTo: {
      type: Sequelize.DATE,
      allowNull: true,
      field: 'effective_to',
      comment: 'Setting effective until'
    },
    
    // Status
    isActive: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
      comment: 'Active status'
    },
    
    // Audit
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
  
  // Create setting history table
  await queryInterface.createTable('setting_histories', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    
    settingId: {
      type: Sequelize.UUID,
      allowNull: false,
      field: 'setting_id',
      references: {
        model: 'settings',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    
    key: {
      type: Sequelize.STRING(100),
      allowNull: false
    },
    
    oldValue: {
      type: Sequelize.JSON,
      allowNull: true,
      field: 'old_value'
    },
    
    newValue: {
      type: Sequelize.JSON,
      allowNull: true,
      field: 'new_value'
    },
    
    changedBy: {
      type: Sequelize.UUID,
      allowNull: true,
      field: 'changed_by',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    
    changeReason: {
      type: Sequelize.TEXT,
      allowNull: true,
      field: 'change_reason'
    },
    
    ipAddress: {
      type: Sequelize.STRING(45),
      allowNull: true,
      field: 'ip_address'
    },
    
    userAgent: {
      type: Sequelize.TEXT,
      allowNull: true,
      field: 'user_agent'
    },
    
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
      field: 'created_at',
      defaultValue: Sequelize.NOW
    }
  });
  
  // Create indexes for settings
  await queryInterface.addIndex('settings', ['key'], {
    unique: true,
    name: 'settings_key_unique'
  });
  
  await queryInterface.addIndex('settings', ['category'], {
    name: 'settings_category_index'
  });
  
  await queryInterface.addIndex('settings', ['category', 'subcategory'], {
    name: 'settings_category_sub_index'
  });
  
  await queryInterface.addIndex('settings', ['scope'], {
    name: 'settings_scope_index'
  });
  
  await queryInterface.addIndex('settings', ['scope', 'scope_id'], {
    name: 'settings_scope_id_index'
  });
  
  await queryInterface.addIndex('settings', ['is_active'], {
    name: 'settings_active_index'
  });
  
  await queryInterface.addIndex('settings', ['is_public'], {
    name: 'settings_public_index'
  });
  
  // Indexes for setting histories
  await queryInterface.addIndex('setting_histories', ['setting_id'], {
    name: 'histories_setting_index'
  });
  
  await queryInterface.addIndex('setting_histories', ['key'], {
    name: 'histories_key_index'
  });
  
  await queryInterface.addIndex('setting_histories', ['changed_by'], {
    name: 'histories_user_index'
  });
  
  await queryInterface.addIndex('setting_histories', ['created_at'], {
    name: 'histories_created_index'
  });
  
  // Insert default system settings
  const defaultSettings = [
    // Company Settings
    {
      id: Sequelize.UUIDV4,
      key: 'company.name',
      category: 'company',
      subcategory: 'general',
      name: 'Επωνυμία Εταιρίας',
      value: JSON.stringify('BizFlow ERP'),
      data_type: 'string',
      scope: 'system',
      is_system: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: Sequelize.UUIDV4,
      key: 'company.vat_number',
      category: 'company',
      subcategory: 'general',
      name: 'ΑΦΜ',
      value: JSON.stringify(''),
      data_type: 'string',
      scope: 'system',
      validation: JSON.stringify({ pattern: '^[0-9]{9}$' }),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: Sequelize.UUIDV4,
      key: 'company.tax_office',
      category: 'company',
      subcategory: 'general',
      name: 'ΔΟΥ',
      value: JSON.stringify(''),
      data_type: 'string',
      scope: 'system',
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // System Settings
    {
      id: Sequelize.UUIDV4,
      key: 'system.timezone',
      category: 'system',
      subcategory: 'regional',
      name: 'Ζώνη Ώρας',
      value: JSON.stringify('Europe/Athens'),
      default_value: JSON.stringify('Europe/Athens'),
      data_type: 'string',
      scope: 'system',
      is_system: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: Sequelize.UUIDV4,
      key: 'system.date_format',
      category: 'system',
      subcategory: 'regional',
      name: 'Μορφή Ημερομηνίας',
      value: JSON.stringify('DD/MM/YYYY'),
      default_value: JSON.stringify('DD/MM/YYYY'),
      data_type: 'string',
      scope: 'system',
      options: JSON.stringify(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: Sequelize.UUIDV4,
      key: 'system.currency',
      category: 'system',
      subcategory: 'regional',
      name: 'Νόμισμα',
      value: JSON.stringify('EUR'),
      default_value: JSON.stringify('EUR'),
      data_type: 'string',
      scope: 'system',
      is_system: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: Sequelize.UUIDV4,
      key: 'system.language',
      category: 'system',
      subcategory: 'regional',
      name: 'Γλώσσα',
      value: JSON.stringify('el'),
      default_value: JSON.stringify('el'),
      data_type: 'string',
      scope: 'system',
      options: JSON.stringify(['el', 'en']),
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // Email Settings
    {
      id: Sequelize.UUIDV4,
      key: 'email.smtp_host',
      category: 'email',
      subcategory: 'smtp',
      name: 'SMTP Server',
      value: JSON.stringify('smtp.gmail.com'),
      data_type: 'string',
      scope: 'system',
      is_encrypted: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: Sequelize.UUIDV4,
      key: 'email.smtp_port',
      category: 'email',
      subcategory: 'smtp',
      name: 'SMTP Port',
      value: JSON.stringify(587),
      data_type: 'number',
      scope: 'system',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: Sequelize.UUIDV4,
      key: 'email.smtp_secure',
      category: 'email',
      subcategory: 'smtp',
      name: 'SMTP Security',
      value: JSON.stringify(true),
      data_type: 'boolean',
      scope: 'system',
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // Invoice Settings
    {
      id: Sequelize.UUIDV4,
      key: 'invoice.number_format',
      category: 'invoice',
      subcategory: 'numbering',
      name: 'Μορφή Αρίθμησης Τιμολογίων',
      value: JSON.stringify('INV-{YEAR}-{NUMBER:5}'),
      default_value: JSON.stringify('INV-{YEAR}-{NUMBER:5}'),
      data_type: 'string',
      scope: 'system',
      help_text: 'Χρησιμοποιήστε {YEAR} για έτος, {MONTH} για μήνα, {NUMBER:5} για αύξοντα αριθμό με 5 ψηφία',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: Sequelize.UUIDV4,
      key: 'invoice.default_payment_terms',
      category: 'invoice',
      subcategory: 'defaults',
      name: 'Προεπιλεγμένοι Όροι Πληρωμής',
      value: JSON.stringify(30),
      default_value: JSON.stringify(30),
      data_type: 'number',
      scope: 'system',
      validation: JSON.stringify({ min: 0, max: 365 }),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: Sequelize.UUIDV4,
      key: 'invoice.default_vat_rate',
      category: 'invoice',
      subcategory: 'defaults',
      name: 'Προεπιλεγμένος Συντελεστής ΦΠΑ',
      value: JSON.stringify(24),
      default_value: JSON.stringify(24),
      data_type: 'number',
      scope: 'system',
      options: JSON.stringify([0, 6, 13, 24]),
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // Security Settings
    {
      id: Sequelize.UUIDV4,
      key: 'security.password_min_length',
      category: 'security',
      subcategory: 'password',
      name: 'Ελάχιστο Μήκος Κωδικού',
      value: JSON.stringify(8),
      default_value: JSON.stringify(8),
      data_type: 'number',
      scope: 'system',
      is_system: true,
      validation: JSON.stringify({ min: 6, max: 32 }),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: Sequelize.UUIDV4,
      key: 'security.session_timeout',
      category: 'security',
      subcategory: 'session',
      name: 'Timeout Συνεδρίας (λεπτά)',
      value: JSON.stringify(60),
      default_value: JSON.stringify(60),
      data_type: 'number',
      scope: 'system',
      validation: JSON.stringify({ min: 5, max: 1440 }),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: Sequelize.UUIDV4,
      key: 'security.two_factor_enabled',
      category: 'security',
      subcategory: 'authentication',
      name: 'Ενεργοποίηση 2FA',
      value: JSON.stringify(false),
      default_value: JSON.stringify(false),
      data_type: 'boolean',
      scope: 'system',
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // Backup Settings
    {
      id: Sequelize.UUIDV4,
      key: 'backup.auto_backup',
      category: 'backup',
      subcategory: 'schedule',
      name: 'Αυτόματα Αντίγραφα Ασφαλείας',
      value: JSON.stringify(true),
      default_value: JSON.stringify(true),
      data_type: 'boolean',
      scope: 'system',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: Sequelize.UUIDV4,
      key: 'backup.schedule',
      category: 'backup',
      subcategory: 'schedule',
      name: 'Πρόγραμμα Backup',
      value: JSON.stringify('0 2 * * *'),
      default_value: JSON.stringify('0 2 * * *'),
      data_type: 'string',
      scope: 'system',
      help_text: 'Cron expression για προγραμματισμό backup',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: Sequelize.UUIDV4,
      key: 'backup.retention_days',
      category: 'backup',
      subcategory: 'retention',
      name: 'Διατήρηση Backup (ημέρες)',
      value: JSON.stringify(30),
      default_value: JSON.stringify(30),
      data_type: 'number',
      scope: 'system',
      validation: JSON.stringify({ min: 1, max: 365 }),
      created_at: new Date(),
      updated_at: new Date()
    },
    
    // myDATA Settings
    {
      id: Sequelize.UUIDV4,
      key: 'mydata.enabled',
      category: 'mydata',
      subcategory: 'general',
      name: 'Ενεργοποίηση myDATA',
      value: JSON.stringify(false),
      default_value: JSON.stringify(false),
      data_type: 'boolean',
      scope: 'system',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: Sequelize.UUIDV4,
      key: 'mydata.environment',
      category: 'mydata',
      subcategory: 'general',
      name: 'Περιβάλλον myDATA',
      value: JSON.stringify('test'),
      default_value: JSON.stringify('test'),
      data_type: 'string',
      scope: 'system',
      options: JSON.stringify(['test', 'production']),
      created_at: new Date(),
      updated_at: new Date()
    }
  ];
  
  await queryInterface.bulkInsert('settings', defaultSettings, {});
};

export const down = async (queryInterface, Sequelize) => {
  // Remove setting histories indexes
  await queryInterface.removeIndex('setting_histories', 'histories_setting_index');
  await queryInterface.removeIndex('setting_histories', 'histories_key_index');
  await queryInterface.removeIndex('setting_histories', 'histories_user_index');
  await queryInterface.removeIndex('setting_histories', 'histories_created_index');
  
  // Remove settings indexes
  await queryInterface.removeIndex('settings', 'settings_key_unique');
  await queryInterface.removeIndex('settings', 'settings_category_index');
  await queryInterface.removeIndex('settings', 'settings_category_sub_index');
  await queryInterface.removeIndex('settings', 'settings_scope_index');
  await queryInterface.removeIndex('settings', 'settings_scope_id_index');
  await queryInterface.removeIndex('settings', 'settings_active_index');
  await queryInterface.removeIndex('settings', 'settings_public_index');
  
  // Drop tables
  await queryInterface.dropTable('setting_histories');
  await queryInterface.dropTable('settings');
};