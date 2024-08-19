const express = require('express');
const admrouter = express.Router();
const multer = require('multer'); // Correctly import multer
const admincontroller = require("../controller/admincontroller/admincontroller");
const usercontroller = require("../controller/admincontroller/usercontroller")
const productcontroller = require("../controller/admincontroller/productcontroller");
const categorycontroller = require("../controller/admincontroller/categorycontroller");
const ordercontroller = require("../controller/admincontroller/ordercontroller")
const couponcontroller = require("../controller/admincontroller/couponcontroller");
const salesreport = require("../controller/admincontroller/salesreport")
const adminAuth = require("../middleware/adminAuth")
const { upload } = require('../middleware/multer');


// Routes
admrouter.get("/login", admincontroller.login);
admrouter.post("/login", admincontroller.loginpost);

admrouter.get("/logout", admincontroller.logout);

// dashboard
admrouter.get("/dashboard",adminAuth, admincontroller.dashboard);

// usermanagement
admrouter.get("/usermanagement", adminAuth, usercontroller.usermanagement);
admrouter.post("/blockuser/:_id",adminAuth, usercontroller.blockuserpost);
admrouter.post("/unblockuser/:_id",adminAuth, usercontroller.unblockuserpost);

// productmanagement
admrouter.get("/productmanagement", adminAuth, productcontroller.productmanagement);
admrouter.get("/addproduct",adminAuth, productcontroller.addproduct);
admrouter.post("/addproduct",adminAuth, upload.array('image', 5), productcontroller.addproductpost);
admrouter.get("/editproduct/:_id",adminAuth, productcontroller.editproduct);
admrouter.post("/editproduct/:_id",adminAuth, upload.array('image', 5), productcontroller.editproductpost);
admrouter.post("/blockproduct/:_id",adminAuth, productcontroller.blockproductpost);
admrouter.post("/unblockproduct/:_id",adminAuth, productcontroller.unblockproductpost);

// categorymangement
admrouter.get("/categorymanagement", adminAuth, categorycontroller.categorymanagement);
admrouter.get("/addcategory",adminAuth, categorycontroller.addcategory);
admrouter.post("/addcategory",adminAuth, categorycontroller.addcategorypost)
admrouter.get("/editcategory/:_id",adminAuth, categorycontroller.editcategory);
admrouter.post("/editcategory/:_id",adminAuth, categorycontroller.editcategorypost)
admrouter.post("/blockcategory/:_id",adminAuth, categorycontroller.blockcategorypost)
admrouter.post("/unblockcategory/:_id",adminAuth, categorycontroller.unblockcategorypost)


// Ordermanagement
admrouter.get("/ordermanagement", adminAuth, ordercontroller.order)
admrouter.get('/ordermanagement/:orderId/:itemId', adminAuth, ordercontroller.orderEdit)


// Couponmanagement
admrouter.get("/couponmanagement",adminAuth,couponcontroller.coupons);
admrouter.post("/addcoupon",adminAuth,couponcontroller.addCoupons);
admrouter.post("/editcoupon/:_id",adminAuth,couponcontroller.editCoupons);
admrouter.post("/deletecoupon/:_id", adminAuth, couponcontroller.deleteCoupons);


// Sales Report:
admrouter.get("/salesreport",adminAuth,salesreport.salesReport)

admrouter.get('/download-pdf', adminAuth, salesreport.generatePDF);

// Route to generate and download Excel
admrouter.get('/download-excel', adminAuth,salesreport.generateExcel);


module.exports = admrouter;