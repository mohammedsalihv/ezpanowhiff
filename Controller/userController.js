const func = require('../routes/user')
const bcrypt = require('bcrypt')
const User = require('../models/userDB')
const Product = require('../models/productDB')
const Address = require('../models/addressDB')
const googleUser = require('../models/googleModel')
const nodemailer = require('nodemailer');
const Order = require('../models/orderSchema')
const Wallet = require('../models/walletSchema');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Wishlist = require('../models/wishlistSchema')
require('dotenv').config();
const Cart = require('../models/cartDB')
const Category = require('../models/category')
const mongoose = require('mongoose');


const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = process.env;

const razorpayInstance = new Razorpay({
    key_id: RAZORPAY_ID_KEY,
    key_secret: RAZORPAY_SECRET_KEY,
});



//GOOGLE AUTH


const handleGoogleSuccess = async (req, res, Email) => {
    try {
        console.log(Email);
        const userEmail = Email
        const userData =  await  User.findOne({email : userEmail})
        if(userData){
            req.session.user = userData
            res.redirect('/userHome')
        }else{
           
            const dataGoogle = await googleUser.findOne({email : userEmail})
            if(dataGoogle){
                req.session.user = dataGoogle
                res.redirect('/userHome')
            }
        }
       
    } catch (error) {
        console.error("Google authentication error", error);
    }
};



const googleFailed = (req,res)=>{

    try {
        res.redirect('/')
    } catch (error) {
        console.error("Google authentication denied", error);
    }
}







// LOGIN & VALIDATION 

const loginPage = (req,res)=>{

    try {
      
        if(req.session.user){
            res.redirect('/userHome')
        }else{
            res.render('user/loginPage')
        }
    } catch (error) {
        console.log(error);
    }
}



const UserLogin = (req, res) => {

    if (req.session.user) {
        res.redirect('/userHome')
   } else {
        res.render('user/landingPage')
   }
}







const loginValidation = async (req, res) => {
    try {

        if (req.session.user) {
            res.redirect('/userHome')
        } else {
            const { email, password } = req.body || {};
            const userData = await User.findOne({ email });

            if (!userData) {
                res.render('user/loginPage', { notExist: 'Invalid user' });
            } else if (userData.block) {
                res.render('user/loginPage', { locked: 'Your account has been blocked' });
            } else {
                const isPasswordValid = await bcrypt.compare(password, userData.password);
                if (isPasswordValid) {
                    req.session.user = userData;
                    const userId = userData._id
                    userLogged = true


                    // Create a Wallet for the user if it doesn't exist
                    const existingWallet = await Wallet.findOne({ wallet_user: userId });
                    if (!existingWallet) {
                        await Wallet.create({
                            wallet_user: userId,
                            balance: 0,
                            transactions: [],
                            pendingOrder: {
                                orderId: null,
                                amount: 0,
                                currency: null,
                            },
                        });
                    }
                    res.render('user/homePage', { userLogged });
                } else {
                    res.render('user/loginPage', { invalidPassword: 'Password does not match' });
                }
            }
        }

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal server error." });
    }
}






// USER REGISTRATION


const UserSignup = (req, res) => {

   if(req.session.user){
     res.redirect('/userHome')
   }else{
       res.render('user/signUp')
   }
}



const userRegister = async (req, res) => {
    try {
        if (req.session.user) {
            return res.redirect('/userHome');
        }

        const { name, email, phone, password, ConfirmPassword } = req.body || {};
        
        if (password !== ConfirmPassword) {
            return res.render('user/signUp', { phoneError: "Passwords do not match" });
        } else if (phone.length !== 10) {
            return res.render('user/signUp', { phoneError: "Phone should be 10 digits long" });
        }else if(name.trim() === ""){
                return res.render('user/signUp', { phoneError: "Name must not be empty or just spaces."});
        }
 
     
        const trimmedemail = email.trim();
        const trimmedpassword = password.replace(/\s+/g, '');
        const trimmedphone = phone.trim();
        const trimmedConfirmPassword = ConfirmPassword.trim();

        if (!trimmedemail || !trimmedpassword || !trimmedphone || !trimmedConfirmPassword) {
            return res.render('user/signUp',{ enterUsername: "Details cannot be empty." });
        }

        const Existed = await User.findOne({ email });
        if (Existed) {
            return res.render('user/signUp',{ existingUser: 'Already member' });
        }

        const passwordErrors = strongPassword(trimmedpassword);
        if (passwordErrors.length > 0) {
            return res.render('user/signUp', { passwordError: passwordErrors });
        }

        const timerValue = await generateAndSendOTP(req, email, name, password, phone);
        res.render('user/verify', { timerValue });
    } catch (error) {
        console.error('Error:', error);
        res.redirect('/');
    }
};




