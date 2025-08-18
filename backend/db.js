const mysql = require('mysql');
require('dotenv').config();  // load .env

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

connection.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    return;
  }
  console.log(`Connected to MySQL database ${process.env.DB_NAME}!`);
});

module.exports = connection;
