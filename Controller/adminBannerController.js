const Banner = require('../models/bannerDB')





// BANNER MANAGEMENT


const bannerAdd = async (req, res) => {

    const { title, subTitle, description, redirect } = req.body || {};

    try {

        if (title != "" && subTitle != "" && description != "" && redirect != "") {


            const newBanner = new Banner({

                title: title,
                subTitle: subTitle,
                description: description,
                image: req.files[0] && req.files[0].filename ? req.files[0].filename : "",
                redirect: redirect,
                status: "Active",

            })
            try {
                await newBanner.save()
            } catch (error) {
                console.log('Error while adding banner');
            }
        }
    } catch (error) {

        console.log(error);
    }
};



const banner = (req, res) => {
    res.render('admin/salesReport')
}



module.exports = {
    bannerAdd,
    banner

}