// PASSWORD VALIDATION

const strongPassword = (userPassword) => {
    const specialCharRegex = /[!@#$%^&*()-_+=]/;
    const numberRegex = /\d/;
    const uppercaseRegex = /[A-Z]/;
    const lowercaseRegex = /[a-z]/;
    const errors = [];

    if (!specialCharRegex.test(userPassword)) {
        errors.push("Password must contain at least one special character");
    }
    if (userPassword.length < 8) {
        errors.push("Password must be at least 8 characters long");
    }
    if (!numberRegex.test(userPassword)) {
        errors.push("Password must contain at least one number");
    }
    if (!uppercaseRegex.test(userPassword)) {
        errors.push("Password must contain at least one uppercase letter");
    }
    if (!lowercaseRegex.test(userPassword)) {
        errors.push("Password must contain at least one lowercase letter");
    }
    
    return errors;
};





//Store in session

function generateOTP(req, email, OTP, name, password, phone) {
    try {
        if (!req.session) {
            throw new Error('Session is not available');
        }

        req.session.email = email;
        req.session.otp = OTP;
        req.session.name = name;
        req.session.password = password;
        req.session.phone = phone;
        req.session.otpCreationTime = Date.now();
        return true;
    } catch (error) {
        console.error('Error setting session data:', error);
        return false;
    }
}




// Duration of OTP validity in seconds

const resendOtp = async (req, res) => {
    try {
        const email = req.session.email;
        if (!email) {
            throw new Error('No email found in session');
        }
        const timerValue = await generateAndSendOTP(req, email, req.session.name, req.session.password, req.session.phone);
        console.log('OTP resent successfully');
        res.render('user/verify', { timerValue });
    } catch (error) {
        console.error('Error resending OTP:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};




//  OTP GENERATING


const calculateRemainingTime = (otpCreationTime) => {
    const currentTime = Date.now();
    const elapsedTime = currentTime - otpCreationTime;
    const remainingTime = OTP_EXPIRY_DURATION - Math.floor(elapsedTime / 1000);
    return Math.max(0, remainingTime);
};

const OTP_EXPIRY_DURATION = 30;


const generateAndSendOTP = async (req, email, name, password, phone) => {
    const OTP = Math.floor(1000 + Math.random() * 9000);
    const success = generateOTP(req, email, OTP, name, password, phone);
    if (!success) {
        throw new Error('Failed to generate OTP');
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'ezpanowhiffotp@gmail.com',
            pass: 'vsui jywi lbyp heau'
        }
    });

    const mailOptions = {
        from: 'ezpanowhiffotp@gmail.com',
        to: email,
        subject: 'Your OTP',
        text: `On-Demand Tokencode : ${OTP}`
    };
    await transporter.sendMail(mailOptions);

    const timerValue = calculateRemainingTime(req.session.otpCreationTime);
    return timerValue;
};





///OTP VERIFY

const verifyOtp = async (req, res) => {
    const inputOtp = req.body.otp;
    const validationOtp = req.session.otp;

    try {
        if (parseInt(inputOtp) === validationOtp) {
            // OTP validation successful
            const { name, email, password, phone } = req.session;

            const saltRounds = 10;
            const salt = await bcrypt.genSalt(saltRounds);
            const hashedPassword = await bcrypt.hash(password, salt);

            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.render('user/signUp', { existingUser: 'Already member' });
            } else {
                const newUser = new User({
                    name,
                    email,
                    password: hashedPassword,
                    phone
                });

                await newUser.save();

                // Clear session data after successful registration
                req.session.destroy();

                console.log('User created');
                return res.render('user/loginPage', { accountCreated: 'Successfully completed' });
            }
        } else {
            const timerValue = calculateRemainingTime(req.session.otpCreationTime);
            if (timerValue <= 0) {
                return res.render('user/signUp', { otpExpired: 'OTP expired. Please request a new one.' });
            }
            return res.render('user/verify', {
                invalidOtp: 'Invalid OTP',
                timerValue
            });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};



const verify = (req, res) => {

    res.render('user/verify')
}







// FORGOT PASSWORD


const forgotPasswordPage = (req,res)=>{
    try {
        
        res.render('user/forgotPassword')
    } catch (error) {
        console.log(error);
    }
}



const forgotPasswordEmail = async (req,res)=>{
    try {

        const { forgotPasswordEmail ,forgotPasswordNewOne , forgotPasswordNewOneConfirm }= req.body || {}

        const isValidEmail = await User.findOne({email : forgotPasswordEmail})
        if(isValidEmail){
          
            if(forgotPasswordNewOne !== forgotPasswordNewOneConfirm){
                return res.render('user/forgotPassword' , {validMail : 'Password did not match'})
            }else{

                const trimmedForgotEmail = forgotPasswordEmail.trim();
                const trimmedforgotPasswordNewOne = forgotPasswordNewOne.replace(/\s+/g, '');
                const trimmedforgotPasswordNewOneConfirm = forgotPasswordNewOneConfirm.replace(/\s+/g, '');
        
                if (!trimmedForgotEmail || !trimmedforgotPasswordNewOne  || !trimmedforgotPasswordNewOneConfirm) {
                    return res.render('user/forgotPassword' , {validMail : "Details cannot be empty." });
                }

                const passwordErrors = strongPassword(trimmedforgotPasswordNewOne)
                if (passwordErrors.length > 0) {
                    return res.render('user/forgotPassword', { validMail: passwordErrors });
                }

                const timerValue = await generateAndSendOTPForgot(req , trimmedForgotEmail,trimmedforgotPasswordNewOne);
                res.render('user/forgotOTP', { timerValue });
            }

        }else{
            return res.render('user/forgotPassword' , {validMail : 'Please enter valid email'})
        }
    } catch (error) {
        console.log(error);
    }
}


const generateAndSendOTPForgot = async (req, forgorEmail,forgotPassword) => {
    
    const OTP = Math.floor(1000 + Math.random() * 9000);

    // Calling the function for store OTP in session
    const success = generateOTPForgot(req, forgorEmail, OTP , forgotPassword);
    if (!success) {
        throw new Error('Failed to generate OTP');
    }
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'ezpanowhiffotp@gmail.com',
            pass: 'vsui jywi lbyp heau'
        }
    });

    const mailOptions = {
        from: 'ezpanowhiffotp@gmail.com',
        to: forgorEmail,
        subject: 'Your OTP',
        text: `On-Demand Tokencode : ${OTP}`
    };
    await transporter.sendMail(mailOptions);
    const timerValue = calculateRemainingTime(req.session.otpCreationTime);
    return timerValue;
};


