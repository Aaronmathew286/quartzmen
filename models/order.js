const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    user: {
        type:mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      products: [
        {
          product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
          },
          quantity: {
            type: Number,
            required: true
          },
          price: {
            type: Number,
            required: true
          },
          totalPrice: {
            type: Number,
            required: true
          },
          reason: {
            type: String,
            default: ""
          },
          productStatus:{
            type: String,
            required: true,
            enum: ['Pending', 'Shipped', 'Failed', 'Delivered', 'Return','Cancel', 'Completed', 'Confirmed', 'Rejected' , 'Requested', 'Accepted'],
            default: 'Pending'
          },
          orderCancelRequest: {
            type: Boolean,
            default: false,
          },
          orderReturnRequest: {
            type: Boolean,
            default: false,
          }
        }
      ],
      address: {
        name: {
          type: String,
          required: true
        },
        house: {
          type: String,
          required: true
        },
        city: {
          type: String,
          required: true
        },
        phone: {
          type: Number,
          required: true
        },
        postalcode: {
          type: Number,
          required: true
        }
      },
      paymentInfo: {
        type: String,
        required: true,
        enum: ['cash_on_delivery','razorpay' ,'wallet']
        
      },
      totalAmount: {
        type: Number,
        required: true
      },
      paymentStatus: {
        type: String,
        required: true,
        enum: ['Failed', 'Completed', 'Confirmed', 'Rejected'],
        default: 'Pending'
      },
      coupon: {
        couponCode: { type: String },
        discount: { type: Number }
      },
      createdAt: {
        type: Date,
        default: Date.now
      }

})

const order= mongoose.model("order", orderSchema);
module.exports = order;