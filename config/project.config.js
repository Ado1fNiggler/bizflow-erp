// project.config.js
// Unified Configuration for Πρόγραμμα Λαχαναγοράς (Vegetable Market Software)
// This file ensures consistency across all project files

export const PROJECT_CONFIG = {
  // ========================================
  // PROJECT IDENTITY
  // ========================================
  name: 'VegeMarket Pro',
  fullName: 'Πρόγραμμα Λαχαναγοράς - Vegetable Market Management System',
  version: '2.0.0',
  description: 'Σύγχρονο λογισμικό διαχείρισης για καταστήματα εμπορίου οπωρολαχανικών',
  company: 'Θεσσαλονίκη Λαχαναγορά',
  
  // ========================================
  // TECHNOLOGY STACK (FINAL DECISION)
  // ========================================
  stack: {
    backend: {
      framework: 'Node.js with Express.js',
      language: 'JavaScript (ES6+)',
      database: 'PostgreSQL 15+',
      orm: 'Sequelize v6',
      authentication: 'JWT with refresh tokens',
      validation: 'express-validator',
      fileStorage: 'local + S3 compatible',
      email: 'nodemailer',
      pdf: 'puppeteer + pdfkit',
      cache: 'Redis (optional)',
      queue: 'Bull (optional)'
    },
    frontend: {
      framework: 'React 18+',
      language: 'JavaScript/JSX',
      stateManagement: 'Redux Toolkit',
      ui: 'Material-UI v5',
      forms: 'react-hook-form',
      charts: 'recharts',
      http: 'axios'
    }
  },

  // ========================================
  // NAMING CONVENTIONS
  // ========================================
  naming: {
    // File naming
    models: 'PascalCase',       // User.js, Product.js
    controllers: 'camelCase',    // userController.js
    routes: 'camelCase',         // userRoutes.js
    middleware: 'camelCase',     // auth.js, validation.js
    services: 'camelCase',       // emailService.js
    utils: 'camelCase',          // validators.js
    config: 'camelCase',         // database.js
    migrations: 'kebab-case',    // 001-create-users.js
    
    // Database naming
    tables: 'PascalCase',        // Users, Products, Invoices
    columns: 'camelCase',        // firstName, createdAt
    indexes: 'snake_case',       // users_email_index
    constraints: 'snake_case',   // users_company_id_fkey
    
    // API naming
    endpoints: 'kebab-case',     // /api/product-categories
    queryParams: 'camelCase',   // ?sortBy=name&filterBy=active
    requestBody: 'camelCase',   // { firstName, lastName }
    responseBody: 'camelCase'   // { userId, createdAt }
  },

  // ========================================
  // BUSINESS DOMAIN (VEGETABLE MARKET SPECIFIC)
  // ========================================
  domain: {
    businessType: 'Εμπόριο Οπωρολαχανικών',
    mainEntities: [
      'Products',      // Προϊόντα (φρούτα, λαχανικά)
      'Suppliers',     // Προμηθευτές (παραγωγοί, εισαγωγείς)
      'Customers',     // Πελάτες (λιανική, χονδρική)
      'Invoices',      // Τιμολόγια
      'Orders',        // Παραγγελίες
      'Inventory',     // Απόθεμα
      'PriceLists',    // Τιμοκατάλογοι
      'Deliveries'     // Παραδόσεις
    ],
    
    // Product categories specific to vegetable market
    productCategories: [
      { code: 'FRUIT', name: 'Φρούτα', nameEn: 'Fruits' },
      { code: 'VEG', name: 'Λαχανικά', nameEn: 'Vegetables' },
      { code: 'HERB', name: 'Αρωματικά', nameEn: 'Herbs' },
      { code: 'EXOTIC', name: 'Εξωτικά', nameEn: 'Exotic' },
      { code: 'ORGANIC', name: 'Βιολογικά', nameEn: 'Organic' },
      { code: 'IMPORT', name: 'Εισαγωγής', nameEn: 'Imported' },
      { code: 'LOCAL', name: 'Εγχώρια', nameEn: 'Local' }
    ],
    
    // Units of measurement
    units: [
      { code: 'KG', name: 'Κιλά', nameEn: 'Kilograms' },
      { code: 'PC', name: 'Τεμάχια', nameEn: 'Pieces' },
      { code: 'BOX', name: 'Κιβώτια', nameEn: 'Boxes' },
      { code: 'CRATE', name: 'Τελάρα', nameEn: 'Crates' },
      { code: 'BUNCH', name: 'Ματσάκια', nameEn: 'Bunches' },
      { code: 'BAG', name: 'Σακιά', nameEn: 'Bags' },
      { code: 'NET', name: 'Δίχτυα', nameEn: 'Nets' }
    ],
    
    // Quality grades
    qualityGrades: [
      { code: 'EXTRA', name: 'Έξτρα', color: '#4CAF50' },
      { code: 'A', name: 'Α\' Ποιότητα', color: '#8BC34A' },
      { code: 'B', name: 'Β\' Ποιότητα', color: '#FFC107' },
      { code: 'C', name: 'Γ\' Ποιότητα', color: '#FF9800' }
    ]
  },

  // ========================================
  // DATABASE SCHEMA STRUCTURE
  // ========================================
  database: {
    name: 'vegemarket_db',
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
    
    // Core tables
    tables: {
      // Users & Authentication
      users: 'Users',
      refreshTokens: 'RefreshTokens',
      sessions: 'Sessions',
      
      // Business Entities
      companies: 'Companies',
      products: 'Products',
      productCategories: 'ProductCategories',
      productPrices: 'ProductPrices',
      suppliers: 'Suppliers',
      customers: 'Customers',
      
      // Transactions
      invoices: 'Invoices',
      invoiceItems: 'InvoiceItems',
      orders: 'Orders',
      orderItems: 'OrderItems',
      deliveries: 'Deliveries',
      deliveryItems: 'DeliveryItems',
      payments: 'Payments',
      
      // Inventory
      inventory: 'Inventory',
      inventoryMovements: 'InventoryMovements',
      wastage: 'Wastage',
      
      // Financial
      cashRegister: 'CashRegister',
      expenses: 'Expenses',
      
      // System
      auditLogs: 'AuditLogs',
      settings: 'Settings',
      notifications: 'Notifications'
    }
  },

  // ========================================
  // API STRUCTURE
  // ========================================
  api: {
    version: 'v1',
    prefix: '/api/v1',
    
    endpoints: {
      // Authentication
      auth: '/auth',
      login: '/auth/login',
      logout: '/auth/logout',
      refresh: '/auth/refresh',
      
      // Products
      products: '/products',
      productCategories: '/product-categories',
      productPrices: '/product-prices',
      
      // Business Partners
      suppliers: '/suppliers',
      customers: '/customers',
      
      // Transactions
      invoices: '/invoices',
      orders: '/orders',
      deliveries: '/deliveries',
      payments: '/payments',
      
      // Inventory
      inventory: '/inventory',
      inventoryMovements: '/inventory/movements',
      wastage: '/wastage',
      
      // Reports
      reports: '/reports',
      dailyReport: '/reports/daily',
      salesReport: '/reports/sales',
      inventoryReport: '/reports/inventory',
      
      // System
      settings: '/settings',
      users: '/users',
      auditLogs: '/audit-logs'
    }
  },

  // ========================================
  // GREEK BUSINESS REQUIREMENTS
  // ========================================
  greekBusiness: {
    mydata: {
      enabled: true,
      apiUrl: 'https://mydata.aade.gr/api',
      testUrl: 'https://mydata-dev.azure-api.net'
    },
    
    taxRates: [
      { code: 'NORMAL', rate: 24, name: 'Κανονικός ΦΠΑ' },
      { code: 'REDUCED', rate: 13, name: 'Μειωμένος ΦΠΑ' },
      { code: 'SUPER_REDUCED', rate: 6, name: 'Υπερμειωμένος ΦΠΑ' },
      { code: 'EXEMPT', rate: 0, name: 'Απαλλαγή ΦΠΑ' }
    ],
    
    documentTypes: [
      { code: '1.1', name: 'Τιμολόγιο Πώλησης' },
      { code: '1.2', name: 'Τιμολόγιο Παροχής Υπηρεσιών' },
      { code: '2.1', name: 'Τιμολόγιο Αγοράς' },
      { code: '5.1', name: 'Απόδειξη Λιανικής' },
      { code: '5.2', name: 'Απλοποιημένο Τιμολόγιο' },
      { code: '11.1', name: 'ΑΛΠ' },
      { code: '11.2', name: 'ΑΠΥ' }
    ]
  },

  // ========================================
  // SECURITY CONFIGURATION
  // ========================================
  security: {
    jwt: {
      accessTokenExpiry: '15m',
      refreshTokenExpiry: '7d',
      algorithm: 'HS256'
    },
    
    password: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      saltRounds: 10
    },
    
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      authMax: 5 // limit auth attempts
    }
  },

  // ========================================
  // FILE STRUCTURE
  // ========================================
  structure: {
    backend: {
      root: 'backend/',
      folders: [
        'config/',
        'controllers/',
        'middleware/',
        'models/',
        'routes/',
        'services/',
        'utils/',
        'validators/',
        'migrations/',
        'seeders/',
        'templates/',
        'uploads/',
        'logs/'
      ]
    },
    
    frontend: {
      root: 'frontend/',
      folders: [
        'src/components/',
        'src/pages/',
        'src/hooks/',
        'src/utils/',
        'src/services/',
        'src/store/',
        'src/assets/',
        'public/'
      ]
    }
  },

  // ========================================
  // DEVELOPMENT SETTINGS
  // ========================================
  development: {
    port: 5000,
    frontendPort: 3000,
    debugMode: true,
    logLevel: 'debug',
    
    database: {
      host: 'localhost',
      port: 5432,
      username: 'vegemarket_user',
      password: 'vegemarket_pass',
      database: 'vegemarket_dev'
    }
  },

  // ========================================
  // PRODUCTION SETTINGS
  // ========================================
  production: {
    port: process.env.PORT || 5000,
    debugMode: false,
    logLevel: 'info',
    
    database: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    }
  }
};

// Export helper functions
export const getConfig = (path) => {
  const keys = path.split('.');
  let value = PROJECT_CONFIG;
  
  for (const key of keys) {
    value = value[key];
    if (!value) return undefined;
  }
  
  return value;
};

export const isProduction = () => process.env.NODE_ENV === 'production';
export const isDevelopment = () => process.env.NODE_ENV === 'development';

export default PROJECT_CONFIG;