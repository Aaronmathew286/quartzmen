const User = require("../../models/user")
const Order = require("../../models/order")
const Product = require("../../models/product")
const PDFDocument = require('pdfkit')


const orderSuccess = async (req, res) => {
    try {
        const userId = req.session.user
        const order = await Order.findOne({ user: userId }).sort({ createdAt: -1 });
        if (!order) {
            return res.status(404).send('Order not found');
        }

        res.render('user/orderSuccess', {
            user: req.user,
            order,
            loggedIn: userId
        });
    } catch (error) {
        console.error('Error in orderSuccess:', error);
        res.status(500).send('Internal server error');
    }
};

const orderFailed = async(req,res) => {
    const user = req.session.user;
    const { orderId, userId } = req.query;

    const orderDetails = {
      orderId,
      userId,
      message: "There was an issue processing your order. Please try again or contact support."
    };

    res.render('user/orderFailed', { orderDetails, loggedIn: user });
};
  
const orderPage = async (req, res) => {
    try {
        const userId = req.session.user;
        const { page = 1, limit = 6 } = req.query;
        const skip = (page - 1) * limit;

        const orders = await Order.find({ user: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
                path: 'products.product',
                model: Product,
            });

        const totalOrders = await Order.countDocuments({ user: userId });
        const totalPages = Math.ceil(totalOrders / limit);
        res.render('user/order', {
            orders,
            currentPage: parseInt(page, 6),
            totalPages: totalPages,
            userData: userId,
            limit,
            skip,
            totalOrders
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
};

const cancelOrder = async (req, res) => {
    try {
        const { orderId, productId, reasonText } = req.body;
        const order = await Order.findOne({ _id: orderId, 'products._id': productId });

        if (!order) {
            res.status(404).send('Order not found');
        }
        const product = order.products.id(productId);
        if (product.productStatus !== 'Pending' && product.productStatus !== 'Shipped') {
            res.status(400).send("Product cannot be canceled at the stage");
        }

        product.productStatus = 'Cancel';
        product.reason = reasonText;
        product.orderCancelRequest = true;

        if (order.paymentInfo === 'razorpay') {
            const user = await User.findById(req.session.user);
            user.wallet += product.price;
            user.wallethistory.push({
                process: 'Order Cancelled Refund',
                amount: product.price,
                status: 'Credited',
                date: new Date()
            })

            await order.save()
            await user.save()
        } else if (order.paymentInfo === 'cash_on_delivery') {
            await order.save()
        } else if (order.paymentInfo === 'wallet') {
            const user = await User.findById(req.session.user);
            user.wallet += product.price;
            user.wallethistory.push({
                process: 'Order Cancelled Refund',
                amount: product.price,
                status: 'Credited',
                date: new Date()
            })
            await order.save()
            await user.save()
        }
        res.send({ success: true, message: "Order canceled successfully" });
    } catch (err) {
        res.status(500).send(err.message);
    }

};

const returnRequestOrder = async (req, res) => {
    try {
        const { orderId, productId, returnReason } = req.body;
        if (!orderId || !productId || !returnReason) {
            return res.status(400).send({ success: false, message: "Order ID, Product ID, and Return Reason are required." });
        }
        const order = await Order.findOne({ _id: orderId, 'products._id': productId });
        if (!order) {
            return res.status(404).send({ success: false, message: 'Order not found' });
        }
        const product = order.products.id(productId);
        if (product.productStatus !== 'Delivered') {
            return res.status(400).send({ success: false, message: "Product cannot be returned at this stage. Only done for Delivered products." });
        }
        product.reason = returnReason;
        product.productStatus = 'Requested';
        product.orderReturnRequest = true

        await order.save();
        res.send({ success: true, message: "Return request sent successfully" });
    } catch (err) {
        console.error("Error in returnRequestOrder:", err);
        res.status(500).send({ success: false, message: err.message });
    }
};

const orderHistory = async (req, res) => {
    try {
        const userId = req.session.user;
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const userData = await User.findById(userId)
        const orderList = await Order.find({ user: userId })
            .populate({
                path: 'products.product',
                model: Product,
            })
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })

        const totalOrders = await Order.countDocuments({ user: userId });
        const totalPages = Math.ceil(totalOrders / limit);

        return res.render('user/orderHistory', {
            orders: orderList,
            totalPages,
            currentPage: page,
            userData
        });
    } catch (error) {
        console.error('Error fetching order history:', error);
        res.status(500).render('user/orderHistory', { errMessage: 'Error fetching your order history' });
    }

};

const orderInvoice = async (req, res) => {
    const orderId = req.query._id;
    try {
        const order = await Order.findById(orderId)
            .populate({ path: 'products.product', model: Product, select: 'name brand price' }) 
            .lean();

        if (!order) {
            return res.status(404).send('Order not found');
        }

        const user = await User.findById(order.user).select('name email phone').lean();

        const doc = new PDFDocument();
        let filename = `Invoice-${order._id}.pdf`;
        filename = encodeURIComponent(filename);

        res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-type', 'application/pdf');

        doc.pipe(res); 

        doc.fontSize(20).text('Invoice', { align: 'center' });
        doc.moveDown();

        doc.fontSize(12).text(`Name: ${user.name}`);
        doc.text(`Email: ${user.email}`);
        doc.moveDown();

        doc.text(`Order ID: ${order._id}`);
        doc.text(`Order Date: ${new Date(order.createdAt).toLocaleDateString()}`);
        doc.moveDown();

        doc.text('Ordered Products:', { underline: true });
        order.products.forEach(item => {
            doc.text(`- ${item.product.name} (Brand: ${item.product.brand}) - Quantity: ${item.quantity} - Price: Rs:${item.price.toFixed(2)}`);
        });
        doc.moveDown();

        doc.text(`Subtotal: Rs:${order.totalAmount.toFixed(2)}`);
        
        if (order.coupon && order.coupon.discount) {
            doc.text(`Discount (Coupon): Rs:${order.coupon.discount.toFixed(2)}`);
            const grandTotal = order.totalAmount - order.coupon.discount;
            doc.text(`Grand Total: Rs:${grandTotal.toFixed(2)}`);
        } else {
            doc.text(`Grand Total: Rs:${order.totalAmount.toFixed(2)}`);
        }

        doc.end(); 
    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).send('Error generating invoice');
    }
}


module.exports = {
    orderPage,
    cancelOrder,
    returnRequestOrder,
    orderSuccess,
    orderHistory,
    orderInvoice,
    orderFailed,
}