function generateOTPForgot(req, forgotEmail, OTP,forgotPassword) {
    try {
        if (!req.session) {
            throw new Error('Session is not available');
        }

        req.session.forgotEmail = forgotEmail;
        req.session.otp = OTP;
        req.session.forgotPassword = forgotPassword;
        req.session.otpCreationTime = Date.now();
        return true;
    } catch (error) {
        console.error('Error setting session data:', error);
        return false;
    }
}




const forgotOTP = async (req, res) => {
    try {
        const forgotiInputOtp = req.body.forgotiInputOtp;
        const validationOtp = req.session.otp;
        const forgotPassword = req.session.forgotPassword; // Corrected variable name
        const forgotEmail = req.session.forgotEmail; // Corrected variable name

        if (parseInt(forgotiInputOtp) === validationOtp) {
            const saltRounds = 10;
            const salt = await bcrypt.genSalt(saltRounds);
            const hashedPasswordForgot = await bcrypt.hash(forgotPassword, salt);

            const resetting = await User.updateOne({ email: forgotEmail }, { $set: { password: hashedPasswordForgot } });

             try {
                
            if(resetting){

                delete req.session.forgotEmail;
                delete req.session.forgotPassword;
                delete req.session.otp;
                return res.render('user/loginPage', { reset: 'Password reset successfully completed' });
            }
             } catch (error) {
                console.log(error);
             }

               
        } else {
            return res.render('user/forgotOTP', { error: 'Invalid OTP' });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).send('Internal Server Error');
    }
};







// home




