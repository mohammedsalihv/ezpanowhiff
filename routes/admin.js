const express = require('express')
const admin_routes = express.Router()
const Controller = require('../Controller/adminController')
const store = require('../helpers/multer')
const productController = require('../Controller/productController')
const categoryController = require('../Controller/categoryController')
const adminUserController = require('../Controller/adminUserController')
const bannerController = require('../Controller/adminBannerController')
const adminOrderController = require('../Controller/adminOrderManagement')
const admincouponController = require('../Controller/admincouponController')
const adminOfferController = require('../Controller/adminOfferController')
const user_route = require('./user')





const isAdmin = (req,res,next)=>{

    try {
        
        if(req.session.admin){
            next()
        }else{
            res.redirect('/admin/login')
        }
    } catch (error) {
        console.log(error)
    }
}




// ---------ADMIN LOGIN ---------//

admin_routes.get('/login' , Controller.adminLogin)
admin_routes.get('/adminLogin', Controller.preventing)
admin_routes.get('/adminLogout' , Controller.adminLogout)

admin_routes.post('/adminValidation', Controller.adminLoginValidation)



//---------------Dashbaord-------------------//


admin_routes.get('/adminDashboard' , isAdmin , Controller.homeAdmin)
admin_routes.get('/dashboard/data', isAdmin , Controller.adminDashboard)
admin_routes.get('/dashboard/data/custom?:filterType' , isAdmin , Controller.customDashboard)



// ------------ADMIN  USER CONTROLLER ----------//




admin_routes.get('/listUsers' , isAdmin , adminUserController.userManagement)
admin_routes.get('/deleteUser/:userId', isAdmin , adminUserController.deleteUser)
admin_routes.put('/blockUser/:userId' , isAdmin ,  adminUserController.blockUser)
admin_routes.put('/unBlockUser/:userId', isAdmin ,  adminUserController.unBlockUser)






// --------------ADMIN  PRODUCT CONTROLLER ----------//

admin_routes.get('/productManagement', isAdmin , productController.productManagement)
admin_routes.get('/productManagementDetail/:productId' , isAdmin , productController.productManagementDetail)
admin_routes.get('/productManagement/addProduct', isAdmin , productController.addProduct)
admin_routes.get('/productEdit/:id', isAdmin , productController.productEdit)
admin_routes.get('/deleteProduct/:id',isAdmin , productController.deleteProducts)
admin_routes.get('/deleteSoft/:id' , isAdmin , productController.softDelete)


admin_routes.post('/productUpload', isAdmin ,  store.any() , productController.uploadProduct)
admin_routes.post('/productUpdate/:productId', isAdmin , store.any() , productController.updateProduct)





// -------------- ADMIN CATEGORY CONTROLLER ------------//

admin_routes.get('/categoryManagement', isAdmin , categoryController.categoryManagement)
admin_routes.get('/addCategory', isAdmin , categoryController.addCategory)
admin_routes.get('/editCategory/:id', isAdmin , categoryController.editCategory)
admin_routes.get('/deleteCategory/:id', isAdmin , categoryController.deleteCategory)


admin_routes.post('/addingNewCategory', isAdmin , categoryController.newCategory)
admin_routes.post('/updateCategory/:id',isAdmin ,  categoryController.updateCategory)




// ----------------- Order Management -------------------//

admin_routes.get('/orderManagement' , isAdmin , adminOrderController.orderManagement)
admin_routes.get('/moreOrderData' , isAdmin , adminOrderController.moreOrderData)
admin_routes.post('/acceptReturn', isAdmin, adminOrderController.acceptReturn);
admin_routes.post('/rejectReturn' , isAdmin , adminOrderController.rejectReturn)

admin_routes.post('/ordersUpdate' , isAdmin , adminOrderController.updateOrder)
admin_routes.post('/ordersProductUpdate' , isAdmin , adminOrderController.orderProductUpdate)






// ---------------- COUPAN --------------------//



admin_routes.get('/couponManagement' , isAdmin , admincouponController.couponLists)
admin_routes.get('/addCoupon' , isAdmin , admincouponController.addCouponNew)
admin_routes.get('/editCouponPage/:couponId' , isAdmin , admincouponController.editCouponPage)

admin_routes.post('/couponAdding' , isAdmin , admincouponController.couponNew)
admin_routes.post('/CouponEdited/:couponId' , isAdmin , admincouponController.couponEdited)
admin_routes.post('/listuser/:couponId' , isAdmin , admincouponController.listORunlist)
admin_routes.delete('/couponDelete/:couponId' , isAdmin , admincouponController.deleteCoupon)




// ------------ Offer ------------------------------//


admin_routes.get('/offerManagement' , isAdmin , adminOfferController.offerPage )
admin_routes.get('/addOffer' , isAdmin , adminOfferController.addOffer)

admin_routes.post('/createOffer' , isAdmin , adminOfferController.newOffer)
admin_routes.delete('/offerDelete/:offerId' , isAdmin , adminOfferController.deleteOffer)



//---------------sales report--------------//


admin_routes.get('/salesReport' , isAdmin , Controller.salesReport)
admin_routes.get('/sales-report' , isAdmin , Controller.salesReport)
admin_routes.get('/costum-sales-report/:reportType' , isAdmin , Controller.customSalesReport)
admin_routes.get('/salesReport/pdf/:reportType' , isAdmin , Controller.salesReportPdf)
admin_routes.get('/salesReport/excel/:reportType' , isAdmin , Controller.salesReportExcel)
















module.exports = admin_routes;