const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
    product: {
        type:mongoose.Schema.Types.ObjectId,
        ref: "Product",
    },
    category: {
        type:mongoose.Schema.Types.ObjectId,
        ref: "category",
    },
    offerType: {
        type: String,
        enum: [ "percentage", "price"],
    },
    offerValue: {
        type: Number,
    },
    startDate: {
        type: String,
    },
    endDate: {
        type: String,
    },
    description: {
        type: String,
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});



const offerModel = new mongoose.model("Offers", offerSchema );
module.exports = offerModel;