// config/config.js
// Database configuration for Sequelize CLI (CommonJS format)

require('dotenv').config();

const config = {
  development: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'bizflow_dev',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      ssl: false,
      decimalNumbers: true,
      charset: 'utf8',
      supportBigNumbers: true,
      bigNumberStrings: false
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true,
      charset: 'utf8',
      collate: 'utf8_general_ci'
    },
    timezone: '+02:00'
  },
  
  test: {
    username: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'postgres',
    database: process.env.TEST_DB_NAME || 'bizflow_test',
    host: process.env.TEST_DB_HOST || 'localhost',
    port: process.env.TEST_DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      ssl: false,
      decimalNumbers: true
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true
    },
    timezone: '+02:00'
  },
  
  production: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 20,
      min: 5,
      acquire: 60000,
      idle: 10000,
      evict: 10000
    },
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      },
      keepAlive: true,
      decimalNumbers: true,
      charset: 'utf8',
      supportBigNumbers: true,
      bigNumberStrings: false
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true,
      charset: 'utf8',
      collate: 'utf8_general_ci'
    },
    timezone: '+02:00',
    retry: {
      max: 3,
      timeout: 5000,
      match: [
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/
      ]
    }
  }
};

module.exports = config;