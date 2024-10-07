const Coupon  = require('../../models/coupon')


const couponsPage = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10; 
        const page = parseInt(req.query.page) || 1; 
        const couponList = await Coupon.find()
            .skip((page - 1) * limit)
            .limit(limit); 
        
        const totalCoupons = await Coupon.countDocuments();
        const totalPages = Math.ceil(totalCoupons / limit);
        const currentDate = new Date();
        await Promise.all(couponList.map(async (coupon) => {
            if (new Date(coupon.expirationDate) < currentDate) {
                await Coupon.deleteOne({ _id: coupon._id });
            }
        }));

        res.render("admin/couponmanagement", {
            coupons: couponList,
            currentPage: page,
            totalPages: totalPages,
            limit,
            errMessage:''
        });
    } catch (error) {
        res.status(500).send("Internal error occurred in coupon");
    }
};

const addCoupons = async (req, res) => {
    try {
        const { code, discount, expirationDate, minAmount, maxAmount } = req.body;
        const existingCoupon = await Coupon.findOne({ code: code });
        if (existingCoupon) {
            return res.status(400).json({ message: 'Coupon code already exists, please use a different one.' });
        }

        const parseMinAmount = parseInt(minAmount);
        const parseMaxAmount = parseInt(maxAmount);

        if (parseMinAmount > parseMaxAmount) {
            return res.status(400).json({ message: 'The minimum amount cannot be greater than the maximum amount.' });
        }

        const newCoupon = new Coupon({
            code,
            discount,
            expirationDate,
            minAmount: parseMinAmount,
            maxAmount: parseMaxAmount,
            isActive: true
        });

        await newCoupon.save();

        return res.status(200).json({ message: 'Coupon added successfully' });
    } catch (error) {
        console.error("An error occurred while adding the coupon:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const editCoupons = async (req, res) => {
    try {
        const id = req.params._id;
        const { code, discount, minAmount, maxAmount, expirationDate } = req.body;

        const coupon = await Coupon.findById(id);
        if (!coupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        coupon.code = code;
        coupon.discount = discount;
        coupon.minAmount = parseInt(minAmount, 10);
        coupon.maxAmount = parseInt(maxAmount, 10);
        coupon.expirationDate = new Date(expirationDate);
        coupon.isActive = true

        await coupon.save();
        res.status(200).json({ message: 'Coupon updated successfully' });
    } catch (err) {
        console.error("An error occurred in Add coupons", err);
        res.status(500).json({ message: 'Server Error' });
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
    couponsPage,
    addCoupons,
    editCoupons,
    deleteCoupons,

}