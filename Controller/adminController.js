const admin = require('../models/admin')
const bcrypt = require('bcrypt')
const Order = require('../models/orderSchema')
const Product = require('../models/productDB')
const Category = require('../models/category')
const User = require('../models/userDB')
const excel4node = require('excel4node');
const PDFDocument = require('pdfkit');
const Coupon = require('../models/couponSchema')










// ADMIN LOGIN

const adminLogin = (req, res) => {

    try {
        if (req.session.admin) {
            res.redirect('/admin/adminDashboard')
        } else {
            res.render('admin/adminLogin')
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred');
    }
}



const preventing = (req, res) => {
    res.redirect('/admin/adminDashboard')
}







// ADMIN CREDENTIAL VALIDATION 

const adminLoginValidation = async (req, res) => {
    try {

        const { email, password } = req.body || {}

           const Admin = await admin.findOne({email})
           if(Admin){

            const validation = await admin.find({});
            let validationEmail, validationPassword;

            validation.forEach(adminData => {
            validationEmail = adminData.email;
            validationPassword = adminData.password;
           });

              if (validationEmail === email && await bcrypt.compare(password, validationPassword)) {

               req.session.admin = email
               res.cookie('sessionID', req.sessionID, { httpOnly: true });
    
               res.redirect('/admin/adminDashboard')
            } else {

                res.render('admin/adminLogin', { InvalidAdmin: 'email or password mismatch' })
            }
        
        }else{
            res.render('admin/adminLogin', {notAdmin : 'Access Denied: You do not have permission to access the admin panel'})
        } 
} catch (error) {
        
        console.error('Error:', error);
        res.status(500).send('An error occurred');
    }
};






// ADMIN DASHBOARD

const adminDashboard = async (req, res) => {
    try {
        if (req.session.admin) {

            const ordersCount = await Order.countDocuments({}).lean()
            const productCounts = await Product.countDocuments({}).lean()
            const categoryCounts = await Category.countDocuments({}).lean()
            const users = await User.countDocuments({}).lean()

            let totalRevenue = await Order.aggregate([
                {
                    $group: {
                        _id: null,
                        totalAmount: { $sum: "$totalAmount" } // Assuming total_amount is the field name
                    }
                },
                {
                    $project: {
                        _id: 0,
                        totalAmount: 1
                    }
                }
            ]);

            const totalAmount = totalRevenue[0].totalAmount;
            


            const products = await Product.find({}).lean()
            const namesOfProducts = products.map(product => product.productName)

            const categories = await Category.find({}).lean()
            const namesOfcategory = categories.map(category => category.categoryName)
             res.render('admin/Dashboard' , {ordersCount , productCounts , categoryCounts , users , totalAmount , namesOfProducts , namesOfcategory})
        } else {
            res.redirect('/admin/login')
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred');
    }
}






const salesReport = async (req, res) => {
    try {
        // Fetch statistics for different periods
        const { dailyStats, monthlyStats, yearlyStats } = await getOrderStats();
      
       return res.render('admin/salesReport', { dailyStats, monthlyStats, yearlyStats });
    } catch (error) {
        console.error("Error fetching sales report:", error);
        return res.status(500).send("Internal Server Error");
    }
};






async function getOrderStats() {
    try {
        const now = new Date();

        // Set up date ranges for daily, monthly, and yearly statistics
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

        // Daily stats
        const dailyOrders = await Order.find({
            createdDate: { $gte: twentyFourHoursAgo }
        });
        const dailyOrderCount = dailyOrders.length;
        const dailyRevenueAmount = dailyOrders.reduce((total, order) => total + order.totalAmount, 0);

        // Monthly stats
        const monthlyOrders = await Order.find({
            createdDate: { $gte: thirtyDaysAgo }
        });
        const monthlyOrderCount = monthlyOrders.length;
        const monthlyRevenueAmount = monthlyOrders.reduce((total, order) => total + order.totalAmount, 0);

        // Yearly stats
        const yearlyOrders = await Order.find({
            createdDate: { $gte: oneYearAgo }
        });
        const yearlyOrderCount = yearlyOrders.length;
        const yearlyRevenueAmount = yearlyOrders.reduce((total, order) => total + order.totalAmount, 0);

        // Return the gathered statistics
        return {
            dailyStats: { dailyOrderCount, dailyRevenueAmount },
            monthlyStats: { monthlyOrderCount, monthlyRevenueAmount },
            yearlyStats: { yearlyOrderCount, yearlyRevenueAmount }
        };
    } catch (error) {
        console.error("Error fetching order stats:", error);
        throw error;
    }
}

  
  


const customSalesReport = async (req,res)=>{
    try{
        let reportType = req.params.reportType, fromDate, toDate;
        const currentDate = new Date();
        if(reportType === 'daily'){
            fromDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1);
            toDate = new Date();
        }else if (reportType === 'weekly') {
            fromDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7);
            toDate = new Date();
        }else if( reportType === 'monthly'){
            fromDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, currentDate.getDate());
            toDate = new Date();
        }else if( reportType === 'yearly'){
            fromDate = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), currentDate.getDate());
            toDate = new Date();
        }else {
            fromDate = req.query.fromDate;
            toDate = req.query.toDate;
        }
        if( new Date(fromDate) >= new Date(toDate)) return res.json({ error: 'start date must be less than end date'});
        let orders = await Order.find({
            deliveredAt: {
                $gte: new Date(fromDate),
                $lte: new Date(toDate)
            }
        }).populate('userId');

        orders = orders.filter(order => order.products.some(product => product.deliverOrder));
        const { dailyStats, monthlyStats, yearlyStats } = await getOrderStats();
        
        const noOfUsers = await usersCount(fromDate, toDate);
        const noOfOrders = await orderCount(fromDate, toDate);
        const revenueAmount = await getRevenueAmount(fromDate, toDate);
        const productsSale = await getTopProductsSale(fromDate, toDate);
        const topCategoryies = await getTopCategories(fromDate, toDate);
        const paymentOptions = await getNoOfPayments(fromDate, toDate);
       const orderStatus = await getProductStatus(fromDate, toDate);
        const data = {noOfOrders, noOfUsers, revenueAmount, productsSale, topCategoryies, paymentOptions , orderStatus};
    
        return res.status(200).json({ message: 'success', orders, dailyStats, monthlyStats, yearlyStats, data });
    }catch(err){
        console.log(err);
}

}




