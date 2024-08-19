const mongoose = require("mongoose"); 



const categorySchema =new mongoose.Schema({
    categoryName: {
        type: String,
        required:true
    },
    description: { 
        type: String,
        required:false
    },
    isBlocked: { 
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now 
    }
});

const categoryCollection = mongoose.model("category", categorySchema);
module.exports = categoryCollection;
