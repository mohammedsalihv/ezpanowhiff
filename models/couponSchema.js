
const mongoose = require("mongoose")

const couponScehma = new mongoose.Schema({

    couponCode:{
        type: String,
        unique : true
    },
    description : {
        type: String
    },
    users_used : [{
        type: mongoose.Schema.Types.ObjectId,
        ref : 'User'
    }],
    discount_percentage:{
        type:Number,
        min : 0,
        max:100
    },
    max_discount_amount:{
        type: Number,
        min : 0
    },
    min_discount_amount:{
        type: Number,
        min : 0
    },
    coupanStatus:{
        type: String,
        default : 'Active'
    },
    expiry_date: {
        type: String
    },
    islisted:{
        type:Boolean,
        default:true
    },
    isExpired:{
        type:Boolean,
        default:false
    }
})

const Coupon = mongoose.model('coupon' , couponScehma)
module.exports = Coupon;