const mongoose = require('mongoose');
const easyinvoice = require("easyinvoice");
const Order = require('../models/orderSchema');
const Product = require('../models/productDB');
const User = require('../models/userDB');
const Wallet = require('../models/walletSchema')






const successOrder = async (req,res)=>{

    try {
        
        const orderId = req.params.orderId
        const orderSuccess =  await Order.findById(orderId)
       
        res.render('user/successOrder' , {order :orderSuccess , orderId})

    } catch (error) {
        console.log(error)
    }
}







const ordersPage = async (req, res) => {
    try {
        const userLogged = req.session.user ? true : false;
        const orderID = req.query.orderId;

        if (!orderID) {
            return res.status(400).json({ error: "Order ID is required" });
        }

        const orders = await Order.findById(orderID).lean();
        console.log(orders);
        if (!orders) {
            return res.status(404).json({ error: "Order not found" });
        }

        const productIds = orders.products.map(product => product.productId);
        const products = await Product.find({ _id: { $in: productIds } }).lean();

        const orderedProducts = orders.products.map(orderProduct => {
            const productDetail = products.find(p => p._id.equals(orderProduct.productId));
            return {
                ...orderProduct,
                productName: productDetail.productName,
                salesPrice: productDetail.price,
                img1: productDetail.img1,
                productId: productDetail._id,
                orderId: orders._id,
                statusProduct: orderProduct.cancelstatus
            };
        });

        const ordersIndexes = orders.products.length === 1 ? true : false;
        const user = orders.userId;
        const userData = await User.findById(user).lean();

        const statusOrder = orders.orderStatus;
        const isDelivered = statusOrder === 'delivered';
        const isCanceled = statusOrder === 'canceled';

        console.log(isDelivered);
        res.render('user/orders', { 
            ordersIndexes, 
            userLogged, 
            orders, 
            userData, 
            orderID, 
            orderedProducts, 
            isDelivered, 
            isCanceled 
        });
    } catch (error) {
        console.error("Error occurred during orders listing:", error);
        res.status(500).json({ error: "Orders list page render error" });
    }
};







const returnProductOrder = async (req, res) => {
    try {
        const { returnReason, orderId, productId } = req.body;
        const userId = req.session.user?._id;

        if (!userId) {
            return res.status(401).json({ error: "User not authenticated" });
        }

        const order = await Order.findOne({ _id: orderId });

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        const productIndex = order.products.findIndex(product => product.productId.equals(productId));

        if (productIndex === -1) {
            return res.status(404).json({ error: "Product not found in the order" });
        }

        // Update the product and order status
        order.products[productIndex].cancelstatus = 'returned';
        order.products[productIndex].reason = returnReason;
        order.products[productIndex].returned = true;
        order.returnReason = returnReason;

        // If all products are returned, update the overall order status
        if (order.products.every(product => product.returned)) {
            order.orderStatus = 'returned';
        }

        const foundProduct = order.products[productIndex];
        const totalAmount = foundProduct.salesPrice;

        const wallet = await Wallet.findOne({ wallet_user: userId });

        if (!wallet) {
            return res.status(404).json({ error: "Wallet not found" });
        }

        const newTransaction = {
            amount: totalAmount,
            type: 'credited',
            description: 'Order payment',
            canceled: 'order returned'
        };

        wallet.transactions.push(newTransaction);
        wallet.markModified('transactions');
        wallet.balance += totalAmount;
        await wallet.save();
        await order.save();

        res.redirect(`/orderView?orderId=${orderId}`);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "An error occurred while returning the order" });
    }
};







