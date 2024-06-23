const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const cartSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    products: [{
       
      product:{
         type: Schema.Types.ObjectId,
         ref: 'Product',
      },
      cartCount : {
         type : Number 
      },
      ml : {
        type: Number
      },
      isSelected: {
        type: Boolean,
        default:false
    },
    
    }],
    couponDetails: {
      appliedCoupon: {
          type: String,
          default: null
      },
      discountedAmount: Number,
  },
  originalAmount:{
      type:Number,
      default:0
  },

    cartTotal:{
      type: Number
    },
    subTotal :{
      type: Number
      },
     
} , {timestamps : true});

const Cart = mongoose.model('cart', cartSchema);

module.exports = Cart;

