const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  gender: {
    type: String,
    enum: ['Male', 'Female'],
  },
  profile: {
    address: [
      {
        name: {
          type: String,
          required: true,
        },
        house: {
          type: String,
          required: true,
        },
        city: {
          type: String,
          required: true,
        },
        phone: {
          type: Number,
          required: true,
        },
        postalcode: {
          type: Number,
          required: true,
        },
      },
    ],
  },
  wishlist: [
    { type: mongoose.Schema.Types.ObjectId,
       ref: 'Product' }
      ],
  isBlocked: {
    type: Boolean,
    default: false,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model('User', userSchema);
module.exports = User;