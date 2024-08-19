const mongoose = require('mongoose');

const productSchema =new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    brand : {
        type: String,
        required: true
    },
    strapMaterial:{
        type: String,
        required: true
    },
    gender: {
        type:String,
        required: true
    },
    category: {
        type:String,
        required: true
    },
    description: {
        type:String,
        required: true
    },
    stock: {
        type:Number,
        required: true
    },
    originalPrice: {
         type: Number, 
         required: true 
    },
    offerPercentage: {
        type: Number,
        required: true
    },
    price: {
        type: Number,
        required: true,
    },
    image: {
        type:[String],
        required: true
    },
    isBlocked: {
        type:Boolean,
        default:false
    },
    createdAt: {
        type: Date,
        default: Date.now()
    }
    
});

const Product = mongoose.model('product', productSchema);
module.exports = Product;