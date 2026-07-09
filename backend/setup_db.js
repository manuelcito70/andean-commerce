const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setup() {
  const defaultClient = new Client({
    host: process.env.PGHOST || 'localhost',
    port: process.env.PGPORT || 5432,
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '123456',
    database: 'postgres',
  });

  try {
    await defaultClient.connect();
    console.log('Connected to default postgres database.');
    
    // Check if database exists
    const res = await defaultClient.query("SELECT 1 FROM pg_database WHERE datname = 'andean_commerce'");
    if (res.rowCount === 0) {
      console.log('Database andean_commerce does not exist. Creating...');
      await defaultClient.query('CREATE DATABASE andean_commerce');
      console.log('Database created successfully.');
    } else {
      console.log('Database andean_commerce already exists.');
    }
  } catch (err) {
    console.error('Error connecting to postgres database. Check your credentials.', err);
    process.exit(1);
  } finally {
    await defaultClient.end();
  }

  const appClient = new Client({
    host: process.env.PGHOST || 'localhost',
    port: process.env.PGPORT || 5432,
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '123456',
    database: 'andean_commerce',
  });

  try {
    await appClient.connect();
    console.log('Connected to andean_commerce database.');
    
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await appClient.query(schemaSql);
    console.log('Schema loaded successfully.');
    
  } catch (err) {
    console.error('Error setting up schema:', err);
  } finally {
    await appClient.end();
  }
}

setup();
