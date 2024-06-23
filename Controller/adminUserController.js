const User = require("../models/userDB")
const bcrypt = require('bcrypt')





const userManagement = async (req, res) => {

    if (req.session.admin) {
        try {
            userData = await User.find({}).lean()
            res.render('admin/adminUserlist', { userData });
        } catch (error) {
            console.error('Error fetching user data:', error);
            res.status(500).send('Internal Server Error');
        }
    } else {
        res.redirect('/admin/adminLogout')
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

        return res.redirect('/admin/listUsers')

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

        return res.redirect('/admin/listUsers')

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









