// backend/connectDB.js
const { MongoClient } = require('mongodb');
require('dotenv').config();

// Cloud MongoDB URI (replace <db_password> with your actual password)
const uri = process.env.MONGO_URI || 'mongodb+srv://kombosawb_db_user:<db_password>@swyft.ulbl2e1.mongodb.net/?retryWrites=true&w=majority&appName=swyft';
const dbName = process.env.DB_NAME || 'swyft';

let db;

async function connectDB() {
  if (db) return db; // return existing connection if already connected

  if (!uri.includes('<db_password>')) {
    console.error('Please set your MongoDB password in the URI or in .env');
    process.exit(1);
  }

  try {
    const client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    await client.connect();
    console.log('Connected to MongoDB cloud database.');

    db = client.db(dbName);
    return db;
  } catch (err) {
    console.error('MongoDB connection failed:', err);
    process.exit(1); 
  }
}

module.exports = connectDB;
