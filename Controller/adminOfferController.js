const Category = require('../models/category')
const Offer = require('../models/offerSchema')
const Product = require('../models/productDB')




const offerPage = async (req, res) => {
    try {
        const offers = await Offer.find({})
            .populate('product')
            .populate('category')
            .lean();

        if (!offers.length) {
            return res.status(400).json({ message: 'Offers currently unavailable' });
        }

        res.render('admin/adminOffer', { offers });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};





const addOffer = async (req,res)=>{
    try {

        const  Categories = await Category.find({}).lean()
        const  Products = await Product.find({}).lean()
      
        res.render('admin/addOffer' , {Categories , Products})
    } catch (error) {
        console.error(`Error inside Offer get : ${err}`);
    }
}






const newOffer = async (req, res) => {
    try {
        const { product, category, offerType, startDate, offerValue, endDate, description } = req.body || {};

        // Convert dates to proper format
        const start = new Date(startDate);
        const end = new Date(endDate);

  
        // Format dates to ISO strings
        const formattedStart = start.toDateString();
        const formattedEnd = end.toDateString();


        // Prepare data to save
        let data;
        if (product) {
            data = {
                product,
                offerType,
                startDate: formattedStart,
                offerValue,
                endDate: formattedEnd,
                description
            };
        } else if (category) {
            data = {
                category,
                offerType,
                startDate: formattedStart,
                offerValue,
                endDate: formattedEnd,
                description
            };
        } else {
            return res.status(400).json({ success: false, message: 'Either product or category must be provided' });
        }

        const offer = new Offer(data);
        const offerSave = await offer.save();

        if (offerSave) {
            res.json({ success: true, message: 'Offer created successfully' });
        } else {
            res.status(500).json({ success: false, message: 'Failed to create offer' });
        }
    } catch (err) {
        console.error(`Error inside newOffer: ${err}`);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};




const deleteOffer = async (req,res)=>{

    try {
        
        const offerId = req.params.offerId

        await Offer.findByIdAndDelete(offerId)
        return res.status(200).json()
    } catch (error) {
        console.log(error);
    }
}




module.exports = {
    offerPage,
    addOffer,
    newOffer,
    deleteOffer

};