const returnRequest = async (req, res) => {
    const { returnReason } = req.body;
    const orderId = req.params.orderId;
  
    console.log(orderId, returnReason);
    // Validate input
    if (!returnReason || !orderId) {
      return res.status(400).json({ success: false, message: "Return reason and order ID are required." });
    }
  
  
    
    try {
      const returnOrder = await Order.findByIdAndUpdate(orderId, {
        orderStatus: 'processing',
        returnReason : returnReason,
        returnRequest: true
      }, { new: true }); // { new: true } to return the updated document
  
      returnOrder.products.forEach(product => {
        product.cancelstatus = 'processing';
      });
      
        await returnOrder.save()
      if (returnOrder) {
        return res.status(200).json({ success: true, message: "Return request successfully updated.", returnOrder });
      } else {
        return res.status(404).json({ success: false, message: "Order not found." });
      }
    } catch (error) {
      console.error("Error processing return request:", error);
      return res.status(500).json({ success: false, message: "Internal server error." });
    }
  };
  





  const cancelRequest = async (req, res) => {
    try {
        const orderId = req.params.orderId;

        // Validate input
        if (!orderId) {
            return res.status(400).json({ success: false, message: "Order ID is required." });
        }

        const cancel = await Order.findByIdAndUpdate(orderId, {
            orderStatus: 'delivered',
            returnRequest: false,
            returnReason : null

        }, { new: true });

        // If cancel is null, it means the order was not found
        if (!cancel) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        cancel.products.forEach(product => {
            product.cancelstatus = 'delivered';
        });

        req.session.returnRequestReason = null;
        req.session.orderIdReturn = null;

        await cancel.save()
        return res.status(200).json({ success: true, message: "Return request successfully updated.", cancel });

    } catch (error) {
        console.error("Error processing return cancel request:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
}





// const returnOrder = async (req, res) => {
//     try {
//         const { returnReason, orderId } = req.body;
//         const userId = req.session.user._id

//         console.log(orderId, returnReason);
     
//         const order = await Order.findById(orderId);
//         if (!order) {
//             return res.status(404).json({ error: "Order not found" });
//         }

//         // Loop through each product and update its cancelstatus and reason
//         for (let i = 0; i < order.products.length; i++) {
//             await Order.updateOne(
//                 { _id: orderId, [`products.${i}.productId`]: order.products[i].productId },
//                 {
//                     $set: {
//                         [`products.${i}.cancelstatus`]: 'returned',
//                         [`products.${i}.returned`]: true,
//                         [`products.${i}.reason`]: returnReason,
//                     }
//                 }
//             );
//         }


         
//         const totalAmount = order.totalAmount
//         const wallet = await Wallet.findOne({wallet_user : userId})

//            // Create transaction
//            const newTransaction = {
//             amount: totalAmount,
//             type: 'credited',
//             description: 'Order payment',
//             canceled : 'order returned'
//         };

//          wallet.transactions.push(newTransaction);
//          // Mark transactions as modified
//          wallet.markModified('transactions');
//          wallet.balance += totalAmount;
//          await wallet.save();



//         // Update the overall order status if necessary
//         await Order.updateOne(
//             { _id: orderId },
//             { 
//                 $set: { 
//                     orderStatus: 'returned', 
//                     returnReason: returnReason 
//                 }
//             }
//         );
        
//         res.redirect(`/orderView?orderId=${orderId}`);
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: "An error occurred while returning the order" });
//     }
// };