const usersCount = async (fromDate, toDate) => {
    try {
        let query = {};
        if (fromDate && toDate) {
            query = {
                created_at: {
                    $gte: new Date(fromDate),
                    $lte: new Date(new Date(toDate).setHours(23, 59, 59, 999)) // End of the day
                }
            };
        }
        const noOfUsers = await User.countDocuments(query);
        return noOfUsers;
    } catch (error) {
        console.error('Error getting user count:', error);
        throw error;
    }
};








const orderCount = async (fromDate, toDate) => {
    try {
        let query = {};
        if (fromDate && toDate) {
            query = {
                deliveredAt: {
                    $gte: new Date(fromDate),
                    $lte: new Date(new Date(toDate).setHours(23, 59, 59, 999)) // End of the day
                }
            };
        }
        const noOfOrders = await Order.countDocuments(query);
        return noOfOrders;
    } catch (error) {
        console.error('Error getting order count:', error);
        throw error;
    }
};






const getRevenueAmount = async (fromDate, toDate) => {
    try {
        let matchStage = {};
        if (fromDate && toDate) {
            matchStage = {
                deliveredAt: {
                    $gte: new Date(fromDate),
                    $lte: new Date(new Date(toDate).setHours(23, 59, 59, 999)) // End of the day
                }
            };
        }
        const revenueAmount = await Order.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$totalAmount" }
                }
            }
        ]);
        return revenueAmount.length > 0 ? revenueAmount[0].totalAmount : 0;
    } catch (error) {
        console.error('Error getting revenue amount:', error);
        throw error;
    }
};






