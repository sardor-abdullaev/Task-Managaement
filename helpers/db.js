require("dotenv").config();
const mongoose = require("mongoose");

exports.connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to DB successfully!");
};
