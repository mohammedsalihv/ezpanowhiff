const User = require('../models/userDB')
const Product = require('../models/productDB')
const Cart = require("../models/cartDB")
const Address = require('../models/addressDB')
const orderModel = require('../models/orderSchema')
const Wallet = require('../models/walletSchema')
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const Coupon = require('../models/couponSchema')
const { constrainedMemory } = require('process')

const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = process.env;
const razorpayInstance = new Razorpay({
    key_id: RAZORPAY_ID_KEY,
    key_secret: RAZORPAY_SECRET_KEY
});





const placeorder = async (req, res) => {
    try {
        const userData = req.session.user;
        const userId = userData._id;
        const selectedAddressId = req.body.addressId;
        const selectedPaymentMethod = req.body.payment_option;

        if (!userId) {
            return res.status(400).json({ message: 'User ID not provided' });
        }

        const parseAddressFromBody = (body) => {
            const {
                shipping_fullname,
                shipping_phone,
                shipping_addressLine,
                shipping_City,
                shipping_state,
                shipping_country,
                shipping_pincode
            } = body;

            const isAddressArrayAndNotEmpty = (arr) => Array.isArray(arr) && arr.length > 0 && arr[0];

            if (
                isAddressArrayAndNotEmpty(shipping_fullname) &&
                isAddressArrayAndNotEmpty(shipping_phone) &&
                isAddressArrayAndNotEmpty(shipping_addressLine) &&
                isAddressArrayAndNotEmpty(shipping_City) &&
                isAddressArrayAndNotEmpty(shipping_state)
            ) {
                return {
                    fullname: shipping_fullname[0],
                    phone: shipping_phone[0],
                    addressLine: shipping_addressLine[0],
                    pincode: shipping_pincode[0],
                    City: shipping_City[0],
                    state: shipping_state[0],
                    country: shipping_country[0]
                };
            }
            return null;
        };

        let address = parseAddressFromBody(req.body);

        if (!address) {
            address = await Address.findOne({ user_id: userId, _id: selectedAddressId });
            if (!address) {
                return res.status(404).json({ message: 'Address not found' });
            }
        }

        const productIds = req.body.productIds;
        const productQuantities = req.body.productQuantities;

        if (!Array.isArray(productIds) || !Array.isArray(productQuantities) || productIds.length !== productQuantities.length) {
            return res.status(400).json({ message: 'Invalid product data' });
        }

        const products = [];
        const processedProductIds = new Set();
        const productUpdatePromises = [];

        for (let i = 0; i < productIds.length; i++) {
            const productId = productIds[i];
            const quantity = parseInt(productQuantities[i], 10);

            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ message: `Product with ID ${productId} not found.` });
            }

            if (product.quantity < quantity) {
                return res.status(400).json({ message: `Insufficient quantity for product ID ${productId}.` });
            }

            if (!processedProductIds.has(productId)) {
                products.push({
                    productId: productId,
                    quantity: quantity,
                    salesPrice: product.price,
                    total: quantity * product.price,
                    reason: ''
                });

                processedProductIds.add(productId);
            }
        }

        const totalAmount = products.reduce((acc, curr) => acc + curr.total, 0);
        const shippingTime = 7;
        const orderedDate = new Date();
        const expectedArrivalDate = new Date(orderedDate);
        expectedArrivalDate.setDate(orderedDate.getDate() + shippingTime);
        const formattedArrivalDate = expectedArrivalDate.toISOString().substring(0, 10);
        const userCart = await Cart.findOne({ user_id: userId });
        const totalCart = userCart.cartTotal;
        const currentDate = new Date();
        const formattedDate = currentDate.toDateString();

        let order;
        if (selectedPaymentMethod === 'Cash on delivery') {
            if (totalCart > 1000) {
                return res.status(400).json({ message: "Amount exceeds the limit for cash on delivery." });
            }

            order = new orderModel({
                userId: userId,
                paymentMethod: selectedPaymentMethod,
                products: products,
                totalAmount: totalCart,
                address: address,
                ExpectedArrival: formattedArrivalDate,
                OrderedDate: formattedDate,
                deliveryCharge: true,
                paymentStatus: 'pending'
            });

        } else if (selectedPaymentMethod === 'wallet') {
            const wallet = await Wallet.findOne({ wallet_user: userId });
            if (!wallet) {
                return res.status(400).json({ message: 'Wallet not found for the user.' });
            }

            if (wallet.balance < totalAmount) {
                return res.status(400).json({ message: 'Insufficient balance in the wallet.' });
            }

            const newTransaction = {
                amount: totalAmount,
                type: 'debited',
                description: 'Order payment'
            };
            wallet.transactions.push(newTransaction);
            wallet.markModified('transactions');
            wallet.balance -= totalAmount;
            await wallet.save();

            order = new orderModel({
                userId: userId,
                paymentMethod: selectedPaymentMethod,
                products: products,
                totalAmount: totalCart,
                address: address,
                OrderedDate: formattedDate,
                ExpectedArrival: formattedArrivalDate,
                deliveryCharge: true,
                paymentStatus: 'success'
            });

        } else if (selectedPaymentMethod === 'razorpay') {
            order = new orderModel({
                userId: userId,
                paymentMethod: selectedPaymentMethod,
                products: products,
                totalAmount: totalCart,
                address: address,
                orderId: req.params.razorpayOrderId,
                OrderedDate: formattedDate,
                ExpectedArrival: formattedArrivalDate,
                deliveryCharge: true,
                paymentStatus: 'pending',
            });

            const options = {
                amount: totalCart * 100,
                currency: "INR",
                receipt: 'order_' + Date.now(),
            };

            try {
                const razorpayOrder = await new Promise((resolve, reject) => {
                    razorpayInstance.orders.create(options, (err, order) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(order);
                        }
                    });
                });

                order.orderId = razorpayOrder.id;
                await order.save();
                await Cart.deleteMany({ user_id: userId });

                // Update product quantities after order placement
                productUpdatePromises.push(...products.map(p => 
                    Product.updateOne({ _id: p.productId }, { $inc: { Qty: -p.quantity } })
                ));
                await Promise.all(productUpdatePromises);

                return res.status(200).json({
                    success: true,
                    orderId: razorpayOrder.id,
                    razorpayOrder,
                    key_id: RAZORPAY_ID_KEY,
                });

            } catch (error) {
                return res.status(200).json({
                    success: false,
                    message: 'Order placed but Razorpay payment failed',
                    order: order
                });
            }
        } else {
            return res.status(400).json({ message: 'Invalid payment method' });
        }

        // Save the order and update product quantities
        await order.save();
        await Cart.deleteMany({ user_id: userId });

        const couponApplied = req.session.appliedCoupon || null;
        req.session.appliedCoupon = null;

        if (couponApplied != null || couponApplied != undefined) {
            const couponDetails = await Coupon.findOne({ couponCode: couponApplied });
            order.couponDetails = { discountedAmount: couponDetails.max_discount_amount };
            order.couponApplied = true;
        }

        // Update product quantities after order placement
        productUpdatePromises.push(...products.map(p => 
            Product.updateOne({ _id: p.productId }, { $inc: { Qty: -p.quantity } })
        ));
        await Promise.all(productUpdatePromises);

        return res.status(200).json({ message: 'Order placed successfully', order });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};