const cancelOrder = async (req, res) => {
    try {
      const orderId = req.body.orderId;
    
      const order = await Order.findById(orderId)
      const paymentMethod = order.paymentMethod
      const userId = req.session.user._id

   

      if (order.orderStatus !== 'returned') {

        const totalAmount = order.totalAmount
        const wallet = await Wallet.findOne({wallet_user : userId})

           // Create transaction
           const newTransaction = {
            amount: totalAmount,
            type: 'credited',
            description: 'Order payment',
            canceled : 'order canceled'
        };

         wallet.transactions.push(newTransaction);
         // Mark transactions as modified
         wallet.markModified('transactions');
         wallet.balance += totalAmount;
         await wallet.save();

    }


      if (order.orderStatus !== 'delivered') {
        try {
          const updatedOrder = await Order.findOneAndUpdate(
            { _id: orderId },
            {
              $set: {
                orderStatus: 'canceled',
                'products.$[elem].cancelstatus': 'canceled', // Update the cancelstatus of the matched element
                'products.$[elem].returned': true // Update the cancelstatus of the matched element
              }
            },
            {
              arrayFilters: [{ 'elem.cancelstatus': { $ne: 'canceled' } }],
              new: true // Return the updated document
            }
          );

          
          console.log('Updated order:', updatedOrder);
        } catch (error) {
          console.error('Error updating order:', error);
        }
      }
    return res.status(200).json({ message: "Order cancelled successfully" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Item already delivered" });
    }
  }
  







const productStatusCancel = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const newStatus = 'canceled';
        const orderId = req.params.orderId;
        const productId = req.params.productId;
        console.log(productId);

        const order = await Order.findOne({ _id: orderId });
        const products = order.products;

        const foundProduct = products.find(product => product.productId.equals(productId));

        if (!foundProduct) {
            return res.status(404).json({ message: 'Product not found in order' });
        }

        const totalAmount = foundProduct.salesPrice;
        const currStatus = foundProduct.cancelstatus;

        if (currStatus !== 'returned') {
            const wallet = await Wallet.findOne({ wallet_user: userId });

            // Create transaction
            const newTransaction = {
                amount: totalAmount,
                type: 'credited',
                description: 'Order payment',
                canceled: 'order canceled'
            };

            wallet.transactions.push(newTransaction);
            // Mark transactions as modified
            wallet.markModified('transactions');
            wallet.balance += totalAmount;
            await wallet.save();
        }

        const orderData = await Order.updateOne(
            { _id: orderId, "products.productId": productId },
            {
                $set: { "products.$.cancelstatus": newStatus }
            }
        );

        if (orderData.nModified === 0) {
            return res.status(404).json({ message: 'Order or Product not found' });
        }

        // Update the overall order status based on the statuses of its products
        const updatedOrder = await Order.findOne({ _id: orderId });
        const allProductsCanceled = updatedOrder.products.every(product => product.cancelstatus === 'canceled');

        if (allProductsCanceled) {
            updatedOrder.orderStatus = 'canceled';
        } 

        await updatedOrder.save();

        res.redirect(`/orderView?orderId=${orderId}`);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred while updating the product status' });
    }
};








const invoice = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId)
                                 .populate('userId')
                                 .populate('products.productId')
                                 .lean();

        if (!order) {
            return res.status(404).send('Order not found');
        }


        
        const invoiceID =  orderId.substring(0 , 9)
        
        const data = {
            documentTitle: 'Order Invoice',
            currency: 'USD',
            taxNotation: 'gst',
            marginTop: 25,
            marginRight: 25,
            marginLeft: 25,
            marginBottom: 25,
            logo: '/Logo/5313c5dfeae341de827bdfebb4154726.png',
            sender: {
                company: 'Ezpano Whiff Pvt Ltd',
                address: 'ezpanowhiffotp@gmail.com',
                city: 'Malappuram',
                zip: '679338',
                state: 'Kerala',
            },
            client: {
                company: `${order.address.fullname}`,
                phone: `${order.address.phone}`,
                address: `${order.address.addressLine}`,
                zip: `${order.address.pincode}`,
                city: `${order.address.City}`,
                state: `${order.address.state}`,
            },
             information: {
                number:  invoiceID,
                date: new Date().toDateString(),
            },
            products: [],
        };

        order.products.forEach(product => {
            data.products.push({
                quantity: `${product.quantity}`,
                description: `${product.productId.productName}`,
                price: `${product.productId.price}`,
            });
        });

        console.log('Invoice Data:', data); // Log the data to verify

        // Generate the PDF
        const result = await easyinvoice.createInvoice(data);

        // Set response headers to trigger a download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="invoice-${order._id}.pdf"`);

        // Send the PDF as a buffer to the response stream
        res.send(Buffer.from(result.pdf, 'base64'));
    } catch (error) {
        console.log('Error generating invoice:', error);
        res.status(500).send('Internal Server Error');
    }
};





module.exports = {

    ordersPage , returnRequest , cancelRequest , cancelOrder , productStatusCancel , successOrder, invoice ,
    returnProductOrder
}