const User = require("../../models/user")
const Order = require("../../models/order")
const Product = require("../../models/product")
const Category = require("../../models/category")


const orderPage=async(req,res)=>{
    try {
        const userId = req.session.user;
        const page = parseInt(req.query.page) || 1; // Get current page from query params or default to 1
        const limit = 5; // Number of orders per page
        const skip = (page - 1) * limit; // Calculate how many orders to skip

        // Fetch paginated orders for the user
        const orders = await Order.find({ user: userId })
            .skip(skip)
            .limit(limit)
            .populate({
                path: 'products.product',
                model: Product,
            });

        // Get total number of orders for pagination
        const totalOrders = await Order.countDocuments({ user: userId });
        const totalPages = Math.ceil(totalOrders / limit);

        res.render('user/order', {
            orders,
            currentPage: page,
            totalPages: totalPages,
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
};

const cancelOrder = async(req,res) => {

    const {orderId,productId} = req.params;
    try {
        const order = await Order.findById(orderId);
        const product = order.products.find(p => p.productId.toString() === productId);

        if(!product){
            res.render("user/order",{errMessage:"There is no product schema"});
        }
        order.products = order.products.filter((p) => p.productId.toString() !== productId);
        order.totalPrice -=(item.product.originalPrice - (item.product.originalPrice * (item.product.offerPercentage / 100))) * product.quantity;

        await order.save();

    }catch(err) {
        res.status(500).send(err.message);
    }

};

const returnOrder = async(req,res) => {

    try {
        const productId = req.params.productId;
        const orderId = req.params.orderId;

        const order = await Order.findById(orderId);
        const product = order.products.find(p => p.productId.toString() === productId);

        if (!product) return res.status(404).send('Product not found in order');

        // Update the product quantity
        await Product.findByIdAndUpdate(productId, { $inc: { quantity: product.quantity } });

        // Remove the product from the order
        order.products = order.products.filter(p => p.productId.toString() !== productId);
        order.totalPrice -= (product.originalPrice - (product.originalPrice * (product.offerPercentage / 100))) * product.quantity;

        await order.save();

        res.redirect('/order');
    } catch (err) {
        console.error("return error ",err)
        res.status(500).send("Internal error occured in the return order");
    }
};



module.exports = {
    orderPage,
    cancelOrder,
    returnOrder
}