const homePagerender = async (req, res) => {
    try {
        if (req.session.user) {
            userLogged = true;
            res.render('user/homePage', {userLogged});
        } else {
            res.redirect('/');
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Home page loading error' });
    }
};






const productList = async (req, res) => {
    const userLogged = req.session.user ? true : false;
    const searchQuery = req.query.query || '';
    let products;

    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limitPerPage = 9;

        // Extracting filter parameters
        const filterBy = req.query.filterBy;
        const sortBy = req.query.sortBy;
        const maxPrice = parseFloat(req.query.maxPrice);
        const minPrice = parseFloat(req.query.minPrice);

        // Initializing query object
        const query = {
            filter: {},
            sort: {}
        };

        // Applying search query
        if (searchQuery) {
            query.filter.productName = { $regex: searchQuery, $options: 'i' };
        }

        // Applying sorting based on sortBy parameter
        if (sortBy) {
            switch (sortBy) {
                case 'lowTohigh':
                    query.sort.price = 1;
                    break;
                case 'highTolow':
                    query.sort.price = -1;
                    break;
                case 'A-z':
                    query.sort.productName = 1;
                    break;
                case 'z-A':
                    query.sort.productName = -1;
                    break;
                case 'featured':
                    query.filter.trending = true;
                    break;
                case 'newArrivals':
                    query.sort.createdAt = -1;
                    break;
                case 'popularity':
                    query.sort.purchaseCount = -1;
                    break;
                case 'rating':
                    query.sort.avgRating = -1;
                    break;
                default:
                    break;
            }
        }

        // Applying category filtering (if any)
        if (filterBy) {
            switch (filterBy) {
                case 'men':
                    query.filter.category = new mongoose.Types.ObjectId('663f97c7874a0c69117c0c41');
                    break;
                case 'women':
                    query.filter.category = new mongoose.Types.ObjectId('663f9a49ea7d8859e45d772f');
                    break;
                case 'featured':
                    query.filter.category = new mongoose.Types.ObjectId('664e366783b1998b6579e88e');
                    break;
                case 'fragrance':
                    query.filter.category = new mongoose.Types.ObjectId('664e361683b1998b6579e884');
                    break;
                case 'top-sales':
                    query.filter.category = new mongoose.Types.ObjectId('664e363883b1998b6579e88a');
                    break;
                case 'newarrivals':
                    query.filter.category = new mongoose.Types.ObjectId('664e369e83b1998b6579e892');
                    break;
                // Add more cases as per your application's categories
                default:
                    break;
            }
        }


        // Applying price filtering
        if (!isNaN(minPrice) && !isNaN(maxPrice)) {
            query.filter.price = { $gte: minPrice, $lte: maxPrice };
        }

        // Fetching products with filters and pagination
        products = await Product.find(query.filter)
            .sort(query.sort)
            .skip((page - 1) * limitPerPage)
            .limit(limitPerPage)
            .lean();

        // Counting total products for pagination
        const totalCount = await Product.countDocuments(query.filter);

        // Calculating total pages
        const totalPages = Math.ceil(totalCount / limitPerPage);

        const addToWishlistProd = req.session.addTowishlistProductlist || null;
        req.session.addTowishlistProductlist = null;

        const addTocartProductList = req.session.msgAddtocartProductlist || null;
        req.session.msgAddtocartProductlist = null;

        // Rendering the template with products and pagination
        res.render('user/userProductlist', {
            products,
            userLogged,
            page,
            totalPages,
            limitPerPage,
            sortBy,
            filterBy,
            maxPrice,
            minPrice,
            addToWishlistProd,
            addTocartProductList
        });

    } catch (error) {
        console.error("Error occurred during product listing:", error);
        res.status(500).json({ error: "Product list page render error" });
    }
};







const searchProduct = async (req, res) => {
    const searchQuery = req.query.query || '';
    console.log('regex', searchQuery);
    try {
        const products = await Product.find({
            productName: { $regex: new RegExp(searchQuery, 'i') }
        }).lean();
        
        console.log(products);
        return res.status(200).json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: "Error fetching products" });
    }
};




