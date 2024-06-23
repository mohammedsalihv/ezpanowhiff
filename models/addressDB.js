const mongoose = require("mongoose");
const { Schema } = mongoose;

const addressSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        required: true

    },
    fullname: String,
    phone: Number,
    email: String,
    addressLine:String,
    City: String,
    state: String,
    pincode: Number,
    street: String,
    country : String
});

const Address = mongoose.model("Address", addressSchema);

module.exports = Address;


