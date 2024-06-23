const mongoose=require('mongoose');

const transactionSchema=new mongoose.Schema({
    amount:{
        type:Number,
        required:true
    },
    type:{
        type:String,
        enum:['credited','debited'],
        required:true
    },
    description:{
        type:String,
        required:true
    },
    canceled :{
        type: String
    },
    returned : {
        type: String
    }
},
{
timestamps:true,
})


const walletSchema=new mongoose.Schema({
    wallet_user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true,
        unique:true
    },
    balance:{
        type:Number,
        default:0,
        min:0
    },
    transactions:[transactionSchema],
    pendingOrder:{
        orderId:{
            type:String
        },
        amount:{
            type:Number,
            min:0
        },
        currency:{
            type:String
        }
    },
},{
    timestamps:true

})

const Wallet=mongoose.model('Wallet',walletSchema);
module.exports=Wallet