const verifyRazorpay = async (req, res) => {
    const crypto = require('crypto');
    try {
        const { orderCreationId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

        const shasum = crypto.createHmac('sha256', RAZORPAY_SECRET_KEY);
        shasum.update(`${orderCreationId}|${razorpayPaymentId}`);
        const digest = shasum.digest('hex');

        if (digest !== razorpaySignature) {
            return res.status(400).json({ msg: 'Transaction not legit' });
        }

        const foundOrder = await orderModel.findOne({ orderId: razorpayOrderId });

        if (!foundOrder) {
            return res.status(404).json({ msg: 'Order not found' });
        }

        foundOrder.paymentStatus = 'success';
        await foundOrder.save();

        res.status(200).json({
            obj_id: foundOrder._id,
            msgSuccess: 'success',
            orderId: razorpayOrderId,
            paymentId: razorpayPaymentId,
            foundOrder: foundOrder
        });
    } catch (error) {
        console.error('Verification Error:', error);
        res.status(500).json({ message: 'Internal Server Error', error });
    }
};




const errorCheckout = async (req, res) => {
    try {
        const orderRazorpayID = req.body.orderId;
        console.log('razorpayId', orderRazorpayID);
        console.log('Failed payment backend');

        const failedOrder = await orderModel.updateOne(
            { orderId: orderRazorpayID },
            {
                $set: {
                    paymentStatus: 'failed',
                    failedPayment: true
                }
            }
        );

        // No need to call save() here, updateOne() already commits the changes
        if (failedOrder.nModified === 0) {
            return res.status(400).json({ success: false, message: 'Order not found or not updated' });
        }

        await Cart.deleteMany({ user_id: userId });
        return res.json({ success: true, message: 'Order updated successfully' });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};





const failedPayment = async (req,res)=>{

    try {
        const orderId = req.params.orderId
        const order = await orderModel.findById(orderId)

        const rzrpayKey = RAZORPAY_ID_KEY
        return res.status(200).json({order , rzrpayKey})
    } catch (error) {
        console.log(error)
    }
}




const paymentContinue = async (req,res)=>{

    const { userId, rzr_orderId } = req.body;
    console.log(userId, rzr_orderId);
    try{
        const order = await orderModel.findOne({ orderId: rzr_orderId });
        console.log(order);
        if(!order) return res.status(404).json({ error: "Order not found" });
        order.failedPayment = false;
        order.paymentStatus = "success";
        const result = await order.save();
        console.log(result)
        if(!result) return res.status(404).json({ error: "Order failed" });
        res.status(200).json({ success: true, message: 'Order Payment was successful.' });
    }catch(err){
        console.error(`Error at paymentPendingPost ${err}`)
    }
}




const addAddress = (req,res)=>{

    try {
        const userLogged = req.session.user ? true : false;
        res.render('user/checkoutAddaddress',{userLogged})

    } catch (error) {
        console.log(error);
    }
}






const checkoutaddressPost = async (req, res) => {
    try {
        const userId = req.session.user._id;

        const parseAndValidateAddress = (body) => {
            const {
                fullname,
                phone,
                email,
                addressLine,
                City,
                state,
                country,
                pincode
            } = body;

            if (
                fullname && phone && email &&
                addressLine && City && state &&
                country && pincode
            ) {
                // Basic validation
                if (!/^\S+@\S+\.\S+$/.test(email)) {
                    throw new Error("Invalid email format");
                }
                if (!/^\d{10}$/.test(phone)) {
                    throw new Error("Phone number must be 10 digits");
                }
                

                return {
                    fullname: fullname.trim(),
                    phone: phone.trim(),
                    email: email.trim(),
                    addressLine: addressLine.trim(),
                    City: City.trim(),
                    state: state.trim(),
                    country: country.trim(),
                    pincode: pincode.trim()
                };
            }
            throw new Error("Missing required address fields");
        };

        let address = parseAndValidateAddress(req.body);

        const addressCheckout = new Address({
            user_id : userId ,
            fullname: address.fullname,
            phone: address.phone,
            email: address.email,
            addressLine: address.addressLine,
            City: address.City,
            state: address.state,
            country: address.country,
            pincode: address.pincode
        });

        await addressCheckout.save();
        return res.status(200).json({ message: 'Address added successfully', redirect: '/checkoutPage' });

    } catch (error) {
        console.error("Error saving address:", error.message || error);
        res.status(500).json({ error: error.message || "Internal server error" });
    }
};





const checkoutPage = async (req, res) => {
    try {
        let userLogged = false; // Initialize userLogged to avoid undefined errors
        if (!req.session.user) {
            userLogged = false;
            return res.redirect('/');
        }

        userLogged = true;
        const userData = req.session.user;
        const userId = userData._id;


        const currentCart = await Cart.findOne({ user_id: userId })
        const cartTotal = currentCart.cartTotal;
        currentCart.subTotal = cartTotal
        currentCart.cartTotal = cartTotal + 50;
    
        await currentCart.save()





        const usercart = await Cart.findOne({ user_id: userId }).populate('products.product').lean();

        if (usercart) {
           
            const zeroQuantityProduct = usercart.products.some(item => item.product.Qty === 0);
            if (zeroQuantityProduct) {
                req.session.qtyZero = 'One or more products in your cart are out of stock';
                return res.redirect('/cart');
            }

            let availableCoupons = [];
            if (cartTotal >= 3000 ) {
                availableCoupons = await Coupon.find({
                }).lean();
            }
            
           
            console.log(availableCoupons);

            // Log coupon details and applied coupon status
            console.log('Coupon Details:', usercart.couponDetails);
            console.log('Applied Coupon:', usercart.couponDetails ? usercart.couponDetails.appliedCoupon : 'No couponDetails');

            let applied = usercart.couponDetails && usercart.couponDetails.appliedCoupon ? true : false;
            console.log('Is coupon applied:', applied);

            const address = await Address.find({ user_id: userId }).lean();
            return res.render('user/checkout', { userLogged, checkout: usercart, address, availableCoupons, applied });
        } else {
            return res.render('user/checkout', { message: 'No cart found for the user', userLogged });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).send('Internal Server Error');
    }
};





const applyCoupon = async (req,res)=>{
    try {
        const couponCode = req.params.enteredCouponCode;

        req.session.appliedCoupon = couponCode || null
        const userId = req.session.user._id;
        const usercart = await Cart.findOne({ user_id: userId }).populate('products.product');

    
        const couponData = await Coupon.findOne({ couponCode: couponCode });
        if (!couponData) {
            console.log("Coupon not found");
            return res.status(400).json({ success: false, message: 'Coupon not found.' });
        }
    
        // Check if the user already used this coupon
        if (couponData.users_used.includes(userId)) {
            return res.status(400).json({ success: false, message: "Coupon has already been applied by the current user." });
        }
    
        // Check if the coupon is already applied
        if (usercart.couponDetails.appliedCoupon === couponCode) {
            return res.status(400).json({ success: false, message: "You have already applied this coupon." });
        }
    
        // Check if the coupon expired
        const currentDate = new Date();
        if (couponData.expiry_date && currentDate > new Date(couponData.expiry_date)) {
            couponData.isExpired = true;
            couponData.coupanStatus = 'Expired';
            await couponData.save();
            return res.status(400).json({ success: false, message: "Coupon has expired." });
        }
    
        console.log("Total amount before discount:", usercart.cartTotal);
        if (usercart.couponDetails.appliedCoupon) {
            let TotalAmount = 0;
            for (const product of usercart.products) {
                    const productDetails = await Product.findById(product.product);
                    TotalAmount += (product.cartCount * productDetails.price);
                
            }
    
            usercart.cartTotal = TotalAmount;
            usercart.originalAmount = TotalAmount; // Set total amount back to the original total
            usercart.appliedCoupon = null; // Clear the applied coupon
            usercart.couponDetails.discountedAmount = 0;
    
            // Save the changes
            await usercart.save();
        }
    
        // Apply the discount
        const { cartTotal } = usercart;
        const { discount_percentage, max_discount_amount } = couponData;
        const discountedAmount = (cartTotal * discount_percentage) / 100;
        const finalDiscountedAmount = Math.min(discountedAmount, max_discount_amount);
        const discountedTotal = Math.round(cartTotal - finalDiscountedAmount);
    
     
        // Update the cart properties
        req.session.totalPrice = discountedTotal; // Assuming you want to update the session total price
        usercart.cartTotal = discountedTotal;
        usercart.couponDetails.appliedCoupon = couponData.couponCode;
        usercart.couponDetails.discountedAmount = finalDiscountedAmount;
    
        // Add the user to the list of users who have used this coupon
        couponData.users_used.push(userId);
    
        // Save the changes
        await usercart.save();
        await couponData.save();
    
     
        return res.status(200).json({
            success: true,
            message: 'Coupon applied successfully!',
            discountedTotal,
            discountedAmount: finalDiscountedAmount,
        });
    } catch (error) {
        console.log("Error applying coupon:", error);
        return res.status(500).json({ success: false, message: 'An error occurred while applying the coupon.' });
    }
}    



const removeCoupon = async (req,res)=>{

    try {

        const couponCode = req.params.couponCode
        const userId = req.session.user._id

        req.session.appliedCoupon = null

        const userCart = await Cart.findOne({user_id : userId})
        if(!userCart){
            return res.status(400).json({ message : 'Cart not found'})
        }

        if (!userCart.couponDetails.appliedCoupon) {
            return res.status(200).json({ success: false, message: 'No applied coupons.' });
        }


        let totalAmount = 0;
        for(const product of userCart.products){
                const productDetail = await Product.findById(product.product)
                totalAmount += (product.cartCount * productDetail.price);
        }

        userCart.cartTotal = totalAmount; // Set totalamount back to the original total
        userCart.couponDetails.appliedCoupon = null; // Clear the applied coupon
        userCart.couponDetails.discountedAmount=0

        await Coupon.findOneAndUpdate({couponCode : couponCode},
            {
                $pull:{
                    users_used : userId
                }
            }

        )

        await userCart.save()
        return res.status(200).json({ success: true, message: 'Coupon removed successfully.' });
    } catch (error) {
        console.log(error)
    }
}




module.exports = { 
     addAddress ,
     checkoutaddressPost ,
     checkoutPage , 
     placeorder , 
     verifyRazorpay , 
     applyCoupon ,
     removeCoupon,
     errorCheckout,
     failedPayment,
     paymentContinue
    }