const mongoose = require('mongoose');
const connectDB = async () => {
  const conn = await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log(`✅ MongoDB: ${conn.connection.host}`);
};
module.exports = connectDB;
