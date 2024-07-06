const Coupon = require('../models/couponSchema')





const couponLists = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limitPerPage = parseInt(req.query.limit) || 5;

        const totalCoupons = await Coupon.countDocuments({});
        const totalPages = Math.ceil(totalCoupons / limitPerPage);

        const coupons = await Coupon.find({})
            .skip((page - 1) * limitPerPage)
            .limit(limitPerPage)
            .lean();

        res.render('admin/adminCoupons', {
            coupons,
            currentPage: page,
            totalPages,
            limit: limitPerPage
        });
    } catch (error) {
        console.log(error);
        res.status(500).send({ message: 'Internal Server Error' });
    }
};









const addCouponNew = (req,res)=>{

    try {
        res.render('admin/couponAdd' )
    } catch (error) {
        console.log(error)
    }
}





const couponNew = async (req, res) => {

    try {

        
    const { couponCode, Discountpercentage, minimumamount, maximumdiscountamount, expirationDate, description, statusCoupon } = req.body;
    const formattedExpiryDate = expirationDate.substring(0, 10);
    console.log(formattedExpiryDate)
    const coupon = new Coupon({

        couponCode : couponCode,
        description : description,
        discount_percentage : Discountpercentage,
        max_discount_amount : maximumdiscountamount,
        min_discount_amount : minimumamount,
        coupanStatus : statusCoupon,
        expiry_date : formattedExpiryDate
       })

       await coupon.save()   
  
         console.log('Form data received:', req.body);
         res.status(200).json()
         
    } catch (error) {
        console.log(error)
    }

}






const editCouponPage = async (req,res)=>{

    try {
        const couponId = req.params.couponId
        const coupons = await Coupon.findById(couponId).lean()
        if(!coupons){
            res.redirect('/admin/couponManagement')
        }
        res.render('admin/editCoupon' , {coupons})
    } catch (error) {
        console.log(error)
    }
}






const couponEdited = async (req, res) => {
    try {
        const couponId = req.params.couponId;
        const {
            couponCode,
            Discountpercentage,
            minimumamount,
            maximumdiscountamount,
            expirationDate,
            description,
            statusCoupon
        } = req.body || {};

        const updatedCoupon = await Coupon.findByIdAndUpdate(
            couponId,
            {
                $set: {
                    couponCode: couponCode,
                    description: description,
                    discount_percentage: Discountpercentage,
                    max_discount_amount: maximumdiscountamount,
                    min_discount_amount: minimumamount,
                    coupanStatus: statusCoupon,
                    expiry_date: expirationDate
                }
            },
            { new: true, runValidators: true } // options: return the updated document and run schema validators
        );

        if (!updatedCoupon) {
            return res.status(404).send({ message: "Coupon not found" });
        }
        res.redirect('/admin/couponManagement')
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Internal Server Error" });
    }
};




const listORunlist = async (req,res)=>{

    try {
        const couponId = req.params.couponId
        const coupon = await Coupon.findById(couponId)
        if(!coupon){
          return res.status(400).json({
                message : 'Coupon not found'
            })
        }

        coupon.islisted = !coupon.islisted 
        await coupon.save();
        return res.status(200).json({ message: 'Coupon Listed/Unlisted  successfully', islisted: coupon.islisted});
    } catch (error) {
        console.log(error)
    }
}




const deleteCoupon = async (req,res)=>{
    try {
        
        const couponId = req.params.couponId
        const deleteCoupon  = await Coupon.findByIdAndDelete(couponId)

        return res.status(200).json()
    } catch (error) {
        console.log(error)
    }
}





module.exports = {
    couponLists,
    addCouponNew,
    couponNew,
    editCouponPage,
    deleteCoupon,
    couponEdited,
    listORunlist



}