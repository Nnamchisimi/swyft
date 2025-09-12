// db.js
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config(); // Load .env

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB Atlas");
  } catch (err) {
    console.error("❌ Database connection failed:", err);
    process.exit(1); // Stop server if DB connection fails
  }
}

export default connectDB;