const productDetail = async (req, res) => {
    try {
       
        const userLogged = req.session.user ? true : false;
        
       
        const productId = req.query.id;
        if (!productId || !/^[0-9a-fA-F]{24}$/.test(productId)) {
            return res.status(400).send('Invalid Product ID');
        }

     
        const productData = await Product.findOne({ _id: productId }).lean();
        if (!productData) {
            return res.status(404).send('Product Not Found');
        }

        const quantityOfProduct = productData.Qty;
        const CategoryObjId = productData.category;
        
     
       
        const relatedProducts = await Product.find({
            category: CategoryObjId,
            _id: { $ne: productId }
        }).lean();

        const addTowishlistMsg = req.session.addToWishlist || null
        const successMessage = req.session.successMessage || null;
        req.session.successMessage = null; 
        req.session.addToWishlist = null
        
        res.render('user/userProductpage', { 
            userLogged, 
            productData, 
            quantityOfProduct, 
            successMessage, 
            relatedProducts ,
            addTowishlistMsg
        });
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).send('Internal Server Error');
    }
};










//Logout 


const userLogout = (req, res) => {
    req.session.destroy((err) => {

        userLogged = false
        if (err) {
            console.log(err);
        } else {
            res.redirect('/')
        }
    })
}



//changes password

const changePassword = (req,res)=>{
    try {
        if(req.session.user){
            res.render('user/changePassword')
        }else{
            res.redirect('/')
        }
    } catch (error) {
        console.error('Error change password:', error);
        res.status(500).send('Internal Server Err');
    }
}




const ResetPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, cnfrmPassword } = req.body || {}

        const old = currentPassword.trim();
        const New = newPassword.trim();
        const cnfrm = cnfrmPassword.trim();

        // Validation
        if (!old || !New || !cnfrm) {
            return res.render('user/changePassword', { error: 'All fields are required.' });
        }
        if (New !== cnfrm) {
            return res.render('user/changePassword', { error: 'Passwords do not match.' });
        }

        // Fetch user data
        const data = req.session.user;
        if (!data || !data._id) {
            return res.redirect('/');
        }
        const userId = data._id;
        const userData = await User.findById(userId);
        if (!userData || !userData.password) {
            return res.redirect('/');
        }

        // Check if current password is correct
        const oldPassword = userData.password;
        const compared = await bcrypt.compare(old, oldPassword);
        if (!compared) {
            return res.render('user/changePassword', { error: 'Current password is incorrect.' });
        }

        // Update password
        const hashedPassword = await bcrypt.hash(New, 10);
        await User.findByIdAndUpdate(userId, { password: hashedPassword });

        // Success
        return res.redirect('/userAccount');

    } catch (error) {
        console.error('Error while changing the password:', error);
        return res.status(500).send('Internal Server Error');
    }
}


//Edit profile

const editProfileForm = async (req,res)=>{
    try {
        if(req.session.user){

            const userData = req.session.user
            if(userData){
                res.render('user/editProfile',{userData})
            }
        }
    } catch (error) {
        console.error('Error while changing the profile:', error);
        return res.status(500).send('profile editing error');
    }
}



const editedProfileData = async (req, res) => {
    try {
        if (req.session.user) {
            const { name, phone  , email} = req.body || {};
            const userData = req.session.user;
            const userID = userData._id;
            console.log(userID);
            await User.findByIdAndUpdate(userID, {
                $set: {
                    name: name,
                    phone: phone,
                    email : email
                }
            });
            res.redirect('/userAccount');
        } else {
            res.redirect('/');
        }
    } catch (error) {
        console.error('Error while editing the profile:', error);
        return res.status(500).send('Profile editing error');
    }
}


//Account


const userAccount = async (req, res) => {
    try {
        const userLogged = true;
        const data = req.session.user;

        if (data && data._id) {
            const userId = data._id;
            const user = await User.findById(userId).lean();

            // Fetch the user's address based on the user's ID
            const userAddress = await Address.find({ user_id: userId }).lean();

            if (user) {
                const page = parseInt(req.query.page) || 1;
                const limitRow = 6;

                const totalOrders = await Order.countDocuments({ userId });
                const totalPages = Math.ceil(totalOrders / limitRow);

                const orders = await Order.find({ userId })
                    .sort({createdAt : -1})
                    .skip((page - 1) * limitRow)
                    .limit(limitRow)
                    .lean();

                res.render('user/userAccount', {
                    userLogged,
                    user,
                    userAddress,
                    orders,
                    page,
                    totalPages,
                    limitRow,
                });
            } else {
                res.render('user/userAccount', { userLogged, UserProfile: 'User profile unavailable' });
            }
        } else {
            res.render('user/userAccount', { userLogged, UserProfile: 'User profile unavailable' });
        }
    } catch (error) {
        console.error('Error fetching account:', error);
        res.status(500).send('Internal Server Error');
    }
};









