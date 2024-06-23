const Product = require('../models/productDB')
const sharp = require('sharp')
const fs = require('fs').promises;
const path = require('path');
const User = require('../models/userDB');
const Category = require('../models/category');




// PRODUCT MANAGEMENT


const productManagement = async (req, res) => {

    try {

        if (req.session.admin) {

            const page = parseInt(req.query.page) || 1;
            const limitPerPage = 4;

            const products = await Product.find({})
                .skip((page - 1) * limitPerPage)
                .limit(limitPerPage)
                .lean()

            // Counting total products for pagination
            const totalCount = await Product.countDocuments();

            // Counting total products for pagination
            // Calculating total pages
            const totalPages = Math.ceil(totalCount / limitPerPage);

            if (products) {
                res.render('admin/adminProductlist', { products  , totalPages , page , limitPerPage})
            }
        } else {
            res.redirect('/admin/adminLogout')
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error while listing products');
    }

}


//GET

const productManagementDetail = async (req,res)=>{
    
    try {

        if (req.session.admin) {
            const products = await Product.find({}).lean()
            if (products) {
                res.render('admin/productlistViewMore', { products })
            }
        } else {
            res.redirect('/admin/adminLogout')
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error while listing products');
    }

}


//GET

const addProduct = async (req, res) => {
    try {
        if (req.session.admin) {

            const categories = await Category.find({}).lean()
            res.render('admin/addProduct', {categories})
        } else {
            res.redirect('/admin/adminLogout')
        }

    } catch (error) {
        return res.status(400).json({
            success: false,
            msg: error.message
        })
    }

}


//POST

const uploadProduct = async (req, res) => {
    try {

        if (req.session.admin) {

            const { productName, category, brand, price , oldPrice , offer, CountOfstock ,Ingredients , IdealFor,  description, size , features , tags , deliveryInfo , howTouse} = req.body;
            const trendingStatus = req.body.trending === undefined ? false : true;
            const updateStatus = req.body.update === undefined ? false : true;

            const quantity = Number(req.body.Qty);

            let productStatus;

            console.log(quantity);
            if(quantity === 0 || quantity=== null) {
                productStatus = 'Out of stock';
            } else {
                productStatus = 'In stock';
            }


            
            let uploadedImages = [];
            for (let i = 0; i < req.files.length; i++) {
                const file = req.files[i];

                if (!file || !file.path) {
                    throw new Error('Uploaded file or file path is missing');
                }

                const filename = file.filename;
                const tempImagePath = file.path; // Temporary file path
                const resizedImagePath = `public/images/resized_${filename}`;
                const croppedImagePath = `public/images/cropped_${filename}`;

                // Resize and crop image
                await sharp(tempImagePath)
                    .resize({ width: 500 }) // Resize image to 500px width
                    .extract({ width: 500, height: 500, left: 0, top: 0 }) // Crop image to 500x500 pixels from top-left corner
                    .toFile(croppedImagePath); // Save cropped image

         
                // Remove the temporary file
                try {
                    await fs.unlink(tempImagePath);
                } catch (unlinkError) {
                    console.error('Error deleting temporary file:', unlinkError);
                }

                uploadedImages.push(filename);
            }

            const productData = new Product({
                productName: productName,
                description: description,
                Qty: Qty,
                price: price,
                img1: uploadedImages[0] || "",
                img2: uploadedImages[1] || "",
                img3: uploadedImages[2] || "",
                category: category,
                brand: brand,
                trending: trendingStatus,
                offer: offer,
                status: productStatus,
                isDeleted: false,
                Size: size,
                update: updateStatus,
                oldPrice : oldPrice , 
                CountOfstock : CountOfstock,
                Ingredients : Ingredients,
                IdealFor : IdealFor,
                features : features,
                tags : tags ,
                deliveryInfo : deliveryInfo,
                howTouse : howTouse

            });

            const products = await productData.save();
            if (products) {
                res.redirect('/admin/productManagement');
            } else {
                res.redirect('/admin/addProduct');
            }

        } else {
            res.redirect('/admin/adminLogout')
        }

    } catch (error) {
        console.error('Upload product error:', error);
        res.status(500).send('An error occurred while uploading');
    }
};



//GET

const productEdit = async (req, res) => {

    try {
        if (req.session.admin) {
            const productId = req.params.id
            console.log(productId);
            const categories = await Category.find({}).lean()
            const data = await Product.findById(productId).lean()
            if(data){

                res.render('admin/productEdit', {productId , data , categories })
            }else{
                res.redirect('/admin/productManagement')
            }
           
        } else {
            res.redirect('/admin/adminLogout')
        }
    } catch (error) {
        res.status(500).send('An error while fetching update form');
    }
}



//POST 

const updateProduct = async (req, res) => {
    try {
        if (req.session.admin) {
            const productId = req.params.id;
            const { productName, category, brand, price, oldPrice, offer,  CountOfstock, Ingredients, IdealFor, description, size, features, tags, deliveryInfo, howTouse } = req.body;
            const trendingStatus = req.body.trending === undefined ? false : true;
            const updateStatus = req.body.update === undefined ? false : true;
            const quantity = Number(req.body.Qty);

            let productStatus;

            console.log(quantity);
            if(quantity === 0 || quantity=== null) {
                productStatus = 'Out of stock';
            } else {
                productStatus = 'In stock';
            }



           

            let uploadedImages = [];

            if (req.files.length === 0) {
                // No new images uploaded, fetch existing images
                const existingProduct = await Product.findById(productId).lean();
                if (existingProduct) {
                    uploadedImages = [existingProduct.img1, existingProduct.img2, existingProduct.img3];
                }
            } else {
                // Process uploaded images
                for (let i = 0; i < req.files.length; i++) {
                    const file = req.files[i];

                    if (!file || !file.path) {
                        throw new Error('Uploaded file or file path is missing');
                    }

                    const filename = file.filename;
                    const tempImagePath = file.path; // Temporary file path
                    const croppedImagePath = `public/images/cropped_${filename}`;

                    // Resize and crop image
                    await sharp(tempImagePath)
                        .resize({ width: 500 }) // Resize image to 500px width
                        .extract({ width: 500, height: 500, left: 0, top: 0 }) // Crop image to 500x500 pixels from top-left corner
                        .toFile(croppedImagePath); // Save cropped image

                    // Remove the temporary file
                    try {
                        await fs.unlink(tempImagePath);
                    } catch (unlinkError) {
                        console.error('Error deleting temporary file:', unlinkError);
                    }

                    uploadedImages.push(filename);
                }
            }

            const updatedProduct = await Product.findOneAndUpdate(
                { _id: productId },
                {
                    $set: {
                        productName: productName,
                        description: description,
                        Qty: quantity,
                        price: price,
                        img1: uploadedImages[0] || "",
                        img2: uploadedImages[1] || "",
                        img3: uploadedImages[2] || "",
                        category: category,
                        brand: brand,
                        trending: trendingStatus,
                        offer: offer,
                        status: productStatus,
                        isDeleted: false,
                        Size: size,
                        update: updateStatus,
                        oldPrice: oldPrice,
                        CountOfstock: CountOfstock,
                        Ingredients: Ingredients,
                        IdealFor: IdealFor,
                        features: features,
                        tags: tags,
                        deliveryInfo: deliveryInfo,
                        howTouse: howTouse
                    }
                },
                { new: true }
            );

            if (updatedProduct) {
                return res.redirect('/admin/productManagement');
            } else {
                return res.status(404).json({ message: "Product not found" });
            }
        } else {
            res.redirect('/admin/adminLogout');
        }
    } catch (error) {
        console.error("Error updating product:", error);
        return res.status(500).json({ message: "An error occurred while updating the product" });
    }
};


//GET


const deleteProducts = async (req, res) => {

    try {
        if (req.session.admin) {

            const Delete = await Product.deleteOne({ _id: req.params.id })
            if (Delete) {
                res.redirect('/admin/productManagement')
            } else {
                res.redirect('/admin/productManagement')
            }
        } else {
            res.redirect('/admin/adminLogout')
        }

    } catch (error) {
        console.error("Error updating product:", error);
        return res.status(500).json({ message: "An error occurred while deleting product" });
    }
}


//GET

const softDelete = async (req, res) => {

    try {
        if (req.session.admin) {

            const idForsoft = await Product.updateOne({ _id: req.params.id },
                {
                    $set: {
                        isDeleted: true
                    }
                })

            if (idForsoft) {
                res.redirect('/admin/productManagement')

            } else {
                res.redirect('/admin/productManagement')

            }
        } else {
            res.redirect('/admin/adminLogout')
        }

    } catch (error) {
        console.error("Error updating product:", error);
        return res.status(500).json({ message: "An error occurred while deleting product (soft)" });
    }
}










module.exports = {productManagement , productManagementDetail ,addProduct,uploadProduct,productEdit,updateProduct,deleteProducts,softDelete}
