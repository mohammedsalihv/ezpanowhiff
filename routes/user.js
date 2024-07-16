const express = require("express");
const user_route = express.Router();
const multer = require('multer');
const Controller = require('../Controller/userController');
const passport = require("../helpers/passport");
const User = require('../models/userDB')
const cartController = require('../Controller/cartController')
const checkoutController = require('../Controller/checkoutController')
const orderController = require('../Controller/orderController')
require('dotenv').config();

user_route.use(passport.initialize());
user_route.use(passport.session());
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });



user_route.get('/google/Verify', passport.authenticate('google', {
    scope: ['email', 'profile']
}));

user_route.get('/userVerification/google', (req, res, next) => {
    passport.authenticate('google', async (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.redirect('/failed'); 
        }
        req.logIn(user, async (err) => {
            if (err) {
                return next(err);
            }
            // Pass the email to the user controller
            await Controller.handleGoogleSuccess(req, res, user.email);
        });
    })(req, res, next);
});




const isBlocked = async (req,res,next)=>{

    if(req.session.user){

        userLogged = true
        const Userdata = req.session.user
        const userID = Userdata._id

        const stsChecking = await User.findById(userID)

        if(stsChecking.block){
            req.session.destroy((err)=>{
                if(err){
                    console.log(err);
                }else{
                    res.render('user/loginPage', {locked : 'Your account has been locked'})
                }
            })
            
        }else{
            next()
        }
        
    }else{
        userLogged = false
        next()
    }

}


const isLogged = (req,res,next)=>{

    try {
        
        if(req.session.user){
            next()
        }else{
            res.redirect('/login')
        }
    } catch (error) {
        console.log(error);
    }
}


// --------- user login & validations ----------//

user_route.get('/' , Controller.UserLogin)
user_route.get('/login', Controller.loginPage)
user_route.get('/signup' , Controller.UserSignup)
user_route.get('/verify', Controller.sendOtp ,  Controller.verify)
user_route.get('/forgotPasswordPage', Controller.forgotPasswordPage)
user_route.get('/userLogout' , isBlocked ,Controller.userLogout)
user_route.get('/signup/post' , Controller.userSignupPost)

user_route.post('/login' , Controller.loginValidation)
user_route.post('/userRegister', Controller.userRegister)
user_route.post('/signup/otp/validate' , Controller.verifyOtp)
user_route.post('/forgotPasswordEmail', Controller.forgotPasswordEmail)
user_route.post('/forgotOTP' , Controller.forgotOTP)




//------- user home & products------------//


user_route.get('/userHome' , isLogged , isBlocked , Controller.homePagerender)
user_route.get('/userProductlist'  ,  Controller.productList)
user_route.get('/searchProducts?:query' , Controller.searchProduct)
user_route.get('/productDetail?:id', Controller.productDetail)
user_route.get('/productListAddtocart?:productId' , isLogged , isBlocked, Controller.productlistAddtocart )
user_route.get('/addTowishlist/:productId' , isLogged , isBlocked, Controller.addToWishlist)
user_route.get('/addTowishlistProductlist/:productId' , isLogged , isBlocked, Controller.addTowishlistProductlist)
user_route.get('/wishlistAddtocart?:productId' , isLogged , isBlocked, Controller.wishlistAddTocart)


user_route.post('/userProductlist', isLogged , isBlocked ,  Controller.productList)
user_route.delete('/deleteWishlist?:productId' , isLogged , isBlocked, Controller.wishlistDelete)


// ----------- user account --------//


user_route.get('/userAccount', isLogged ,  isBlocked , Controller.userAccount)
user_route.get('/ResetPassword' , isLogged , isBlocked , Controller.changePassword)
user_route.get('/editProfileForm', isLogged , isBlocked , Controller.editProfileForm)
user_route.get('/userAccount/addNewaddress' , isLogged , isBlocked ,  Controller.addNewaddress)
user_route.get('/userAccount/EditAddress?:addressId', isLogged , isBlocked ,Controller.editAddress)
user_route.get('/walletPage' , isLogged , isBlocked,  Controller.walletPage)
user_route.get('/wishlistPage' , isLogged , isBlocked, Controller.wishlistPage)
user_route.delete('/userAccount/DeleteAddress/:addressId' , isLogged , isBlocked , Controller.deleteAddress)


user_route.post('/ResetPassword' , isLogged ,  isBlocked , Controller.ResetPassword)
user_route.post('/userAccount/editedProfileData', isLogged , isBlocked ,  Controller.editedProfileData)
user_route.post('/userAccount/newaddressAdding', isLogged , isBlocked , Controller.addingAddress)
user_route.post('/userAccount/addressEditing?:addressId' , isLogged , isBlocked , Controller.editedNewaddress)
user_route.post('/addToWallet' , isLogged , isBlocked, Controller.addToWallet)
user_route.post('/razorpay-verify-wallet' , isLogged , isBlocked, Controller.walletVerifyRazorpay)



// ---------- user cart ---------//

user_route.get('/cart', isLogged , isBlocked ,  cartController.cart)
user_route.get('/user/addTocart?:id' , isLogged , isBlocked ,  cartController.addToCart)
user_route.get('/cart-Clear' , isLogged , isBlocked , cartController.cartClear)

//user_route.post('/updateSelected/:productId' , isLogged , isBlocked ,cartController.updateCheckbox)
user_route.post('/update-cart' , isLogged ,   isBlocked , cartController.changeQuantity);

user_route.delete('/item-delete/:productId' , isLogged , isBlocked ,cartController.cartIteamDelete)




//----------------------checkout --------------------//

user_route.get('/checkoutPage' , isLogged , isBlocked , checkoutController.checkoutPage)
user_route.get('/checkout/Addaddress' ,isLogged , isBlocked ,checkoutController.addAddress)
user_route.get('/failedPayment/:orderId'  , isLogged , isBlocked ,checkoutController.failedPayment )

user_route.post('/rzrpay-verify/:orderCreationId' , isLogged , isBlocked ,  checkoutController.verifyRazorpay)
user_route.post('/checkout/newaddressAdding', isLogged , isBlocked ,  checkoutController.checkoutaddressPost)
user_route.post('/placeorder' , isLogged , isBlocked , upload.none(), checkoutController.placeorder)
user_route.post('/checkout-error', isLogged , isBlocked , upload.none(), checkoutController.errorCheckout)
user_route.post('/payment-pending', isLogged , isBlocked , upload.none(), checkoutController.paymentContinue)



//--------------------Coupons------------------------//

user_route.post('/applyCoupon/:enteredCouponCode' , isLogged , isBlocked, checkoutController.applyCoupon)
user_route.post('/removeCoupon/:couponCode' , isLogged , isBlocked, checkoutController.removeCoupon)



//-----------------------Orders---------------------------//



user_route.get('/successOrder/:orderId' ,isLogged , isBlocked ,  orderController.successOrder)
user_route.get('/orderView?:orderId' , isLogged , isBlocked ,orderController.ordersPage)
user_route.get('/generateInvoice/:orderId', isLogged , isBlocked , orderController.invoice)
user_route.get('/productStatusCancel/:productId/:orderId', isLogged, isBlocked, orderController.productStatusCancel);
user_route.get('/cancelRequest/:orderId',isLogged, isBlocked, orderController.cancelRequest)

user_route.post('/returnProductOrder', isLogged , isBlocked ,orderController.returnProductOrder)
user_route.post('/returnOrderRequest/:orderId', isLogged , isBlocked ,orderController.returnRequest)
user_route.post('/orderCancel' , isLogged , isBlocked , orderController.cancelOrder)


module.exports = user_route