const getTopProductsSale = async (fromDate, toDate) => {
    try {
        let matchStage = {};
        if (fromDate && toDate) {
            matchStage = {
                deliveredAt: {
                    $gte: new Date(fromDate),
                    $lte: new Date(new Date(toDate).setHours(23, 59, 59, 999)) // End of the day
                }
            };
        }
        const pipeline = [
            { $match: matchStage },
            { $unwind: '$products' },
            {
                $group: {
                    _id: '$products.productId',
                    count: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            {
                $project: {
                    _id: 1,
                    count: 1,
                    productName: { $arrayElemAt: ['$productInfo.productName', 0] }
                }
            }
        ];
        const productsSale = await Order.aggregate(pipeline);
        return productsSale.length > 0 ? productsSale : [{ _id: null, count: 0, productName: 'No Data' }];
    } catch (error) {
        console.error('Error getting top products sale:', error);
        throw error;
    }
};







const getTopCategories = async (fromDate, toDate) => {
    try {
        let matchStage = {};
        if (fromDate && toDate) {
            matchStage = {
                deliveredAt: {
                    $gte: new Date(fromDate),
                    $lte: new Date(new Date(toDate).setHours(23, 59, 59, 999)) // End of the day
                }
            };
        }
        const pipeline = [
            { $match: matchStage },
            { $unwind: '$products' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'products.productId',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            { $unwind: '$productInfo' },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'productInfo.category',
                    foreignField: '_id',
                    as: 'categoryInfo'
                }
            },
            { $unwind: '$categoryInfo' },
            {
                $group: {
                    _id: '$categoryInfo.categoryName',
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    categoryName: '$_id',
                    count: 1,
                    _id: 0
                }
            }
        ];
        const categoriesSale = await Order.aggregate(pipeline);
        return categoriesSale.length > 0 ? categoriesSale : [{ categoryName: 'No Data', count: 0 }];
    } catch (error) {
        console.error('Error getting top categories sale:', error);
        throw error;
    }
};





const getNoOfPayments = async (fromDate, toDate) => {
    try {
        let matchStage = {};
        if (fromDate && toDate) {
            matchStage = {
                deliveredAt: {
                    $gte: new Date(fromDate),
                    $lte: new Date(new Date(toDate).setHours(23, 59, 59, 999)) // End of the day
                }
            };
        }
        const pipeline = [
            { $match: matchStage },
            {
                $group: {
                    _id: "$paymentMethod",
                    count: { $sum: 1 }
                }
            }
        ];
        const noOfPayments = await Order.aggregate(pipeline);
        return noOfPayments.length > 0 ? noOfPayments : [{ _id: 'No Data', count: 0 }];
    } catch (error) {
        console.error('Error getting number of payments:', error);
        throw error;
    }
};







const getProductStatus = async (fromDate, toDate) => {
    try {
        let matchStage = {};
        if (fromDate && toDate) {
            matchStage = {
                deliveredAt: {
                    $gte: new Date(fromDate),
                    $lte: new Date(new Date(toDate).setHours(23, 59, 59, 999)) // End of the day
                }
            };
        }
        const pipeline = [
            { $match: matchStage },
            { $unwind: "$products" },
            {
                $project: {
                    _id: "$products._id",
                    productId: "$products.productId",
                    status: {
                        $cond: {
                            if: { $eq: ["$products.deliverOrder", true] },
                            then: "delivered",
                            else: {
                                $cond: {
                                    if: { $eq: ["$products.orderValid", true] },
                                    then: "shipped",
                                    else: {
                                        $cond: {
                                            if: { $eq: ["$products.returned", true] },
                                            then: "returned",
                                            else: "canceled"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ];
        const productStatus = await Order.aggregate(pipeline);
        return productStatus.length > 0 ? productStatus : [{ _id: 'No Data', count: 0 }];
    } catch (error) {
        console.error('Error getting product status:', error);
        throw error;
    }
};







const salesReportPdf = async (req,res)=>{
    try {
        
        console.log('eeeeeeeeee');
    const reportType = req.params.reportType;
    let fromDate = req.query.fromDate;
    let toDate = req.query.toDate;


    res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="sales-report.pdf"'
    });
    const doc = new PDFDocument({ font: 'Helvetica', margin: 50});
    doc.pipe(res);

    const currentDate = new Date();
    if(reportType === 'daily'){
        fromDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1);
        toDate = new Date();
    }else if (reportType === 'weekly') {
        fromDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7);
        toDate = new Date();
    }else if( reportType === 'monthly'){
        fromDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, currentDate.getDate());
        toDate = new Date();
    }else if( reportType === 'yearly'){
        fromDate = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), currentDate.getDate());
        toDate = new Date();
    }else {
        fromDate = req.query.fromDate;
        toDate = req.query.toDate;
    }

    const no_of_orders = await orderCount(fromDate, toDate);
    const total_revenue = await getRevenueAmount(fromDate, toDate);
    const no_of_users = await usersCount(fromDate, toDate);

    const top_products = await getTopProductsSale(fromDate, toDate);
    const top_categories = await getTopCategories(fromDate, toDate);
    const top_payments = await getNoOfPayments(fromDate, toDate);
    const order_status = await getProductStatus(fromDate, toDate);

    const parameters = [ no_of_orders, total_revenue, no_of_users, top_products, top_categories, top_payments, order_status ];
    genSalesReportPDF(doc, ...parameters);

    doc.end();
    } catch (error) {
        console.log(error)
    }
}


async function genSalesReportPDF(doc, ...parameters) {

    const [no_of_orders, total_revenue, no_of_users, top_products, top_categories, top_payments, order_status] = parameters;

    doc.fontSize(18).font('Helvetica-Bold').text('SALES REPORT', { align: 'center' })
        .moveDown();

    doc.font('Helvetica').fontSize(10).text(`Date : ${new Date(Date.now()).toLocaleDateString()}`, { align: 'right'});

    doc.font('Helvetica-Bold').fontSize(14).text('EzpanoWhiff');
    doc.moveDown(0.3)
        .font('Helvetica')
        .fontSize(8).text(`xyz street`)
        .fontSize(8).text(`NewYork , USA , 00543`)
        .fontSize(8).text(`1800-000-9898`)
        
    generateHr(doc, doc.y + 10);
    
    // orders , revenue and number of users
    doc.moveDown(2);
    doc.font('Helvetica-Bold').moveDown(0.5)
        .text(`Orders : ${no_of_orders}`).moveDown(0.5)
        .text(`Revenue : ${total_revenue}`).moveDown(0.5)
        .text(`Users signup  : ${no_of_users}`);
    generateHr(doc, doc.y + 10);
        
    // top selling products looping
    doc.moveDown(2);
    doc.font('Helvetica-Bold').fontSize(14).text('Top Selling Products');
    doc.font('Helvetica').fontSize(10).moveDown();
    for( let i = 0; i < top_products.length; i++ ){ doc.text(`${i+1} . ${top_products[i].productName} : ${ top_products[i].count }`).moveDown(0.3) }
    generateHr(doc, doc.y + 10);

    // top categories products looping
    doc.moveDown(2);
    doc.font('Helvetica-Bold').fontSize(14).text(`Top Selling Categories`);
    doc.font('Helvetica').fontSize(10).moveDown();
    for( let i = 0; i < top_categories.length; i++ ){ doc.text(`${i+1} . ${top_categories[i].categoryName} : ${ top_categories[i].count }`).moveDown(0.3) }
    generateHr(doc, doc.y + 10);


    // most using payments systems products looping
    doc.moveDown(2);
    doc.font('Helvetica-Bold').fontSize(14).text('Most Using Payment Options');
    doc.font('Helvetica').fontSize(10).moveDown();
    for( let i = 0; i < top_payments.length; i++ ){ doc.text(`${i+1} . ${top_payments[i]._id} : ${ top_payments[i].count }`).moveDown(0.3) }
    generateHr(doc, doc.y + 10);


    // Order status looping
    doc.moveDown(2);
    doc.font('Helvetica-Bold').fontSize(14).text('Order Status');
    doc.font('Helvetica').fontSize(10).moveDown();
    for( let i = 0; i < order_status.length; i++ ){ doc.text(`${i+1} . ${order_status[i]._id} : ${ order_status[i].count }`).moveDown(0.3) }
    generateHr(doc, doc.y + 10);

    return;
}



function generateHr(doc, y) {
    doc
      .strokeColor("#aaaaaa")
      .lineWidth(1)
      .moveTo(50, y)
      .lineTo(550, y)
      .stroke();
  }







  const salesReportExcel = async (req,res)=>{
    try {
        const reportType = req.params.reportType;
        let fromDate = req.query.fromDate;
        let toDate = req.query.toDate;

    const currentDate = new Date();
    if(reportType === 'daily'){
        fromDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1);
        toDate = new Date();
    }else if (reportType === 'weekly') {
        fromDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7);
        toDate = new Date();
    }else if( reportType === 'monthly'){
        fromDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, currentDate.getDate());
        toDate = new Date();
    }else if( reportType === 'yearly'){
        fromDate = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), currentDate.getDate());
        toDate = new Date();
    }else {
        fromDate = req.query.fromDate;
        toDate = req.query.toDate;
    }

    const no_of_orders = await orderCount(fromDate, toDate);
    const total_revenue = await getRevenueAmount(fromDate, toDate);
    const no_of_users = await usersCount(fromDate, toDate);

    const top_products = await getTopProductsSale(fromDate, toDate);
    const top_categories = await getTopCategories(fromDate, toDate);
    const top_payments = await getNoOfPayments(fromDate, toDate);
    const order_status = await getProductStatus(fromDate, toDate);

    const parameters = [ no_of_orders, total_revenue, no_of_users, top_products, top_categories, top_payments, order_status ];

    const workbook = new excel4node.Workbook();
    const headerStyle = workbook.createStyle({
        font: { bold: true }
    });
    const worksheet1 = workbook.addWorksheet('Sheet 1');
    await genExcelReport(worksheet1, headerStyle, ...parameters);

     // Write the workbook to a buffer
     const buffer = await workbook.writeToBuffer();
     
     // Send the buffer as a response
     res.writeHead(200, {
       'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
       'Content-Disposition': 'attachment; filename="sales-report.xlsx"',
       'Content-Length': buffer.length
     });
     res.end(buffer);
    }catch(err){
        console.log(err);
    }
   
  }



  async function genExcelReport(worksheet, headerStyle, no_of_orders, total_revenue, no_of_users, top_products, top_categories, top_payments, order_status) {

    // Add data to the worksheet
    let row = 2, col;
    worksheet.cell(row, 1).string('Sales Report').style(headerStyle);
    // worksheet.removeColumns(3, 1000); // Remove columns from 3 to the end


    worksheet.cell(row += 2, 1).string('No. of Orders');
    worksheet.cell(row, 2).number(no_of_orders);
    worksheet.cell(++row, 1).string('Total Revenue');
    worksheet.cell(row, 2).number(total_revenue);
    worksheet.cell(++row, 1).string('No. of Users');
    worksheet.cell(row, 2).number(no_of_users);

    row += 2;
     // Add top products
     worksheet.cell(row, 1).string('Top Products').style(headerStyle);
     row++;
     top_products.forEach((product, index) => {
         worksheet.cell(row + index, 1).string(`${index + 1}. ${product.productName}`);
         worksheet.cell(row + index, 2).number(product.count);
     });

     // Add top categories
     row += top_products.length + 1;
     worksheet.cell(row, 1).string('Top Categories').style(headerStyle);
     row++;
     top_categories.forEach((category, index) => {
         worksheet.cell(row + index, 1).string(`${index + 1}. ${category.categoryName}`);
         worksheet.cell(row + index, 2).number(category.count);
     });
 
     // Add top payments
     row += top_categories.length + 1;
     worksheet.cell(row, 1).string('Top Payments').style(headerStyle);
     row++;
     top_payments.forEach((payment, index) => {
         worksheet.cell(row + index, 1).string(`${index + 1}. ${payment._id}`);
         worksheet.cell(row + index, 2).number(payment.count);
     });
     
     // Add order status
     row += top_payments.length + 1;
     worksheet.cell(row, 1).string('Order Status').style(headerStyle);
     row++;
     order_status.forEach((status, index) => {
         worksheet.cell(row + index, 1).string(`${status.name}`);
         worksheet.cell(row + index, 2).number(status.count);
     });
  
    return worksheet;
}


// ADMIN LOGOUT


const adminLogout = (req, res) => {
    try {

        req.session.destroy((error) => {

            if (error) {
                console.log(error);
            } else {
                res.redirect('/admin/login')
            }
        })

    } catch (error) {
        console.error("Error:: Logout", error);
        return res.status(500).json({ message: "An error occurred logout" });
    }
}


  


module.exports = {
    adminLogin,
    preventing,
    adminLoginValidation,
    adminLogout,

    adminDashboard,
    salesReport,
    customSalesReport,
    salesReportPdf,
    salesReportExcel,
    //getCouponAppled

}