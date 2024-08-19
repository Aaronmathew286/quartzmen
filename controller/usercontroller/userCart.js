const User = require('../../models/user')
const Product = require("../../models/product");
const Order = require("../../models/order");
const Category = require("../../models/category");
const Cart = require("../../models/cart")





const userCart = async (req, res) => {
  try {
    const loggedIn = req.session.user;
    if (!loggedIn) {
      throw new Error("User not logged in");
    }

    const userData = await User.findById(loggedIn);
    if (!userData) {
      throw new Error("User not found");
    }

    console.log("User ID:", userData._id);

    let cart = await Cart.findOne({ user: userData._id }).populate({
      path: "items.product",
      model: Product, 
    });

    if (!cart) {
      console.log("Cart not found for user:", userData._id);
      cart = new Cart({ user: userData._id, items: [] });
      await cart.save();
      console.log("New cart created for user:", userData._id);
    }
    const cartItems = cart.items

    console.log("Cart:", cart.items);

    res.render("user/cart", {
      loggedIn: loggedIn,
      items: cartItems,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};


const addToCart = async (req, res) => {
  try {
    const user = req.session.user;
    const userData = await User.findById(user);
    if (!userData) {
      throw new Error("User not found");
    }
    console.log("the useris active:",userData)

    const productId = req.params._id;
    const { quantity = 1 } = req.body; // Default quantity to 1 if not provided
    const quantityNum = Number(quantity);

    const productData = await Product.findById(productId);
    if (!productData) {
      throw new Error("Product not found");
    }

    let cartData = await Cart.findOne({ user: userData._id });
    if (!cartData) {
      cartData = new Cart({ user: userData._id, items: [] ,grandTotal:0 });
    }

    const itemsIndex = cartData.items.findIndex(item => item.product.toString() === productId);

    if (itemsIndex !== -1) {
      // Update existing item in cart
      cartData.items[itemsIndex].quantity += quantityNum;
      cartData.items[itemsIndex].totalprice = cartData.items[itemsIndex].quantity * productData.price;
    } else {
      // Add new item to cart
      cartData.items.push({
        product: productId,
        quantity: quantityNum,
        totalprice: quantityNum * productData.price,
      });
    }

    cartData.grandTotal = cartData.items.reduce((total,item) => total+item.totalprice,0)

    // Save cart data to the database
    await cartData.save();

    // Redirect to the cart page
    // res.redirect("/cart");
    res.render("/cart").json({ message: "Added to cart" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}




const updateCartQuantity = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findById(userId);
    if (!userData) {
      throw new Error("User not found");
    }
    const itemId = req.params._id;
    const { operation } = req.body;
    const cartData = await Cart.findOne({ user: userId }).populate("items.product");

    const item = cartData.items.find(item => item._id.toString() === itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    if (operation === 'increase') {
      item.quantity += 1;
    } else if (operation === 'decrease' && item.quantity > 1) {
      item.quantity -= 1;
    }

    item.totalprice = item.quantity * item.product.price;
    await cartData.save();

    res.json({ success: true });
  } catch (err) {
    console.log("An error occurred", err);
    res.status(500).send("Internal Error Occurred");
  }
};


const removeItemFromCart = async (req, res) => {
  try {
    const itemId = req.params._id;
    const cartData = await Cart.findOne({ user: req.session.user });

    const itemIndex = cartData.items.findIndex(item => item._id.toString() === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    cartData.items.splice(itemIndex, 1);
    await cartData.save();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};



module.exports = {
  userCart,
  addToCart,
  updateCartQuantity,
  removeItemFromCart
};