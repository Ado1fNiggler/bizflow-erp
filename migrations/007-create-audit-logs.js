// migrations/007-create-audit-logs.js
// Migration for creating audit logs table

export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('audit_logs', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
      comment: 'Primary key'
    },
    
    // User information
    userId: {
      type: Sequelize.UUID,
      allowNull: true,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'User who performed the action'
    },
    
    userName: {
      type: Sequelize.STRING(100),
      allowNull: true,
      field: 'user_name',
      comment: 'User name at time of action'
    },
    
    userEmail: {
      type: Sequelize.STRING(255),
      allowNull: true,
      field: 'user_email',
      comment: 'User email at time of action'
    },
    
    userRole: {
      type: Sequelize.STRING(50),
      allowNull: true,
      field: 'user_role',
      comment: 'User role at time of action'
    },
    
    // Action details
    action: {
      type: Sequelize.ENUM(
        'create',
        'read',
        'update',
        'delete',
        'restore',
        'login',
        'logout',
        'login_failed',
        'password_change',
        'password_reset',
        'permission_grant',
        'permission_revoke',
        'export',
        'import',
        'print',
        'email_sent',
        'approve',
        'reject',
        'cancel',
        'lock',
        'unlock',
        'archive',
        'unarchive',
        'reconcile',
        'void',
        'duplicate',
        'merge',
        'split',
        'backup',
        'restore_backup',
        'system_update',
        'setting_change',
        'bulk_action',
        'api_call',
        'webhook',
        'error',
        'warning',
        'custom'
      ),
      allowNull: false,
      comment: 'Action type'
    },
    
    actionDetails: {
      type: Sequelize.STRING(255),
      allowNull: true,
      field: 'action_details',
      comment: 'Additional action details'
    },
    
    // Entity information
    entityType: {
      type: Sequelize.STRING(50),
      allowNull: false,
      field: 'entity_type',
      comment: 'Entity type (table name)'
    },
    
    entityId: {
      type: Sequelize.STRING(100),
      allowNull: true,
      field: 'entity_id',
      comment: 'Entity ID'
    },
    
    entityName: {
      type: Sequelize.STRING(255),
      allowNull: true,
      field: 'entity_name',
      comment: 'Entity display name'
    },
    
    entityCode: {
      type: Sequelize.STRING(50),
      allowNull: true,
      field: 'entity_code',
      comment: 'Entity code/number'
    },
    
    // Parent entity (for related actions)
    parentType: {
      type: Sequelize.STRING(50),
      allowNull: true,
      field: 'parent_type',
      comment: 'Parent entity type'
    },
    
    parentId: {
      type: Sequelize.STRING(100),
      allowNull: true,
      field: 'parent_id',
      comment: 'Parent entity ID'
    },
    
    // Changes tracking
    oldValues: {
      type: Sequelize.JSON,
      allowNull: true,
      field: 'old_values',
      comment: 'Previous values (for updates)'
    },
    
    newValues: {
      type: Sequelize.JSON,
      allowNull: true,
      field: 'new_values',
      comment: 'New values (for updates)'
    },
    
    changedFields: {
      type: Sequelize.JSON,
      defaultValue: [],
      field: 'changed_fields',
      comment: 'List of changed field names'
    },
    
    // Request information
    ipAddress: {
      type: Sequelize.STRING(45),
      allowNull: true,
      field: 'ip_address',
      comment: 'IP address'
    },
    
    userAgent: {
      type: Sequelize.TEXT,
      allowNull: true,
      field: 'user_agent',
      comment: 'User agent string'
    },
    
    requestMethod: {
      type: Sequelize.STRING(10),
      allowNull: true,
      field: 'request_method',
      comment: 'HTTP method'
    },
    
    requestUrl: {
      type: Sequelize.TEXT,
      allowNull: true,
      field: 'request_url',
      comment: 'Request URL'
    },
    
    requestBody: {
      type: Sequelize.JSON,
      allowNull: true,
      field: 'request_body',
      comment: 'Request body (sanitized)'
    },
    
    requestHeaders: {
      type: Sequelize.JSON,
      allowNull: true,
      field: 'request_headers',
      comment: 'Request headers (sanitized)'
    },
    
    // Response information
    responseStatus: {
      type: Sequelize.INTEGER,
      allowNull: true,
      field: 'response_status',
      comment: 'HTTP response status code'
    },
    
    responseTime: {
      type: Sequelize.INTEGER,
      allowNull: true,
      field: 'response_time',
      comment: 'Response time in milliseconds'
    },
    
    responseSize: {
      type: Sequelize.INTEGER,
      allowNull: true,
      field: 'response_size',
      comment: 'Response size in bytes'
    },
    
    // Session information
    sessionId: {
      type: Sequelize.STRING(100),
      allowNull: true,
      field: 'session_id',
      comment: 'Session ID'
    },
    
    // Application context
    source: {
      type: Sequelize.STRING(50),
      defaultValue: 'web',
      comment: 'Action source (web, api, mobile, system, import)'
    },
    
    version: {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: 'Application version'
    },
    
    environment: {
      type: Sequelize.STRING(20),
      defaultValue: 'production',
      comment: 'Environment (development, staging, production)'
    },
    
    // Status and result
    status: {
      type: Sequelize.ENUM('success', 'failure', 'partial', 'pending'),
      defaultValue: 'success',
      comment: 'Action status'
    },
    
    errorCode: {
      type: Sequelize.STRING(50),
      allowNull: true,
      field: 'error_code',
      comment: 'Error code (if failed)'
    },
    
    errorMessage: {
      type: Sequelize.TEXT,
      allowNull: true,
      field: 'error_message',
      comment: 'Error message (if failed)'
    },
    
    errorStack: {
      type: Sequelize.TEXT,
      allowNull: true,
      field: 'error_stack',
      comment: 'Error stack trace (if failed)'
    },
    
    // Business context
    companyId: {
      type: Sequelize.UUID,
      allowNull: true,
      field: 'company_id',
      references: {
        model: 'companies',
        key: 'id'
      },
      comment: 'Related company context'
    },
    
    branchId: {
      type: Sequelize.UUID,
      allowNull: true,
      field: 'branch_id',
      comment: 'Branch/Location ID'
    },
    
    fiscalYear: {
      type: Sequelize.INTEGER,
      allowNull: true,
      field: 'fiscal_year',
      comment: 'Fiscal year'
    },
    
    fiscalPeriod: {
      type: Sequelize.INTEGER,
      allowNull: true,
      field: 'fiscal_period',
      comment: 'Fiscal period/month'
    },
    
    // Security and compliance
    severity: {
      type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'low',
      comment: 'Action severity level'
    },
    
    risk: {
      type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: true,
      comment: 'Risk level'
    },
    
    compliance: {
      type: Sequelize.JSON,
      defaultValue: {},
      comment: 'Compliance flags (GDPR, etc.)'
    },
    
    requiresReview: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      field: 'requires_review',
      comment: 'Requires manual review'
    },
    
    reviewedBy: {
      type: Sequelize.UUID,
      allowNull: true,
      field: 'reviewed_by',
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Reviewed by user'
    },
    
    reviewedAt: {
      type: Sequelize.DATE,
      allowNull: true,
      field: 'reviewed_at',
      comment: 'Review timestamp'
    },
    
    reviewNotes: {
      type: Sequelize.TEXT,
      allowNull: true,
      field: 'review_notes',
      comment: 'Review notes'
    },
    
    // Additional metadata
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Human-readable description'
    },
    
    notes: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Additional notes'
    },
    
    tags: {
      type: Sequelize.JSON,
      defaultValue: [],
      comment: 'Tags for categorization'
    },
    
    metadata: {
      type: Sequelize.JSON,
      defaultValue: {},
      comment: 'Additional metadata'
    },
    
    // Retention
    retainUntil: {
      type: Sequelize.DATE,
      allowNull: true,
      field: 'retain_until',
      comment: 'Retention expiry date'
    },
    
    isArchived: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      field: 'is_archived',
      comment: 'Archived status'
    },
    
    archivedAt: {
      type: Sequelize.DATE,
      allowNull: true,
      field: 'archived_at',
      comment: 'Archive timestamp'
    },
    
    // Timestamp
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
      field: 'created_at',
      defaultValue: Sequelize.NOW,
      comment: 'Action timestamp'
    }
  });
  
  // Create indexes
  await queryInterface.addIndex('audit_logs', ['user_id'], {
    name: 'audit_logs_user_index'
  });
  
  await queryInterface.addIndex('audit_logs', ['action'], {
    name: 'audit_logs_action_index'
  });
  
  await queryInterface.addIndex('audit_logs', ['entity_type'], {
    name: 'audit_logs_entity_type_index'
  });
  
  await queryInterface.addIndex('audit_logs', ['entity_id'], {
    name: 'audit_logs_entity_id_index'
  });
  
  await queryInterface.addIndex('audit_logs', ['entity_type', 'entity_id'], {
    name: 'audit_logs_entity_composite_index'
  });
  
  await queryInterface.addIndex('audit_logs', ['created_at'], {
    name: 'audit_logs_created_index'
  });
  
  await queryInterface.addIndex('audit_logs', ['status'], {
    name: 'audit_logs_status_index'
  });
  
  await queryInterface.addIndex('audit_logs', ['severity'], {
    name: 'audit_logs_severity_index'
  });
  
  await queryInterface.addIndex('audit_logs', ['session_id'], {
    name: 'audit_logs_session_index'
  });
  
  await queryInterface.addIndex('audit_logs', ['company_id'], {
    name: 'audit_logs_company_index'
  });
  
  await queryInterface.addIndex('audit_logs', ['requires_review'], {
    name: 'audit_logs_review_index'
  });
  
  await queryInterface.addIndex('audit_logs', ['is_archived'], {
    name: 'audit_logs_archived_index'
  });
  
  // Composite indexes for common queries
  await queryInterface.addIndex('audit_logs', ['user_id', 'action', 'created_at'], {
    name: 'audit_logs_user_action_date_index'
  });
  
  await queryInterface.addIndex('audit_logs', ['entity_type', 'entity_id', 'action'], {
    name: 'audit_logs_entity_action_index'
  });
  
  await queryInterface.addIndex('audit_logs', ['created_at', 'severity', 'status'], {
    name: 'audit_logs_monitoring_index'
  });
  
  // Full-text search index for PostgreSQL
  if (queryInterface.sequelize.options.dialect === 'postgres') {
    await queryInterface.sequelize.query(`
      CREATE INDEX audit_logs_search_index ON audit_logs 
      USING gin(to_tsvector('simple', coalesce(action_details, '') || ' ' || 
                                       coalesce(entity_name, '') || ' ' || 
                                       coalesce(description, '')))
    `);
  }
};

