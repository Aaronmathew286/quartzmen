const User = require('../../models/user')
const Product = require("../../models/product");
const Category = require('../../models/category')
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
      grandTotal: grandTotal,
      cart 
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
    if (quantityNum > productData.stock) {
      return res.status(400).render('user/productdetail', {
        products: productData,
        categories: await Category.find(),  // Ensure categories are fetched
        loggedIn: !!user,
        errMessage: `Only ${productData.stock} units are available in stock. Please reduce the quantity.`
      });
    }

    let cartData = await Cart.findOne({ user: userData._id });
    if (!cartData) {
      cartData = new Cart({ user: userData._id, items: [], grandTotal: 0 });
    }

    const itemsIndex = cartData.items.findIndex(item => item.product.toString() === productId);
    if (itemsIndex !== -1) {
      const newQuantity = cartData.items[itemsIndex].quantity + quantityNum;

      if (newQuantity >= productData.stock) {
        return res.status(400).render('user/productdetail', {
          products: productData,
          categories: await Category.find(),  // Ensure categories are fetched
          loggedIn: !!user,
          errMessage: `Only ${productData.stock} units are available in stock. Please reduce the quantity.`
        });
      }

      cartData.items[itemsIndex].quantity = newQuantity;
      cartData.items[itemsIndex].totalprice = newQuantity * productData.price;
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
  const { itemId } = req.params; 
  const { quantity } = req.body; 

  try {
    const userId = req.session.user;
    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found.' });
    }
    const cartItem = cart.items.find(item => item.product.toString() === itemId);
    if (!cartItem) {
      return res.status(404).json({ success: false, message: 'Item not found in cart.' });
    }
    if (typeof quantity !== 'number' || quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be a positive number.' });
    }
    const product = await Product.findById(cartItem.product);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    if (quantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} items are available in stock.`
      });
    }
    if (cartItem.quantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Cannot update to ${quantity} items. Only ${product.stock} available in stock.`
      });
    }

    cartItem.quantity = quantity;
    const productPrice = product.price; 
    cartItem.totalprice = productPrice * quantity;
    cart.grandTotal = cart.items.reduce((total, item) => total + item.totalprice, 0);

    await cart.save();

    res.json({
      success: true,
      productPrice: productPrice,
      updatedQuantity: cartItem.quantity,
      message: 'Cart updated successfully!'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
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

    cartData.grandTotal = cartData.items.reduce((total, item) => {
      return total + item.totalprice; 
    }, 0);
      

    
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