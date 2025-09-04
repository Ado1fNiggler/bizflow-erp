// config/swagger.js
// Swagger/OpenAPI configuration for API documentation

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'BizFlow ERP API',
    version: '1.0.0',
    description: 'Comprehensive ERP System API Documentation',
    contact: {
      name: 'BizFlow Support',
      email: 'support@bizflow.gr',
      url: 'https://bizflow.gr'
    },
    license: {
      name: 'Proprietary',
      url: 'https://bizflow.gr/license'
    }
  },
  servers: [
    {
      url: 'http://localhost:5000/api',
      description: 'Development server'
    },
    {
      url: 'https://api.bizflow.gr/api',
      description: 'Production server'
    },
    {
      url: 'https://staging-api.bizflow.gr/api',
      description: 'Staging server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token'
      },
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API Key authentication'
      },
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'bizflow.sid',
        description: 'Session cookie authentication'
      }
    },
    schemas: {
      // Error response
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Error message'
          },
          message: {
            type: 'string',
            description: 'Detailed error description'
          },
          status: {
            type: 'integer',
            description: 'HTTP status code'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Error timestamp'
          }
        }
      },
      
      // Success response
      Success: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          message: {
            type: 'string',
            description: 'Success message'
          },
          data: {
            type: 'object',
            description: 'Response data'
          }
        }
      },
      
      // Pagination
      Pagination: {
        type: 'object',
        properties: {
          page: {
            type: 'integer',
            example: 1
          },
          limit: {
            type: 'integer',
            example: 20
          },
          total: {
            type: 'integer',
            example: 100
          },
          pages: {
            type: 'integer',
            example: 5
          }
        }
      },
      
      // User schema
      User: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            readOnly: true
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'user@bizflow.gr'
          },
          name: {
            type: 'string',
            example: 'Γιώργος Παπαδόπουλος'
          },
          role: {
            type: 'string',
            enum: ['admin', 'manager', 'accountant', 'user', 'viewer'],
            example: 'user'
          },
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'pending', 'locked'],
            example: 'active'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            readOnly: true
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            readOnly: true
          }
        }
      },
      
      // Company schema
      Company: {
        type: 'object',
        required: ['name', 'companyType'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            readOnly: true
          },
          code: {
            type: 'string',
            example: 'COMP001'
          },
          name: {
            type: 'string',
            example: 'Εταιρία ΑΕ'
          },
          legalName: {
            type: 'string',
            example: 'ΕΤΑΙΡΙΑ ΑΝΩΝΥΜΗ ΕΤΑΙΡΕΙΑ'
          },
          vatNumber: {
            type: 'string',
            pattern: '^[0-9]{9}$',
            example: '123456789'
          },
          taxOffice: {
            type: 'string',
            example: 'ΔΟΥ Α\' Θεσσαλονίκης'
          },
          companyType: {
            type: 'string',
            enum: ['client', 'supplier', 'both'],
            example: 'client'
          },
          address: {
            type: 'string',
            example: 'Τσιμισκή 1'
          },
          city: {
            type: 'string',
            example: 'Θεσσαλονίκη'
          },
          postalCode: {
            type: 'string',
            example: '54624'
          },
          phone: {
            type: 'string',
            example: '2310 123456'
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'info@company.gr'
          },
          status: {
            type: 'string',
            enum: ['active', 'inactive'],
            example: 'active'
          }
        }
      },
      
      // Member schema
      Member: {
        type: 'object',
        required: ['firstName', 'lastName'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            readOnly: true
          },
          memberCode: {
            type: 'string',
            example: 'M20250001',
            readOnly: true
          },
          firstName: {
            type: 'string',
            example: 'Γιώργος'
          },
          lastName: {
            type: 'string',
            example: 'Παπαδόπουλος'
          },
          vatNumber: {
            type: 'string',
            pattern: '^[0-9]{9}$',
            example: '123456789'
          },
          email: {
            type: 'string',
            format: 'email'
          },
          phone: {
            type: 'string',
            example: '69 1234 5678'
          },
          memberCategory: {
            type: 'string',
            enum: ['regular', 'honorary', 'student', 'corporate', 'lifetime'],
            example: 'regular'
          },
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'suspended', 'expired'],
            example: 'active'
          },
          memberSince: {
            type: 'string',
            format: 'date'
          },
          memberUntil: {
            type: 'string',
            format: 'date'
          },
          subscriptionFee: {
            type: 'number',
            format: 'decimal',
            example: 100.00
          }
        }
      },
      
      // Document schema
      Document: {
        type: 'object',
        required: ['documentType', 'companyId'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            readOnly: true
          },
          documentType: {
            type: 'string',
            enum: ['invoice', 'receipt', 'credit_note', 'debit_note', 'quote', 'order'],
            example: 'invoice'
          },
          documentNumber: {
            type: 'string',
            example: 'ΤΙΜ-A-000001',
            readOnly: true
          },
          documentDate: {
            type: 'string',
            format: 'date',
            example: '2025-01-15'
          },
          companyId: {
            type: 'string',
            format: 'uuid'
          },
          subtotal: {
            type: 'number',
            format: 'decimal',
            example: 100.00
          },
          vatAmount: {
            type: 'number',
            format: 'decimal',
            example: 24.00
          },
          total: {
            type: 'number',
            format: 'decimal',
            example: 124.00
          },
          status: {
            type: 'string',
            enum: ['draft', 'pending', 'sent', 'paid', 'cancelled'],
            example: 'pending'
          },
          items: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/DocumentItem'
            }
          }
        }
      },
      
      // Document Item schema
      DocumentItem: {
        type: 'object',
        required: ['description', 'quantity', 'unitPrice'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            readOnly: true
          },
          description: {
            type: 'string',
            example: 'Υπηρεσίες συμβουλευτικής'
          },
          quantity: {
            type: 'number',
            example: 1
          },
          unitPrice: {
            type: 'number',
            format: 'decimal',
            example: 100.00
          },
          vatRate: {
            type: 'number',
            example: 24
          },
          netAmount: {
            type: 'number',
            format: 'decimal',
            readOnly: true
          },
          vatAmount: {
            type: 'number',
            format: 'decimal',
            readOnly: true
          },
          totalAmount: {
            type: 'number',
            format: 'decimal',
            readOnly: true
          }
        }
      }
    },
    
    // Common parameters
    parameters: {
      pageParam: {
        name: 'page',
        in: 'query',
        description: 'Page number',
        required: false,
        schema: {
          type: 'integer',
          default: 1,
          minimum: 1
        }
      },
      limitParam: {
        name: 'limit',
        in: 'query',
        description: 'Items per page',
        required: false,
        schema: {
          type: 'integer',
          default: 20,
          minimum: 1,
          maximum: 100
        }
      },
      searchParam: {
        name: 'search',
        in: 'query',
        description: 'Search term',
        required: false,
        schema: {
          type: 'string'
        }
      },
      sortByParam: {
        name: 'sortBy',
        in: 'query',
        description: 'Sort field',
        required: false,
        schema: {
          type: 'string'
        }
      },
      sortOrderParam: {
        name: 'sortOrder',
        in: 'query',
        description: 'Sort order',
        required: false,
        schema: {
          type: 'string',
          enum: ['ASC', 'DESC'],
          default: 'DESC'
        }
      },
      idParam: {
        name: 'id',
        in: 'path',
        description: 'Resource ID',
        required: true,
        schema: {
          type: 'string',
          format: 'uuid'
        }
      }
    },
    
    // Common responses
    responses: {
      BadRequest: {
        description: 'Bad Request',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      Unauthorized: {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      Forbidden: {
        description: 'Forbidden',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      NotFound: {
        description: 'Not Found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      InternalError: {
        description: 'Internal Server Error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      }
    }
  },
  
  // Security requirement for all endpoints
  security: [
    {
      bearerAuth: []
    }
  ],
  
  tags: [
    {
      name: 'Authentication',
      description: 'Authentication endpoints'
    },
    {
      name: 'Companies',
      description: 'Company management'
    },
    {
      name: 'Members',
      description: 'Member management'
    },
    {
      name: 'Documents',
      description: 'Document and invoice management'
    },
    {
      name: 'Reports',
      description: 'Reporting and analytics'
    },
    {
      name: 'Admin',
      description: 'Administration endpoints'
    },
    {
      name: 'System',
      description: 'System information and health'
    }
  ]
};

// Swagger options
const swaggerOptions = {
  definition: swaggerDefinition,
  apis: [
    './routes/*.js',
    './models/*.js'
  ]
};

// Generate Swagger specification
export const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI options
export const swaggerUiOptions = {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'BizFlow ERP API Documentation',
  customfavIcon: '/favicon.ico'
};

// Export Swagger UI middleware
export const swaggerDocs = swaggerUi.serve;
export const swaggerUiSetup = swaggerUi.setup(swaggerSpec, swaggerUiOptions);

export default {
  swaggerSpec,
  swaggerDocs,
  swaggerUiSetup
};