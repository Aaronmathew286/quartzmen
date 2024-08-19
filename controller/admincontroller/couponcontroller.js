const Order = require('../../models/order')
const User = require('../../models/user');
const Product = require('../../models/product');
const Coupon  = require('../../models/coupon')


const coupons = async(req,res) => {
    try{
        const couponList = await Coupon.find();
        const currentDate = new Date();
    
        for(let coupon of couponList){
            if(new Date(coupon.expirationDate) < currentDate && coupon.isActive){
                coupon.isActive = false;
                await coupon.save()
            }
        }
    
        res.render("admin/couponmanagement",{coupons:couponList})
    } catch(error){
        res.status(500).send("Internal error occured in coupon")
    }
}

const addCoupons = async(req, res) => {
    try {
        const { code, discount, expirationDate, minAmount, maxAmount } = req.body;

        // Ensure minAmount is less than maxAmount
        if (minAmount >= maxAmount) {
            return res.status(400).json({ error: "Minimum amount should be less than maximum amount" });
        }

        const coupon = new Coupon({
            code,
            discount,
            expirationDate,
            minAmount,
            maxAmount
        });

        await coupon.save();
        res.redirect("admin/couponmanagement");
    } catch (error) {
        console.error("An error occurred in Add coupons", error);
        res.status(500).send("Internal Error occurred in Add coupons");
    }
}

const editCoupons = async (req, res) => {
    try {
        const id = req.params._id;
        const { code, discount, minAmount, maxAmount, expirationDate } = req.body;

        const coupon = await Coupon.findById(id);
        if (!coupon) {
            return res.status(404).send('Coupon not found');
        }

        coupon.code = code;
        coupon.discount = discount;
        coupon.minAmount = minAmount;
        coupon.maxAmount = maxAmount;
        coupon.expirationDate = expirationDate;

        await coupon.save();
        res.redirect('/admin/couponmanagement');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

const deleteCoupons = async (req, res) => {
    try {
        const id = req.params._id;
        await Coupon.findByIdAndDelete(id);
        res.redirect('/admin/couponmanagement');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};



module.exports = {
    coupons,
    addCoupons,
    editCoupons,
    deleteCoupons,

}