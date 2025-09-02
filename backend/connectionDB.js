const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGO_URI || 'mongodb+srv://kombosawb_db_user:Ko2010u37@swyft.ulbl2e1.mongodb.net/?retryWrites=true&w=majority&appName=swyft';
const dbName = process.env.DB_NAME || 'swyft';

let db;

async function connectDB() {
  if (db) return db;

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
