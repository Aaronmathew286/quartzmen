const Order = require('../../models/order')
const User = require('../../models/user');
const Product = require('../../models/product');

const order = async (req, res) => {
    try {
        const orderList = await Order.find();
        const userIds = orderList.map((item) => item.user);
        const users = await User.find({ _id: { $in: userIds } });

        const ordersWithData = orderList.map((order) => {
            const user = users.find((user) => user._id.toString() === order.user.toString());
            return {
                ...order.toObject(),
                user: user,
            };
        });

        const ordersWithDataSorted = ordersWithData.sort((a, b) => b.createdAt - a.createdAt);

        res.render('admin/ordermanagement', { ordersWithDataSorted });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).render('admin/ordermanagement', { errMessage: 'Error fetching the orders' });
    }
};

const orderEdit = async (req, res) => {
    try {
        const status = req.body.status;
        const { itemId, orderId } = req.params;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const item = order.products.find((item) => item._id.toString() === itemId.toString());
        if (!item) {
            return res.status(404).json({ error: 'Item not found in the order' });
        }

        const product = await Product.findById(item.product);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        product.Stock += item.quantity;
        const user = await User.findById(order.user);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.walletbalance += item.price * item.quantity;
        user.wallethistory.push({
            process: 'return from the admin',
            amount: item.price * item.quantity,
        });

        item.status = status;
        await order.save();
        await user.save();
        await product.save();

        res.json({ status });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Error updating order status' });
    }
};

module.exports = {
    order,
    orderEdit,
};
