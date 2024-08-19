const User = require("../../models/user");
const Product = require("../../models/product");
const Order = require("../../models/order");
const Category = require("../../models/category");
const Cart = require("../../models/cart");
const Coupon = require("../../models/coupon");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { log } = require("console");
const { addCoupons } = require("../admincontroller/couponcontroller");

const userCheckout = async (req, res) => {
    try {
        const loggedIn = req.session.user ? true : false; // Set loggedIn variable
        const userData = req.session.user ? await User.findById(req.session.user) : null;
        const cartData = userData ? await Cart.findOne({ user: userData._id }).populate({
            path: "items.product",
            model: Product
        }) : null;

        if (!cartData || !Array.isArray(cartData.items)) {
            return res.status(500).render('user/checkout', {
                error: 'No products found in the cart.',
                totalAmount: 0,
                razorpayKeyId: process.env.RAZORPAY_KEY_ID,
                discountAmount: 0, // Ensure discountAmount is defined
                loggedIn // Pass loggedIn to EJS template
            });
        }
        const couponApplied = req.session.couponApplied || false;
        let totalAmount = 0;
        let discountAmount = 0;

        cartData.items.forEach(item => {
            const offerPrice = item.product.price - (item.product.price * (item.product.offerPercentage / 100));
            totalAmount += offerPrice * item.quantity;
            discountAmount += (item.product.price - offerPrice) * item.quantity;
        });

        cartData.grandTotal = totalAmount;
        await cartData.save();

        res.render("user/checkout", {
            loggedIn, // Pass loggedIn to EJS template
            totalAmount,
            userData,
            cartData,
            razorpayKey: process.env.RAZORPAY_KEY_ID,
            discountAmount, // Ensure discountAmount is passed
            couponApplied:couponApplied
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal error occurred");
    }
};


const applyCoupon = async (req, res) => {
    const { couponCode } = req.body;
    const { cartData, totalAmount } = req.session; // Assuming cartData is stored in the session
  
    try {
      const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
  
      if (!coupon) {
        return res.status(400).json({ error: 'Invalid or expired coupon' });
      }
  
      if (totalAmount < coupon.minAmount) {
        return res.status(400).json({ error: `Minimum amount for this coupon is ₹${coupon.minAmount}` });
      }

      
  
      let discountAmount = (totalAmount * coupon.discountPercentage) / 100;
      if (discountAmount > coupon.maxAmount) {
        discountAmount = coupon.maxAmount;
      }
  
      req.session.discountAmount = discountAmount;
      req.session.couponCode = couponCode;
  
      res.render("user/checkout",{ message: 'Coupon applied successfully', discountAmount });
    } catch (error) {
      res.status(500).json({ error: 'Something went wrong. Please try again later.' });
    }
  };

const removeCoupon = (req, res) => {
    delete req.session.discountAmount;
    delete req.session.couponCode;
  
    res.render("user/checkout",{ message: 'Coupon removed successfully' });
  };

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
})

const userCheckoutPost = async (req, res) => {
    try {
        console.log(req.body.paymentMethod);
        const userId = req.session.user;
        const { paymentMethod, cartId } = req.body;
        const address = req.body;

        const userData = await User.findById(userId);
        if (!userData) return res.status(404).send("User not found");

        const cartData = await Cart.findById(cartId).populate({
            path: "items.product",
            model: Product
        });

        if (!cartData || !cartData.items || cartData.items.length === 0) return res.status(404).send("Cart not found or empty");

        let overallTotalMoney = 0;
        const products = cartData.items.map((item) => {
            const offerPrice = item.product.originalPrice - (item.product.originalPrice * (item.product.offerPercentage / 100));
            const totalPrice = offerPrice * item.quantity;
            overallTotalMoney += totalPrice;
            return {
                product: item.product._id,
                quantity: item.quantity,
                price: offerPrice,
                totalPrice: totalPrice
            };
        });

        // Razorpay integration:
        if (paymentMethod === 'razorpay') {
            const options = {
                amount: Math.round(overallTotalMoney * 100), // Convert to paise and ensure integer
                currency: 'INR',
                receipt: `receipt_${userId}_${Date.now()}`
            };
            const razorpayOrder = await razorpay.orders.create(options);

            res.json({
                success: true,
                razorpayOrderId: razorpayOrder.id,
                amount: overallTotalMoney,
                currency: 'INR',
                key: process.env.RAZORPAY_KEY_ID,
                name: 'Quartz Men',
                description: 'Order Payment',
                prefill: {
                    name: userData.name,
                    email: userData.email,
                    contact: userData.phone
                },
                notes: {
                    address: 'Your Company Address'
                }
            });
        } else {
            const order = new Order({
                user: userId,
                products: products,
                address: address,
                paymentInfo: paymentMethod,
                totalAmount: overallTotalMoney,
                status: 'Completed'
            });

            await order.save();
            await Cart.findByIdAndDelete(cartId);
            res.redirect("/order");
        }
    } catch (error) {
        console.error("Checkout error:", error);
        res.status(500).send("Internal Server Error");
    }
};


const varifyRazorpayPayment = async(req,res) => {
    try{
        const {razorpay_order_id,razorpay_payment_id,razorpay_signature} = req.body

        const generatedSignature = crypto.createHmac('sha256',process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id} | ${razorpay_payment_id}`)
        .digest('hex');

        if(generatedSignature === razorpay_signature){
            const razorpayOrder = await Order.findOne({razorpayOrder:razorpay_order_id});
            razorpayOrder.status = 'Pending'
            await razorpayOrder.save();
            res.json({success:true})
        }else{
            res.json({success:false})
        }
    }catch(err){
        console.log("An error occured in the razorpayment varification",err)
        res.status(500).send("An error occured in the razorpayment varification")
    }
}





module.exports = {
    userCheckout,
    applyCoupon,
    removeCoupon,
    userCheckoutPost,
    varifyRazorpayPayment,
};
