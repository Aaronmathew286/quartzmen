const User = require("../../models/user");
const Product = require("../../models/product");
const Order = require("../../models/order");
const Cart = require("../../models/cart");
const Coupon = require("../../models/coupon");
const Razorpay = require("razorpay");
require('dotenv').config();


const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const razorPaymentPost = async (req, res) => {
    const { amount, currency } = req.body;
    if (!amount || !currency) {
        return res.status(400).json({ error: 'Missing amount or currency in request body' });
    }
    const options = {
        amount,
        currency,
    };
    try {
        const order = await razorpay.orders.create(options);
        res.json({ orderId: order.id });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).send('Internal Server Error');
    }
};

const userCheckout = async (req, res) => {
    try {
        const userData = req.session.user;
        const userProfile = await User.findById(userData);
        if (!userProfile) {
            return res.status(404).send('User profile not found');
        }
        if (!userData) {
            return res.status(400).send('User not authenticated or missing user ID');
        }

        const cart = await Cart.findOne({ user: userProfile }).populate({
            path: 'items.product',
            model: Product
        });
        if (!cart) {
            return res.redirect('/cart')
        }
        const availableCoupons = await Coupon.find({ isActive: true });
        const cartItems = cart.items;
        const cartTotal = cart.grandTotal;
        let discount = 0;
        let selectedCouponCode = null;

        if (req.session.couponCode) {
            const coupon = await Coupon.findOne({ code: req.session.couponCode, isActive: true });
            if (coupon && cartTotal >= coupon.minAmount) {
                discount = coupon.discount > coupon.maxAmount ? coupon.maxAmount : coupon.discount;
                selectedCouponCode = coupon.code;
            }
        }
        const finalTotal = cartTotal - discount;

        res.render('user/checkout', {
            user: userProfile,
            cartItems,
            cartTotal,
            discount,
            finalTotal,
            loggedIn: userData,
            availableCoupons,
            selectedCouponCode
        });
    } catch (error) {
        console.error('Error in userCheckout:', error);
        res.status(500).send('Internal server error');
    }
};

const userCheckoutPost = async (req, res) => {
    const { paymentMethod, name, phone, email, address, city, postalcode, couponCode, paymentStatus, razorpay_payment_id } = req.body;
    const userId = req.session.user;

    try {
        const cart = await Cart.findOne({ user: userId }).populate({
            path: 'items.product',
            model: Product
        });

        if (!cart) {
            return res.redirect('/cart');
        }

        let discount = 0;
        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
            if (coupon && cart.grandTotal >= coupon.minAmount && cart.grandTotal <= coupon.maxAmount && coupon.expirationDate >= Date.now()) {
                discount = (cart.grandTotal * coupon.discount) / 100;
                discount = discount > coupon.maxAmount ? coupon.maxAmount : discount;
            } else {
                return res.status(400).send('Invalid or expired coupon');
            }
        }

        let finalTotal = cart.grandTotal - discount;
        const productStatus = paymentStatus === 'Confirmed' ? 'Pending' : 'Failed';

        const order = new Order({
            user: userId,
            email: email,
            products: cart.items.map(item => ({
                product: item.product._id,
                quantity: item.quantity,
                price: item.product.price,
                totalPrice: item.totalprice,
                productStatus: productStatus
            })),
            address: { name, house: address, city, phone, postalcode },
            paymentInfo: paymentMethod,
            totalAmount: finalTotal,
            coupon: { couponCode, discount },
            paymentStatus: paymentStatus === 'Confirmed' ? 'Confirmed' : 'Failed',
            razorpayPaymentId: razorpay_payment_id || null
        });

        await order.save();

        if (paymentStatus === 'Confirmed') {
            const stockUpdates = cart.items.map(async (item) => {
                const product = await Product.findById(item.product);
                if (!product) {
                    throw new Error(`Product not found for ID: ${item.product}`);
                }
                const orderedQuantity = item.quantity; 
                const currentStock = product.stock; 
                if (isNaN(currentStock) || isNaN(orderedQuantity)) {
                    throw new Error(`Invalid quantities for product ${product.name}: Current stock = ${currentStock}, Ordered quantity = ${orderedQuantity}`);
                }

                const newStockQuantity = currentStock - orderedQuantity;
                if (newStockQuantity < 0) {
                    throw new Error(`Insufficient stock for ${product.name}`);
                }

                return Product.findByIdAndUpdate(
                    product._id,
                    { stock: newStockQuantity }, 
                    { new: true }
                );
            });
            await Promise.all(stockUpdates);
        }
        await Cart.findByIdAndDelete(cart._id);
        return res.redirect(paymentStatus === 'Confirmed' ? '/orderSuccess' : '/orderFailed');
    } catch (error) {
        console.error('Checkout failed:', error);
        if (error.message.includes('Insufficient stock')) {
            return res.status(400).send(error.message);
        }
        if (error.statusCode === 401) {
            return res.status(401).send('Razorpay authentication failed. Check your API keys.');
        }
        res.status(500).send('Error processing checkout');
    }
};

