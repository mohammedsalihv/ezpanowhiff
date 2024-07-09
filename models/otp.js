
const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    otp: {
        type: String,
        required: true
    },
    user: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 60 // Expires after 60 seconds (1 minute)
    }
})


const otpModel = new mongoose.model('otp', otpSchema );

module.exports = otpModel;