export const down = async (queryInterface, Sequelize) => {
  // Remove full-text index if PostgreSQL
  if (queryInterface.sequelize.options.dialect === 'postgres') {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS audit_logs_search_index');
  }
  
  // Remove indexes
  await queryInterface.removeIndex('audit_logs', 'audit_logs_user_index');
  await queryInterface.removeIndex('audit_logs', 'audit_logs_action_index');
  await queryInterface.removeIndex('audit_logs', 'audit_logs_entity_type_index');
  await queryInterface.removeIndex('audit_logs', 'audit_logs_entity_id_index');
  await queryInterface.removeIndex('audit_logs', 'audit_logs_entity_composite_index');
  await queryInterface.removeIndex('audit_logs', 'audit_logs_created_index');
  await queryInterface.removeIndex('audit_logs', 'audit_logs_status_index');
  await queryInterface.removeIndex('audit_logs', 'audit_logs_severity_index');
  await queryInterface.removeIndex('audit_logs', 'audit_logs_session_index');
  await queryInterface.removeIndex('audit_logs', 'audit_logs_company_index');
  await queryInterface.removeIndex('audit_logs', 'audit_logs_review_index');
  await queryInterface.removeIndex('audit_logs', 'audit_logs_archived_index');
  await queryInterface.removeIndex('audit_logs', 'audit_logs_user_action_date_index');
  await queryInterface.removeIndex('audit_logs', 'audit_logs_entity_action_index');
  await queryInterface.removeIndex('audit_logs', 'audit_logs_monitoring_index');
  
  // Drop table
  await queryInterface.dropTable('audit_logs');
};