const applyCoupon = async (req, res) => {
    const { couponCode } = req.body;
    const userId = req.session.user
    if (!userId) {
        return res.status(400).json({ message: 'User not authenticated' }); 
    }
    try {
        if (!couponCode) {
            return res.status(400).json({ message: 'Coupon code is required' });
        }

        const cart = await Cart.findOne({ user: userId });

        if (!cart) {
            return res.status(400).json({ message: 'Cart is empty' });
        }

        const coupon = await Coupon.findOne({ code: couponCode, isActive: true });

        if (!coupon) {
            return res.status(400).json({ message: 'Invalid or expired coupon' });
        }
        if (cart.grandTotal < coupon.minAmount ) {
            return res.status(400).json({ message: 'The given amount is less to apply this coupon code.' });
        }
        if (cart.grandTotal > coupon.maxAmount ) {
            return res.status(400).json({ message: 'The given amount exceeds the discount for this coupon code.' });
        }

        const discount = coupon.discount > coupon.maxAmount ? coupon.maxAmount : coupon.discount;
        const finalTotal = cart.grandTotal - discount;

        await coupon.save()
        return res.json({
            success: true,
            discount,
            finalTotal
        });
    } catch (error) {
        console.error('Error applying coupon:', error);
        res.status(500).json({ message: 'Error applying coupon' });
    }
};

const removeCoupon = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.status(400).json({ message: 'User not authenticated' });
        }

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(400).json({ message: 'Cart not found' });
        }

        cart.discount = 0; 
        const finalTotal = cart.grandTotal;

        await cart.save();
        return res.json({
            success: true,
            finalTotal
        });
    } catch (error) {
        console.error('Error removing coupon:', error);
        return res.status(500).json({ message: 'Error removing coupon' });
    }
};

const processWalletPayment = async(req,res) => {
    const { amount } = req.body;
    const userId = req.session.user;
    try {
      const user = await User.findById(userId);
      if (user.wallet < amount) {
        return res.json({ success: false, message: 'Insufficient wallet balance.' });
      }

      user.wallet -= amount;
      user.wallethistory.push({
        process: 'Order Payment',
        amount: amount,
        status: 'Debited',
      });
  
      await user.save();
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'An error occurred.' });
    }
};

const handleFailedPayment = async (req, res) => {
    const { orderId } = req.params; 
    const { paymentId, status } = req.body;
    try {
        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            {
                paymentStatus: status,
                razorpayPaymentId: paymentId,
                "products.$[].productStatus": status === 'Confirmed' ? 'Pending' : 'Failed'
            },
            { new: true }
        );
        if (status === 'Confirmed') {
            const stockUpdates = updatedOrder.products.map(async (item) => {
                const product = item.product; 
                const orderedQuantity = item.quantity; 
                const productDetails = await Product.findById(product);

                if (!productDetails) {
                    throw new Error(`Product with ID ${product} not found`);
                }
                const newQuantity = productDetails.stock - orderedQuantity; 
                if (newQuantity < 0) {
                    throw new Error(`Insufficient stock for ${productDetails.name}`);
                }

                return Product.findByIdAndUpdate(
                    product,
                    { stock: newQuantity }, 
                    { new: true }
                );
            });

            await Promise.all(stockUpdates); 
        }

        res.status(200).send('Payment status updated successfully, products set to ' + (status === 'Confirmed' ? 'Confirmed' : 'Failed'));
    } catch (error) {
        console.error('Error updating payment status:', error);
        res.status(500).send('Error confirming payment: ' + error.message);
    }
};


module.exports = {
    userCheckout,
    applyCoupon,
    removeCoupon,
    userCheckoutPost,
    razorPaymentPost,
    processWalletPayment,
    handleFailedPayment
};
