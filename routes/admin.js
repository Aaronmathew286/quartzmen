const express = require('express');
const admrouter = express.Router();
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
admrouter.get("/dashboard-order-stats",adminAuth, admincontroller.orderTrend);
admrouter.get("/dashboard-top",adminAuth, admincontroller.orderTop);
// usermanagement
admrouter.get("/usermanagement", adminAuth, usercontroller.userManagement);
admrouter.post("/blockuser/:_id",adminAuth, usercontroller.blockUserPost);
admrouter.post("/unblockuser/:_id",adminAuth, usercontroller.unblockUserPost);
// productmanagement
admrouter.get("/productmanagement", adminAuth, productcontroller.productManagement);
admrouter.get("/addproduct",adminAuth, productcontroller.addProduct);
admrouter.post("/addproduct",adminAuth, upload.array('image', 8), productcontroller.addProductPost);
admrouter.get("/editproduct/:_id",adminAuth, productcontroller.editProduct);
admrouter.post("/editproduct/:_id",adminAuth, upload.array('image', 8), productcontroller.editProductPost);
admrouter.post("/blockproduct/:_id",adminAuth, productcontroller.blockProductPost);
admrouter.post("/unblockproduct/:_id",adminAuth, productcontroller.unblockProductPost);
// categorymangement
admrouter.get("/categorymanagement", adminAuth, categorycontroller.categoryManagement);
admrouter.get("/addcategory",adminAuth, categorycontroller.addCategory);
admrouter.post("/addcategory",adminAuth, categorycontroller.addCategoryPost)
admrouter.get("/editcategory/:_id",adminAuth, categorycontroller.editCategory);
admrouter.post("/editcategory/:_id",adminAuth, categorycontroller.editCategoryPost)
admrouter.post("/blockcategory/:_id",adminAuth, categorycontroller.blockCategoryPost)
admrouter.post("/unblockcategory/:_id",adminAuth, categorycontroller.unblockCategoryPost)
// Ordermanagement
admrouter.get("/ordermanagement", adminAuth, ordercontroller.adminOrdersPage)
admrouter.get('/ordermanagement/update-status', adminAuth, ordercontroller.updateOrderStatus)
// Couponmanagement
admrouter.get("/couponmanagement",adminAuth,couponcontroller.couponsPage);
admrouter.post("/addcoupon",adminAuth,couponcontroller.addCoupons);
admrouter.post("/editcoupon/:_id",adminAuth,couponcontroller.editCoupons);
admrouter.post("/deletecoupon/:_id", adminAuth, couponcontroller.deleteCoupons);
// Sales Report:
admrouter.get("/salesreport",adminAuth,salesreport.salesReport)
// Route to generate and download Excel
admrouter.get('/download-excel', adminAuth,salesreport.generateExcel);
admrouter.get('/download-pdf', adminAuth, salesreport.generatePDF);


module.exports = admrouter;