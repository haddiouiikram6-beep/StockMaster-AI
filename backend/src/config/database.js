const { Sequelize } = require('sequelize');
const env = require('./env');

const isTest = env.NODE_ENV === 'test' || env.DB_DIALECT === 'sqlite';

const baseConfig = {
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  dialect: env.DB_DIALECT,
  logging: env.NODE_ENV === 'development' ? false : false,
  define: {
    timestamps: true,
    underscored: false
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

let sequelize;

if (isTest) {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: env.DB_STORAGE || ':memory:',
    logging: false,
    define: {
      timestamps: true,
      underscored: false
    }
  });
} else {
  sequelize = new Sequelize(
    baseConfig.database,
    baseConfig.username,
    baseConfig.password,
    baseConfig
  );
}

module.exports = {
  sequelize,
  development: {
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    host: env.DB_HOST,
    port: env.DB_PORT,
    dialect: 'postgres',
    logging: false
  },
  test: {
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    database: `${env.DB_NAME}_test`,
    host: env.DB_HOST,
    port: env.DB_PORT,
    dialect: env.DB_DIALECT === 'sqlite' ? 'sqlite' : 'postgres',
    storage: env.DB_STORAGE || ':memory:',
    logging: false
  },
  production: {
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    host: env.DB_HOST,
    port: env.DB_PORT,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 20,
      min: 2,
      acquire: 30000,
      idle: 10000
    }
  }
};
