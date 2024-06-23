const mongoose = require('mongoose');
const crypto=require('crypto')

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        unique: true,
        default: function () {
          const randomString = crypto.randomBytes(6).toString('hex').toUpperCase();
          return `rzrpay${randomString}`;
        },
      },
       nameRandom: {
        type: String,
        unique: true,
        default: function () {
          const randomString = crypto.randomBytes(6).toString('hex').toUpperCase();
          return `#ORD${randomString}`;
        },
      },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required:true
    },
    OrderedDate: {
        type: String,
        required:true,
    },
    totalAmount: {
        type: Number,
        
    },
    paymentMethod: {
        type: String,
        required:true
      
    },
    createdDate:{
        type:Date,
        default:Date.now
    },
    products: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
            },
            quantity: {
                type: Number,
                
            },
            salesPrice: {
                type: Number,
                
               
            },
            total: {
                type: Number,
               
              
            },
            cancelstatus: {
                type: String,
                default: 'pending',
                enum:['pending','processing','shipped','delivered','canceled','returned','failed']
            },
            reason: {
                type: String,
            },
            deliverOrder:{
                type: Boolean,
                default: false,
             },
             returned:{
                 type: Boolean,
                 default:false
             },
             orderValid:{
                 type:Boolean,
                 default: true
             },
        },
    ],
    address: {
        fullname: {
            type: String,
            
        },
        phone: {
            type: Number,
           
        },
        street: {
            type: String,
            
        },
        pincode: {
            type: Number,
            
        },
        addressLine: {
            type: String,
            
        },
        City: {
            type: String, // Corrected: 'String' instead of 'string'
           
        },
        state: {
            type: String,
            
        },
        isDefault: {
            type: Boolean,
           
        },
        country:{
            type: String
        }
    },
    orderStatus: {
        type: String,
        default: 'pending',
        enum:['pending','processing','shipped','delivered','canceled','returned','failed']
    },
    returnReason:{
        type:String,
        default:null
        
    },
    ExpectedArrival: {
        type: String,
       
    },
    paymentStatus: {
        type: String,
        default: 'pending',
    },
    couponDetails:{
        appliedCoupon:{
           type: String,
           default:null
        },

        discountedAmount:Number,
        
    },
    deliveredAt: {
        type: Date,
      
     },
    
}, {
    timestamps: true, // Corrected: Use 'timestamps' instead of 'timeseries'
});

const Order = mongoose.model('order', orderSchema);

module.exports = Order;