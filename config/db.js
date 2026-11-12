const mongoose = require("mongoose");
const useDnsServers = require("./dns");

const connectDB = async () => {
    useDnsServers();
    mongoose.set('strictQuery', true);
    const conn = await mongoose.connect(process.env.MONGO_URI)
    console.log(`MongoDB Connected: ${conn.connection.host}`);
}

module.exports = connectDB;