// Add new address 

const addNewaddress = async (req,res)=>{
    try {
        if(req.session.user){

          const id = req.params.id
          res.render('user/address' , {id})

        }else{
            res.redirect('/')
        }
    } catch (error) {
        console.error('Error while adding new address:', error);
        res.status(500).send('Internal Server Err');
    }
}





const addingAddress = async (req, res) => {
    try {
        const { fullname , phone , email, addressLine, street, City, state, pincode , country } = req.body || {};
        const userdata = req.session.user
        const userID = userdata._id

        // Find the user by ID
        const user = await User.findById(userID);
        if (!user) {
            return res.status(404).send('User not found');
        }


        // Create a new address document
        const address = new Address({
            fullname : fullname,
            phone : phone,
            email : email,
            addressLine: addressLine,
            street: street,
            City: City,
            state: state,
            country : country,
            pincode: pincode,
            user_id : userID
        });
        // Save the address document
        await address.save();

        // Add the address reference to the user's addresses array
        user.addresses.push(address);
        await user.save();
        // Redirect the user to the user account page
        res.redirect('/userAccount');
    } catch (error) {
        console.error('Error while adding address:', error);
        res.status(500).send('Internal Server Error');
    }
}



//Edit Address

const editAddress = async (req, res) => {
    try {
        if (req.session.user) {
            const addressId = req.query.addressId;
            console.log(addressId);

            if (!addressId) {
                res.redirect('/userAccount');
                return;
            }

            const userData = req.session.user;
            const userId = userData._id;
            const address = await Address.findById(addressId).lean();
            console.log(address);

            if (address) {
                res.render('user/editAddress', { address, addressId });
            } else {
                res.redirect('/userAccount');
            }
        } else {
            res.redirect('/');
        }
    } catch (error) {
        console.error('Error while editing address:', error);
        res.status(500).send('Internal Server Error');
    }
}



const editedNewaddress = async (req, res) => {
    try {
        if (req.session.user) {


            const addressId = req.query.addressId
            console.log(addressId);
            const {fullname , phone , email, addressLine, state, country , City, street, pincode } = req.body || {};
            
            // Assuming userData is directly available in req.session.user
            const userID = req.session.user._id;
            console.log(userID);

            if (userID) {
               
                // Update the address
                const Edited = await Address.findByIdAndUpdate(addressId, {
                    $set: {
                        fullname : fullname,
                        phone : phone ,
                        email : email,
                        addressLine: addressLine,
                        state: state,
                        country : country,
                        City: City,
                        street: street,
                        pincode: pincode
                    }
                });

               if(Edited){
                return res.redirect('/userAccount');
               }else{
                  res.redirect('/userAccount')  
               }
      }else {
               return res.redirect('/userHome');
          }
       } else {
            return res.redirect('/');
        }
   } catch (error) {
       console.error('Error while editing address:', error);
       return res.status(500).send('Internal Server Error');
   }
};






//Delete address 

const deleteAddress = async (req,res)=>{

    try {

        if(req.session.user){
           const addressId = req.params.addressId
           const deleted =  await Address.deleteOne({_id : addressId})
           if(deleted){
            return res.status(200).json({})
           }else{
             return res.status(400).json()
           }
        }else{
            res.redirect('/')
        }
    } catch (error) {
        console.error('Error while deleting address:', error);
        return res.status(500).send('Internal Server Error');
    }
}




// WALLET

