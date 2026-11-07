
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    rollNumber: {
        type: String,
        required: true
    },
    casualLeave: {
        type: Number,
        default: 10
    },
    medicalLeave: {
        type: Number,
        default: 10
    }
});

module.exports = mongoose.model("User", userSchema);
