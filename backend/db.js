const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'admin123',
  database: process.env.PGDATABASE || 'andean_commerce',
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
