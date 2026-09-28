const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config(); // also check current dir

module.exports = {
  HOST: process.env.DB_HOST || 'gateway01.eu-central-1.prod.aws.tidbcloud.com',
  USER: process.env.DB_USER || '2hPVeXXYdKi1aAM.root',
  PASSWORD: process.env.DB_PASSWORD || 'fO9s231MQNJNPIHJ',
  DB: process.env.DB_NAME || 'nurivina_crm',
  DIALECT: 'mysql',
  PORT: process.env.DB_PORT || 4000,
  dialectOptions: (process.env.DB_SSL === 'false') ? {} : {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