const walletPage = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/');
        }

        const userId = req.session.user._id;
        let page = parseInt(req.query.page) || 1; // Ensure page is parsed as a number
        const perPage = 5; // Adjust as needed

        // Fetch wallet data for the user
        const walletData = await Wallet.findOne({ wallet_user: userId }).lean();
        if (!walletData) {
            return res.status(404).json({ message: 'Wallet not found' });
        }

        // Ensure transactions array exists and is an array
        const transactions = walletData.transactions || [];
        if (!Array.isArray(transactions)) {
            return res.status(500).json({ error: 'Transactions data is invalid' });
        }

        // Calculate total number of transactions and total pages
        const totalTransactions = transactions.length;
        const totalPages = Math.ceil(totalTransactions / perPage);

        // Ensure page is within valid range
        page = Math.min(Math.max(page, 1), totalPages); // Clamp page within valid range

        // Calculate start and end indexes for pagination
        const startIndex = (page - 1) * perPage;
        const endIndex = Math.min(startIndex + perPage, totalTransactions);
        
        // Extract transactions for the current page
        const currentPageTransactions = transactions.slice(startIndex, endIndex);

        res.render('user/walletPage', {
            userLogged: true,
            walletData,
            transactions: currentPageTransactions,
            page,
            totalPages,
            isZero: totalTransactions === 0,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};




const addToWallet = async (req, res) => {
    try {
        const userData = req.session.user;
        const userId = userData._id;
        const { amount } = req.body;

        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        const wallet = await Wallet.findOne({ wallet_user: userId });
        if (!wallet) {
            return res.status(400).json({ message: 'You don\'t have a wallet account' });
        }

        const amountInPaise = amount * 100;
        const options = {
            amount: amountInPaise,
            currency: 'INR',
            receipt: `order_receipt_${Date.now()}`,
            payment_capture: 1,
        };

        const order = await razorpayInstance.orders.create(options);
        console.log("order", order);
        res.json({ order, key_id: RAZORPAY_ID_KEY });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};





const walletVerifyRazorpay = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const {
            orderCreationId,
            amount,
            razorpayPaymentId,
            razorpayOrderId,
            razorpaySignature,
        } = req.body.data;

        console.log("Verification Data", orderCreationId, amount, razorpayPaymentId, razorpayOrderId, razorpaySignature);

        const shasum = crypto.createHmac("sha256", RAZORPAY_SECRET_KEY);
        shasum.update(`${orderCreationId}|${razorpayPaymentId}`);
        const digest = shasum.digest('hex');

        if (digest !== razorpaySignature) {
            console.log("Invalid Transaction Signature");
            return res.status(400).json({ msg: 'Transaction not legit' });
        }

        const foundWallet = await Wallet.findOne({ wallet_user: userId });
        if (!foundWallet) {
            return res.status(404).json({ msg: 'Wallet not found' });
        }

        const amountInRupees = amount / 100;
        foundWallet.balance += amountInRupees;
        foundWallet.transactions.push({
            amount: amountInRupees,
            type: 'credited',
            description: 'Top-Up',
        });

        await foundWallet.save();

        res.status(200).json({ message: "Payment added to wallet successfully" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};





const wishlistPage = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/');
        }

        const userLogged = req.session.user ? true : false;
        const userId = req.session.user._id;

        const wishlist = await Wishlist.findOne({ user: userId }).lean();
        if (!wishlist) {
            return res.render('user/wishlistPage', { messageWishlist: 'Wishlist not found', userLogged });
        }
        
        const wishlistData = wishlist.products;  
        if(wishlistData.length === 0){
            return res.render('user/wishlistPage', { messageWishlist: 'Wishlist empty', userLogged });
        }

        const msgAddtocart =  req.session.msgAddtocart || null
        req.session.msgAddtocart = null

        res.render('user/wishlistPage', { userLogged, wishlistData , msgAddtocart});
    } catch (error) {
        console.log(error);
        res.render('error', { error: 'An error occurred while loading the wishlist.' });
    }
};





