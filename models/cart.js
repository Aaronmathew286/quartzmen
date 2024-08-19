const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
      },
      quantity: {
        type: Number,
        default: 1,
      },
      totalprice: {
        type: Number,
        required: true,
      },
    }
  ],
  grandTotal: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
});

// Calculate and update the total price for each item
// cartSchema.pre('save', function (next) {
//   this.items.forEach(item => {
//     item.totalprice = item.quantity * item.product.price; // Assuming `product.price` is available
//   });
//   next();
// });

// // Calculate and update the grand total
// cartSchema.virtual('totalPrice').get(function () {
//   return this.items.reduce((total, item) => total + item.totalprice, 0);
// });

// cartSchema.pre('save', function (next) {
//   this.grandTotal = this.totalPrice;
//   next();
// });

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;
