const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

const wishlistchema = new Schema({
    user: {
        type: Types.ObjectId,
        ref: 'User'
    },
    products: [{
        product: {
            type: Types.ObjectId,
            ref: 'Product'
        },
        productName : {
            type: String
        },
        price : {
            type: Number
        },
        statusProduct : {
            type: String
        },
        img1 : {
            type : String
        },
        qty:{
            type: Number
        },
        isSelected: {
            type: Boolean,
            default:false
        }

    }],
    totalamount: {
        type: Number
    },
    
}, { timestamps: true });

const wishlistModel = mongoose.model('wishlist', wishlistchema);
module.exports = wishlistModel;