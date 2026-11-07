
const mongoose = require("mongoose");

async function connectDB() {
    try {
        const MONGO_URI = process.env.MONGO_URI;

        if (!MONGO_URI) {
            throw new Error("MONGO_URI is missing");
        }

        await mongoose.connect(MONGO_URI);

        console.log("MongoDB connected successfully");
    } catch (error) {
        console.log("MongoDB connection failed:", error.message);
        process.exit(1);
    }
}

module.exports = connectDB;
