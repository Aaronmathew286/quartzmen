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
            const offerPrice = cartData.grandTotal
            console.log("This is the offerprice: ",offerPrice)
            totalAmount += offerPrice
        });

        console.log("The amount in the totalamount is :",totalAmount);
        console.log("This is the discount amount: ",discountAmount);

        cartData.grandTotal = totalAmount;
        await cartData.save();

        res.render("user/checkout", {
            loggedIn:userData, // Pass loggedIn to EJS template
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
        const user = req.session.user;

        // Initialize userData before logging or using it
        const userData = await User.findById(user);
        console.log("This is the user details: ", userData);

        if (!userData) {
            return res.status(404).send("User not Found");
        }

        const {paymentMethod, cartId, address} = req.body;

        const cartData = await Cart.findById(cartId).populate({
            path: "items.product",
            model: Product
        });

        console.log("This is the cart's details included:", cartData);
        if (!cartData || !cartData.items || cartData.items.length < 1) {
            return res.status(404).send("Cart details are not found");
        }

        let overallTotalMoney = 0;
        const products = cartData.items.map((item) => {
            const totalPrice = item.product.price * item.quantity;
            console.log("This is the total price in the checkout page:", totalPrice);
            overallTotalMoney += totalPrice;
            return {
                product: item.product._id,
                quantity: item.quantity,
                price: item.product.price,
                totalPrice: totalPrice
            };
        });

        if (paymentMethod === 'cash_on_delivery') {
            if (overallTotalMoney < 500 || overallTotalMoney > 8000) {
                return res.status(400).send("Cash on Delivery is only available for orders between ₹500 and ₹8000. Please choose Razorpay for this order.");
            }

            // Create the order with COD
            const order = new Order({
                user: userData._id,
                products: products,
                address: address,
                paymentInfo: paymentMethod,
                totalAmount: overallTotalMoney,
                status: 'Pending'
            });

            await order.save();
            await Cart.findByIdAndDelete(cartId);
            return res.redirect("/order");
        } else if (paymentMethod === 'razorpay') {
            const options = {
                amount: Math.round(overallTotalMoney * 100),
                currency: 'INR',
                receipt: `receipt_${userData._id}_${Date.now()}`
            };
            const razorpayOrder = await razorpay.orders.create(options);

            return res.json({
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
