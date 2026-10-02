const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function run() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });
    
    console.log('Connected to MySQL...');
    
    const sql = fs.readFileSync('schema.sql', 'utf8');
    await connection.query(sql);
    
    console.log('Database initialized and seeded successfully!');
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('Database connection or execution failed:', error.message);
    process.exit(1);
  }
}

run();
