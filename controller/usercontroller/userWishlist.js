const Wishlist = require("../../models/wishlist")
const Product = require("../../models/product");


const addToWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }
        let isWishlist = await Wishlist.findOne({ user: userId });
        if (!isWishlist) {
            isWishlist = new Wishlist({ user: userId, products: [req.params.productId] });
        } else if (!isWishlist.products.includes(req.params.productId)) {
            isWishlist.products.push(req.params.productId);
        }

        await isWishlist.save();
        res.json({ success: true, message: "Added to cart" });
    } catch (err) {
        console.error("Error in adding to wishlist:", err);
        return res.status(500).send('Server Error');
    }
};

const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.session.user; 
        if (!userId) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }
        const productId = req.params.productId;
        const wishlist = await Wishlist.findOne({ user: userId });
        if (wishlist) {
            if (wishlist.products.includes(productId)) {
                wishlist.products.pull(productId);
                await wishlist.save();
                return res.status(200).json({ success: true });
            } else {
                return res.status(404).json({ success: false, message: "Product not found in wishlist" });
            }
        } else {
            return res.status(404).json({ success: false, message: "Wishlist not found" });
        }
    } catch (err) {
        console.error("Error in removeFromWishlist:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const getWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        const wishlist = await Wishlist.findOne({ user: userId });

        if (wishlist) {
            const products = await Product.find({ _id: { $in: wishlist.products } });
            res.render("user/wishlist", { wishlist: { ...wishlist.toObject(), products } });
        } else {
            res.render("user/wishlist", { wishlist: { products: [] } });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};


module.exports = {
    addToWishlist,
    removeFromWishlist,
    getWishlist
};
