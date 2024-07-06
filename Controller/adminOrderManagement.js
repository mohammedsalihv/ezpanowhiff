
const Order = require('../models/orderSchema')
const Product = require('../models/productDB')
const Wallet = require('../models/walletSchema')



const orderManagement = async (req, res) => {
    try {
        if (!req.session.admin) {
            return res.redirect('/');
        }


        
        const page = parseInt(req.query.page) || 1;
        const limitPerPage = 5;


        const orders = await Order.find({})
        .sort({ createdAt: -1 })
        .skip((page - 1) * limitPerPage)
        .limit(limitPerPage)
        .lean()

   
          // Counting total products for pagination
          const totalCount = await Product.countDocuments();

          // Counting total products for pagination
          // Calculating total pages
          const totalPages = Math.ceil(totalCount / limitPerPage);

       
        
        res.render('admin/adminOrders', { orders , totalPages , page , limitPerPage});
    } catch (error) {
        console.log(error);
        res.status(500).send('An error occurred');
    }
};



const moreOrderData = async (req, res) => {
    try {
        const orderId = req.query.orderId;

        // Fetch the order details
        const orderData = await Order.findOne({ _id: orderId }).sort({ date: -1 }).lean();

        if (!orderData) {
            return res.status(404).send('Order not found');
        }

        // Extract product IDs from the order
        const productIds = orderData.products.map(product => product.productId);

        // Fetch product details
        const products = await Product.find({ _id: { $in: productIds } }).lean();

        // Map the product details to the ordered products
        const orderedProducts = orderData.products.map(orderProduct => {
            const productDetail = products.find(p => p._id.equals(orderProduct.productId));
            if (!productDetail) {
                console.log(`Product with ID ${orderProduct.productId} not found in products collection`);
                return orderProduct; // Skip adding product details if not found
            }
            return {
                ...orderProduct,
                productName: productDetail.productName,
                salesPrice: productDetail.price,
                img1: productDetail.img1,
                status: orderProduct.cancelstatus, 
                returnReason: orderProduct.reason,
            };
        });



        
        // Consolidate data into a single order object
        const orderDetails = {
            orderId: orderData._id,
            orderDate: orderData.date,
            orderStatus: orderData.orderStatus,
            paymentMethod: orderData.paymentMethod,
            totalAmount: orderData.totalAmount,
            address: orderData.address,
            products: orderedProducts,
            OrderedDate: orderData.OrderedDate,
            returnReason : orderData.returnReason,
            ID : orderData._id,
            requestTrue : orderData.returnRequest,
            userId : orderData.userId
        };

        
        req.session.idOrder = orderDetails.orderId;
        const reasons = orderedProducts.map(product => product.returnReason);
        const  reasonReturn = reasons[0]
        


       

       
        res.render('admin/moreOrder', { 
            orderDetails,
            statusOf: orderDetails.orderStatus,
            reasonReturn : orderDetails.returnReason,
            ID : orderDetails.ID
             
        });
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
};



const updateOrder = async (req, res) => {
    try {
        const orderId = req.body.orderId;
        const newStatus = req.body.newStatus;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).send("Order not found");
        }

        // Assuming product is an array and we need to update all products
        order.products.forEach(product => {
            if (newStatus === 'delivered') {
                product.deliverOrder = true;
                order.deliveredAt = Date.now()
            } else if (newStatus === 'shipped') {
                product.orderValid = true;
            } else if (newStatus === 'returned') {
                product.returned = true;
            }
        });

        order.orderStatus = newStatus;
        await order.save();

        res.redirect(`/admin/moreOrderData?orderId=${orderId}`);
    } catch (error) {
        console.error("Error updating order st:", error);
        res.status(500).send("Error updating order status");
    }
}





const orderProductUpdate = async (req, res) => {
    try {
        const { productId, newStatus } = req.body;
        const idOrder = req.session.idOrder;

        // Validate inputs
        if (!idOrder || !productId || !newStatus) {
            return res.status(400).send('Missing required fields: idOrder, productId, or newStatus');
        }

        req.session.idOrder = null;

        const validStatuses = ['delivered', 'shipped', 'returned', 'canceled'];
        if (!validStatuses.includes(newStatus)) {
            return res.status(400).send('Invalid order status');
        }

        const order = await Order.findById(idOrder);

        if (!order) {
            return res.status(404).send('Order not found');
        }

        // Update products based on new status
        order.products.forEach(product => {
            if (product._id.toString() === productId) {
                if (newStatus === 'delivered') {
                    product.deliverOrder = true;
                    order.deliveredAt = Date.now();
                } else if (newStatus === 'shipped') {
                    product.orderValid = true;
                } else if (newStatus === 'returned' || newStatus === 'canceled') {
                    product.returned = true;
                }
                product.cancelstatus = newStatus;  // Ensure this field is updated in the product
            }
        });

        order.orderStatus = newStatus;

        await order.save();

        res.redirect(`/admin/moreOrderData?orderId=${idOrder}`);
    } catch (error) {
        console.error('Error updating order product status:', error);
        res.status(500).send('Internal Server Error');
    }
};





const acceptReturn = async (req, res) => {
    try {
        const orderId = req.body.orderId;
        const userId = req.body.userId

        console.log(orderId, userId);

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // Loop through each product and update its cancelstatus and other necessary fields
        for (let i = 0; i < order.products.length; i++) {
            await Order.updateOne(
                { _id: orderId, [`products.productId`]: order.products[i].productId },
                {
                    $set: {
                        [`products.${i}.cancelstatus`]: 'returned',
                        [`products.${i}.returned`]: true,
                        'returnRequest': false,
                        'acceptRequest': true
                    },
                }
            );
        }

        const totalAmount = order.totalAmount;
        const wallet = await Wallet.findOne({ wallet_user: userId });

        if (!wallet) {
            return res.status(404).json({ error: "Wallet not found" });
        }

        // Create transaction
        const newTransaction = {
            amount: totalAmount,
            type: 'credited',
            description: 'Order payment',
            canceled: 'order returned'
        };

        wallet.transactions.push(newTransaction);
        // Mark transactions as modified
        wallet.markModified('transactions');
        wallet.balance += totalAmount;
        await wallet.save();

        // Update the overall order status if necessary
        await Order.updateOne(
            { _id: orderId },
            { 
                $set: { 
                    orderStatus: 'returned', 
                }
            }
        );

        
        return res.status(200).json({ success: true, message: 'Request accepted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "An error occurred while processing the return" });
    }
};



const rejectReturn = async (req, res) => {
    try {
        const { orderId } = req.body;

        if (!orderId) {
            return res.status(400).json({ success: false, message: "Order ID is required." });
        }

        const order = await Order.findByIdAndUpdate(orderId, {
            orderStatus: 'delivered',
            returnReason: null,
            returnRequest: false,
            rejectRequest: true
        }, { new: true });

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        order.products.forEach(product => {
            product.cancelstatus = 'delivered';
        });

        await order.save();

        return res.status(200).json({ success: true, message: "Return request successfully updated.", order });
    } catch (error) {
        console.error("Error in rejectReturn:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
}




module.exports = {
    orderManagement,
    updateOrder,
    moreOrderData,
    orderProductUpdate,
    acceptReturn,
    rejectReturn
}