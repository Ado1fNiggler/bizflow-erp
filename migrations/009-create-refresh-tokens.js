// migrations/009-create-refresh-tokens.js
// Migration for creating refresh_tokens table

export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('refresh_tokens', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
      comment: 'Primary key'
    },
    
    token: {
      type: Sequelize.TEXT,
      allowNull: false,
      unique: true,
      comment: 'JWT refresh token'
    },
    
    user_id: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      comment: 'User ID reference'
    },
    
    expires_at: {
      type: Sequelize.DATE,
      allowNull: false,
      comment: 'Token expiration date'
    },
    
    is_revoked: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Token revocation status'
    },
    
    revoked_at: {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Token revocation timestamp'
    },
    
    created_by_ip: {
      type: Sequelize.INET,
      allowNull: true,
      comment: 'IP address that created token'
    },
    
    revoked_by_ip: {
      type: Sequelize.INET,
      allowNull: true,
      comment: 'IP address that revoked token'
    },
    
    user_agent: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'User agent string'
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
  await queryInterface.addIndex('refresh_tokens', ['user_id'], {
    name: 'refresh_tokens_user_id_index'
  });
  
  await queryInterface.addIndex('refresh_tokens', ['token'], {
    unique: true,
    name: 'refresh_tokens_token_unique'
  });
  
  await queryInterface.addIndex('refresh_tokens', ['expires_at'], {
    name: 'refresh_tokens_expires_at_index'
  });
  
  await queryInterface.addIndex('refresh_tokens', ['is_revoked'], {
    name: 'refresh_tokens_is_revoked_index'
  });
  
  // Composite indexes
  await queryInterface.addIndex('refresh_tokens', ['user_id', 'is_revoked'], {
    name: 'refresh_tokens_user_active_index'
  });
  
  await queryInterface.addIndex('refresh_tokens', ['expires_at', 'is_revoked'], {
    name: 'refresh_tokens_valid_index'
  });
};

export const down = async (queryInterface, Sequelize) => {
  // Remove indexes
  await queryInterface.removeIndex('refresh_tokens', 'refresh_tokens_user_id_index');
  await queryInterface.removeIndex('refresh_tokens', 'refresh_tokens_token_unique');
  await queryInterface.removeIndex('refresh_tokens', 'refresh_tokens_expires_at_index');
  await queryInterface.removeIndex('refresh_tokens', 'refresh_tokens_is_revoked_index');
  await queryInterface.removeIndex('refresh_tokens', 'refresh_tokens_user_active_index');
  await queryInterface.removeIndex('refresh_tokens', 'refresh_tokens_valid_index');
  
  // Drop table
  await queryInterface.dropTable('refresh_tokens');
};