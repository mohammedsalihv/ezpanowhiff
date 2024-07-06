const User = require("../models/userDB")
const bcrypt = require('bcrypt')




const userManagement = async (req, res) => {
    if (req.session.admin) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limitPerPage = parseInt(req.query.limit) || 5;

            // Count the total number of documents
            const totalUsers = await User.countDocuments({});
            const totalPages = Math.ceil(totalUsers / limitPerPage);

            // Fetch the data for the current page
            const userData = await User.find({})
                .skip((page - 1) * limitPerPage)
                .limit(limitPerPage)
                .lean();

            // Pass the data and pagination info to the template
            res.render('admin/adminUserlist', {
                userData,
                page,
                totalPages,
                limitRow: limitPerPage
            });
        } catch (error) {
            console.error('Error fetching user data:', error);
            res.status(500).send('Internal Server Error');
        }
    } else {
        res.redirect('/admin/adminLogout');
    }
};


//GET


const deleteUser = async (req, res) => {

    try {
        const _id = req.params.userId
        await User.deleteOne({ _id })
        res.redirect('/admin/listUsers')

    } catch (error) {
        console.log(error + 'Error while deleting')
    }

}


//GET


const blockUser = async (req, res) => {

    try {
        await User.findByIdAndUpdate({ _id: req.params.userId }, {
            $set: {
                block: true
            }
        })

        return res.status(200).json({success : true , message : 'Blocked'})
        
    } catch (error) {

        return res.status(400).json({
            success: false,
            msg: error.mesaage
        })
    }
}


//GET

const unBlockUser = async (req, res) => {

    try {

        await User.findByIdAndUpdate({ _id: req.params.userId }, {
            $set: {
                block: false
            }
        })

        return res.status(200).json({success : true , message : 'Unblocked'})

    } catch (error) {
        return res.status(400).json({
            success: false,
            msg: error.message
        })
    }
}







module.exports = {

    userManagement,
    deleteUser,
    blockUser,
    unBlockUser,

}









