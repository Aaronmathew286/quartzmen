const User = require('../../models/user')
const Product = require("../../models/product");
const Cart = require("../../models/cart")
const mongoose = require('mongoose');


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
    let cart = await Cart.findOne({ user: userData._id }).populate({
      path: "items.product",
      model: Product, 
    });

    if (!cart) {
      cart = new Cart({ user: userData._id, items: [] });
      await cart.save();
    }
    const cartItems = cart.items;
    let grandTotal = 0;
    cartItems.forEach(item => {
      grandTotal += item.product.price * item.quantity;
    });

    res.render("user/cart", {
      loggedIn: loggedIn,
      items: cartItems,
      grandTotal: grandTotal 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

const addToCart = async (req, res) => {
  try {
    const user = req.session.user
    const userData = await User.findById(user);
    if (!userData) {
      throw new Error("User not found");
    }
    const productId = req.body.productId;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }
    const { quantity } = req.body;
    const quantityNum = quantity ? Number(quantity) : 1;

    const productData = await Product.findById(productId);
    if (!productData) {
      throw new Error("Product not found");
    }

    let cartData = await Cart.findOne({ user: userData._id });
    if (!cartData) {
      cartData = new Cart({ user: userData._id, items: [], grandTotal: 0 });
    }

    const itemsIndex = cartData.items.findIndex(item => item.product.toString() === productId);
    if (itemsIndex !== -1) {
      cartData.items[itemsIndex].quantity += quantityNum;
      cartData.items[itemsIndex].totalprice = cartData.items[itemsIndex].quantity * productData.price;
    } else {
      cartData.items.push({
        product: productId,
        quantity: quantityNum,
        totalprice: quantityNum * productData.price,
      });
    }

    cartData.grandTotal = cartData.items.reduce((total, item) => total + item.totalprice, 0);

    await cartData.save();
    res.redirect('/cart'); 
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const updateCartQuantity = async (req, res) => {
  try {
    const user = req.session.user;
    
    if (!user) {
      return res.status(404).json({ error: "User not logged in" });
    }

    const userData = await User.findById(user);
    if (!userData) {
      return res.status(404).json({ error: "User not found" });
    }

    const productId = req.body.productId;
    const quantity = parseInt(req.body.quantity, 10); 

    if (!productId || !quantity) {
      return res.status(400).json({ error: "Product ID or quantity missing" });
    }

    const productData = await Product.findById(productId);
    if (!productData) {
      return res.status(404).json({ error: "Product not found" });
    }

    let cartData = await Cart.findOne({ user: userData._id });
    if (!cartData) {
      return res.status(404).json({ error: "Cart not found" });
    }

    const itemIndex = cartData.items.findIndex(item => item.product.toString() === productId);
    if (itemIndex === -1) {
      return res.status(404).json({ error: "Product not found in cart" });
    }

    const currentQuantity = cartData.items[itemIndex].quantity;
    if (quantity > productData.stock) {
      return res.status(400).json({ error: "Quantity exceeds available stock" });
    }

    if (quantity === 0) {
      cartData.items.splice(itemIndex, 1); 
    } else {
      cartData.items[itemIndex].quantity = quantity;
      cartData.items[itemIndex].totalprice = quantity * productData.price;
    }
    cartData.grandTotal = cartData.items.reduce((total, item) => total + item.totalprice, 0);
    await cartData.save();

    const stockDifference = quantity - currentQuantity;
    productData.stock -= stockDifference;
    if (productData.stock < 0) {
      productData.stock = 0; 
    }

    await productData.save();
    res.json({
      message: "Cart updated successfully",
      grandTotal: cartData.grandTotal,
      item: cartData.items[itemIndex] || null,
      stock: productData.stock,
      outOfStock: productData.stock === 0 
    });
  } catch (err) {
    console.error("Error in updating cart quantity:", err);
    res.status(500).json({ error: "Internal Server Error" });
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