const addToWishlist = async (req, res) => {
    try {
        const productId = req.params.productId;
        const userData = req.session.user
        const userId = userData._id
         console.log(productId)
         console.log('ord' , userId)
        console.log(userId);
        // Change `const` to `let` since you will reassign `userWishlist`
        let userWishlist = await Wishlist.findOne({ user: userId });
        
        if (!userWishlist) {
            userWishlist = new Wishlist({
                user: userId,
                products: [],
                totalAmount: 0
            });
        }

        const existProduct = userWishlist.products.find(product => product.product.toString() === productId);
        if (existProduct) {
            return res.status(400).json({ message: 'Product already exists in the wishlist' });
        }

        const product = await Product.findById(productId).lean();
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        userWishlist.products.push({
            product: productId,
            productName: product.productName,
            price: product.price,
            statusProduct: product.status,
            img1: product.img1,
            isSelected: false,
            qty : 1
        });

        // Save the changes to the database
        await userWishlist.save();
        req.session.addToWishlist = 'Item added to wishlist successfully';
        
        res.redirect(`/productDetail?id=${productId}`);
    } catch (error) {
        console.error('Error adding product to wishlist:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};




const addTowishlistProductlist = async (req,res)=>{
  
    try {
        const productId = req.params.productId;
        const userData = req.session.user
        const userId = userData._id
         console.log(productId)
         console.log('ord' , userId)
        console.log(userId);
        // Change `const` to `let` since you will reassign `userWishlist`
        let userWishlist = await Wishlist.findOne({ user: userId });
        
        if (!userWishlist) {
            userWishlist = new Wishlist({
                user: userId,
                products: [],
                totalAmount: 0
            });
        }

        const existProduct = userWishlist.products.find(product => product.product.toString() === productId);
        if (existProduct) {
            return res.status(400).json({ message: 'Product already exists in the wishlist' });
        }

        const product = await Product.findById(productId).lean();
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        userWishlist.products.push({
            product: productId,
            productName: product.productName,
            price: product.price,
            statusProduct: product.status,
            img1: product.img1,
            isSelected: false,
            qty : 1
        });

        // Save the changes to the database
        await userWishlist.save();
        req.session.addTowishlistProductlist = 'Item added to wishlist successfully';
        
        res.redirect(`/userProductlist`);
    } catch (error) {
        console.error('Error adding product to wishlist:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}



const productlistAddtocart = async (req,res)=>{
    try {

        const qty = 1
        const productId = req.query.productId
        const userId = req.session.user._id
    
        let usercart = await Cart.findOne({user_id : userId});
        if (!usercart) {
            usercart = new Cart({ user_id: userId, products: [], subTotal: 0, cartTotal: 0 });
        }

        const existingProduct = usercart.products.find((product) => product.product.toString() === productId);
        
        if (existingProduct) {
            existingProduct.cartCount = Number(existingProduct.cartCount) + qty;
        } else {
            usercart.products.push({ product: productId, cartCount: qty });
        }


        await usercart.save();
        req.session.msgAddtocartProductlist = 'Item added to cart successfully';
        res.redirect(`/userProductlist`);
     } catch (error) {
        console.log(error)
     }
}








const wishlistAddTocart = async (req,res)=>{

     try {

        const qty = parseInt(req.query.qty)
        const productId = req.query.productId
        const userId = req.session.user._id
    
        let usercart = await Cart.findOne({user_id : userId});
        if (!usercart) {
            usercart = new Cart({ user_id: userId, products: [], subTotal: 0, cartTotal: 0 });
        }

        const existingProduct = usercart.products.find((product) => product.product.toString() === productId);
        
        if (existingProduct) {
            existingProduct.cartCount = Number(existingProduct.cartCount) + qty;
        } else {
            usercart.products.push({ product: productId, cartCount: qty });
        }


        await usercart.save();
        req.session.msgAddtocart = 'Item added to cart successfully';
        res.redirect(`/wishlistPage`);
     } catch (error) {
        console.log(error)
     }
}






const wishlistDelete = async (req, res) => {
    try {
        const productId = req.query.productId
        const userId = req.session.user._id;
    

        const result = await Wishlist.updateOne(
            { user: userId },
            {
                $pull: { products: { product: productId } }
            }
        );

        if (result.nModified === 0) {
            return res.status(404).json({ message: 'Product not found in wishlist' });
        }

        return res.status(200).json({ message: 'Item successfully deleted' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}







module.exports = {

  handleGoogleSuccess,
    googleFailed , 

    UserLogin,
    loginPage,
    loginValidation,
    UserSignup,
    userRegister,
    resendOtp,
    verifyOtp,
    verify,
    userLogout,
    forgotPasswordPage,
    forgotPasswordEmail,
    forgotOTP,


    homePagerender,
    productList,
    searchProduct,
    productDetail,
    changePassword,
    ResetPassword,


    userAccount,
    editProfileForm,
    editedProfileData,
    addNewaddress,
    addingAddress,
    editAddress,
    editedNewaddress,
    deleteAddress,
    walletPage,
    addToWallet,
    walletVerifyRazorpay,
    wishlistPage,
    addToWishlist,
    wishlistAddTocart,
    wishlistDelete,
    addTowishlistProductlist,
    productlistAddtocart
    


};