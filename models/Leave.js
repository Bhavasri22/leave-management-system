
const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    type: {
        type: String,
        enum: ["casual", "medical"],
        required: true
    },

    fromDate: {
        type: Date,
        required: true
    },

    toDate: {
        type: Date,
        required: true
    },

    days: {
        type: Number,
        required: true,
        min: 1
    },

    reason: {
        type: String,
        required: true
    },

    status: {
        type: String,
        enum: ["Pending", "Approved", "Rejected"],
        default: "Pending"
    },

    rejectionReason: {
        type: String,
        default: ""
    },

    appliedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Leave", leaveSchema);
