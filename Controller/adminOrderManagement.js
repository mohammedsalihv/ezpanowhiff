
const Order = require('../models/orderSchema')
const Product = require('../models/productDB')




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
        };

        req.session.idOrder = orderDetails.orderId;
        
        const reasons = orderedProducts.map(product => product.returnReason);
        const  reasonReturn = reasons[0]
        console.log(reasons); // Log the reasons for debugging

        // Uncomment the following line to render the response
        res.render('admin/moreOrder', { 
            orderDetails,
            statusOf: orderDetails.orderStatus,
            reasonReturn
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





module.exports = {
    orderManagement,
    updateOrder,
    moreOrderData,
    orderProductUpdate
}