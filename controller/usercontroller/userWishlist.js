const Wishlist = require("../../models/wishlist")
const Product = require("../../models/product");
const wishlist = require("../../models/wishlist");



const addToWishlist = async (req, res) => {
    try {
        // Verify if the user is logged in
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: 'User not logged in' });
        }

        const userId = req.session.user;
        console.log("User ID:", userId); // Check that userId is correctly assigned

        if (!userId) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }

        // Find or create a wishlist for the user
        let isWishlist = await Wishlist.findOne({ user: userId });
        console.log("this is the checking of wishlist",isWishlist);
        if (!isWishlist) {
            isWishlist = new Wishlist({ user: userId, products: [req.params.productId] });
        } else if (!isWishlist.products.includes(req.params.productId)) {
            isWishlist.products.push(req.params.productId);
        }

        await isWishlist.save();
        console.log("The wishlist is saved.") 
        res.json({ success: true, message: "Added to cart" });
    } catch (err) {
        console.error("Error in adding to wishlist:", err);
        return res.status(500).send('Server Error');
    }
};

const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.session.user ? req.session.user._id : null;
        if (!userId) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }
        console.log("This is the user id:", userId);

        const productId = req.params.productId;
        console.log("This is the product id:", productId);

        const objectIdProductId = mongoose.Types.ObjectId(productId);
        console.log("This is the object id:", objectIdProductId);

        const wishlist = await Wishlist.findOne({ user: userId });
        console.log("The user's wishlist:", wishlist);

        if (wishlist) {
            if (wishlist.products.includes(objectIdProductId)) {
                wishlist.products.pull(objectIdProductId);
                await wishlist.save();
                console.log("Product removed from wishlist");
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

        // Initialize the wishlist variable after querying the database
        const wishlist = await Wishlist.findOne({ user: userId });
        console.log("the user ot which the wishlist is given is: ",wishlist)
        if (wishlist) {
            // Fetch the products manually
            const products = await Product.find({ _id: { $in: wishlist.products } });

            // Render the wishlist page with the products
            res.render("user/wishlist", { wishlist: { ...wishlist.toObject(), products } });
        } else {
            // If the user has no wishlist, render with an empty list
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
