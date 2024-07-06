const mongoose = require('mongoose')

const productSchema = mongoose.Schema({

    productName:{
      type: String,
      required: true
    },
    description:{
        type:String,
        required:true
    },
    Qty:{
        type:Number,
        required:true
    },
    price:{
        type:Number,
        required:true
    },
    oldPrice:{
        type:Number
    },
    img1:{
        type:String,
       
    },
    img2:{
        type:String,
       
    },
    img3:{
        type:String,
       
    },
    category:{
        type: mongoose.Schema.Types.ObjectId,
        required :true,
        ref : 'Category'
    },
    brand:{
         type:String
    },
    trending:{

        type:Boolean,
        default:false

    },offer:{

        type:String
        
    }
    ,isDeleted:{
        type:Boolean
    },
    status:{
        type: String
    },
    Size:{
        type:String
    },
    update:{
        type:Boolean,
        default:false
    },

    CountOfstock:{
        type:Number
    },
    Ingredients:{
        type:String
    },
    IdealFor:{
        type:String
    },
    features:{
        type:String
    },
    tags:{
        type:String
    },
    deliveryInfo:{
        type:String
    },
    howTouse:{
        type:[String]
    },
    cart: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'cart'
    }],
},{timestamps:true})

const Product=mongoose.model('Product',productSchema)

module.exports=Product;


