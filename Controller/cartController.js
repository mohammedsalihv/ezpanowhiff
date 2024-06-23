const express = require('express')
const Cart = require('../models/cartDB')
const User = require('../models/userDB')
const Product = require('../models/productDB')






// Product Adding to cart
const addToCart = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/');
        }

        const productId = req.query.id;
        const quantity = parseInt(req.query.quantity, 10) || 1;
        const size = req.query.size || 100;
        const userId = req.session.user._id;

        let cart = await Cart.findOne({ user_id: userId });

        if (!cart) {
            cart = new Cart({ user_id: userId, products: [], subTotal: 0, cartTotal: 0 });
        }

        const existingProduct = cart.products.find((product) => product.product.toString() === productId);

        if (existingProduct) {
            existingProduct.cartCount = Number(existingProduct.cartCount) + quantity;
        } else {
            cart.products.push({ product: productId, cartCount: quantity, ml: size });
        }
        await cart.save();

        req.session.successMessage = 'Item added to cart successfully';
        res.redirect(`/productDetail?id=${productId}`);
    } catch (error) {
        console.error('Error while adding to cart:', error);
        res.redirect(`/productDetail?id=${productId}`);
    }
};










const cart = async (req, res) => {
    try {
        if (!req.session.user) {
            userLogged= false
            return res.redirect('/')
           
        }

        userLogged = true
        const userId = req.session.user._id;
        // Find cart items with product details
        let userCart = await Cart.findOne({user_id : userId }).populate('products.product').lean();
        if(userCart){
            let cartTotal = 0;
            let subTotal = 0;
            let hasProd
            for (const product of userCart.products) {
                hasProd = true
            
                    const productDetails = await Product.findById(product.product);
                    subTotal += product.cartCount * productDetails.price;
                   
                }
            
            
            cartTotal = subTotal; // Assign subTotal directly to cartTotal
            userCart.cartTotal = cartTotal;

            await Cart.updateOne({ _id: userCart._id }, userCart); // Update cart with new cartTotal
           
            if(hasProd){
                
                const noQty = req.session.qtyZero || null
                req.session.qtyZero = null

                res.render('user/cart' , { noQty , cart: userCart , cartTotal ,  userLogged , userId});
            }else{
                hasProd = false
                res.render('user/cart' , { userLogged , messageNoproducts : 'Your cart is empty'});
            }

        } else {

            res.render('user/cartEmpty' ,  {userLogged})
        }
    } catch (error) {
        console.error('Error while fetching cart page:', error);
        return res.status(500).send('Internal Server Error');
    }
}




// const updateCheckbox = async (req, res) => {
//     try {
//         const userData = req.session.user;
//         const userId = userData._id;
//         const productId = req.params.productId;
        
//         // Find the cart for the user
//         const cart = await Cart.findOne({ user_id: userId });

//         // Toggle isSelected for the specified product
//         cart.products.forEach(product => {
//             if (product.product.toString() === productId) {
//                 product.isSelected = !product.isSelected;
//             }
//         });

//         // Save the updated cart
//         await cart.save();

//         // Calculate the new cart total
//         let cartTotal
//         let subTotal = 0;
//         for (const product of cart.products) {
//             if (product.isSelected) {
//                 const productDetails = await Product.findById(product.product);
//                 subTotal += product.cartCount * productDetails.price;
//             }
//         }

//         // Update the cart total
//         cartTotal = subTotal;
//         cart.cartTotal = cartTotal
//         await cart.save();
      
//         res.status(200).json({ cartTotal });
//     } catch (error) {
//         console.error('Error in updateCheckbox:', error);
//         res.status(500).json({ message: 'Internal Server Error' });
//     }
// };




const changeQuantity = async (req, res) => {
    console.log('RECEIVED');
    try {
        const userId = req.body.userId;
        const count = parseInt(req.body.count);
        const prodId = req.body.prod;

      

        // Find the cart and the specific product within it
        const cart = await Cart.findOneAndUpdate(
            { user_id: userId, 'products.product': prodId },
            { $inc: { 'products.$.cartCount': count } },
            { new: true }
        ).populate('products.product');

        // If cart not found, send an error response
        if (!cart) {
            return res.status(404).json({ error: 'Cart or product not found' });
        }

        // Calculate subtotals and cart total
        cart.products.forEach(product => {
            product.subTotal = product.cartCount * product.product.price;
        });
        cart.cartTotal = cart.products.reduce((acc, product) => acc + product.subTotal, 0);
        await cart.save();

      

        res.status(200).json({ cart });
    } catch (error) {
        console.error('Error updating quantity:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};



const cartIteamDelete = async (req, res) => {


    console.log(req.params.productId)
    try {
        const productIdToDelete = req.params.productId;
        const userId = req.session.user._id;
        

        const user = await Cart.findOne({user_id:userId});
       
        if (user) {  // Check if user and user.cart are defined
            // Filter the user's cart to exclude the selected product
            user.products = user.products.filter(product => product.product.toString() !== productIdToDelete);
            console.log(user.products);

            // Save the updated user to the database
            let subTotal = 0;
            for (const product of user.products) {
                if(product.isSelected){
                const productDetails = await Product.findById(product.product._id);
                subTotal += product.cartCount * productDetails.price;
                }
            }
    
            user.subTotal = subTotal;
    
            // Save the updated cart
            await user.save();

            res.status(200).json({ success: true, message: 'Product removed from the cart.' });
            console.log("item deleted");
            res.status(200)
        } else {
            res.status(404).json({ success: false, message: 'User not found or user.cart is undefined.' });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};






const cartClear = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/');
        }

        const userId = req.session.user._id;

        // Find and delete the cart associated with the user
        await Cart.findOneAndDelete({ user_id: userId });

        // Optionally, you can perform additional actions or send a response
        console.log('Cart cleared successfully');
        return res.redirect('/cart')
    } catch (error) {
        console.error('Error clearing cart:', error);
        return res.status(500).send('Internal Server Error');
    }
};


module.exports = { addToCart , cart , cartIteamDelete , cartClear, changeQuantity}