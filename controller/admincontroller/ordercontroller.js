const Order = require('../../models/order')
const User = require('../../models/user');
const Product = require('../../models/product');

const adminOrdersPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const limit = 10; 
        const skip = (page - 1) * limit; 

        const orderList = await Order.find()
            .populate({
                path: 'products.product',
                model: Product,
            })
            .sort({ createdAt: -1 }) 
            .skip(skip) 
            .limit(limit);

        const userIds = orderList.map((item) => item.user);
        const users = await User.find({ _id: { $in: userIds } });

        const ordersWithData = orderList.map((order) => {
            const user = users.find((user) => user._id.toString() === order.user.toString());
            return {
                ...order.toObject(),
                user: user,
            };
        });

        const totalOrders = await Order.countDocuments(); 
        const totalPages = Math.ceil(totalOrders / limit); 

        const returnOrders = ordersWithData.filter(order => 
            order.products.some(product => product.orderReturnRequest && product.productStatus === 'Requested')
        );

        return res.render('admin/ordermanagement', {
            ordersWithDataSorted: ordersWithData, 
            returnOrders,
            totalPages,
            currentPage: page,
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).render('admin/ordermanagement', { errMessage: 'Error fetching the orders' });
    }
};

const updateOrderStatus = async (req, res) => {
    const { orderId, productId, status } = req.query;
    try {
        const userData = req.session.user;
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).send("Order is not found");
        }
        const product = order.products.find(item => item.product.toString() === productId);
        if (product) {
            product.productStatus = status; 
            await order.save(); 

            if (product.productStatus === 'Accepted') {
                const user = await User.findById(userData);

                user.wallet = user.wallet || 0;

                user.wallet += product.price; 
                user.wallethistory.push({
                    process: `Refund for product`,
                    amount: product.price,
                    status: 'Credited',
                });
                
                await user.save(); 
            }
            return res.json({ success: true }); 
        } else {
            return res.json({ success: false, message: 'Product not found' });
        }
    } catch (error) {
        console.error('Error updating product status:', error);
        return res.status(500).json({ success: false, message: 'Error updating product status' });
    }
};


module.exports = {
    adminOrdersPage,
    updateOrderStatus
};
