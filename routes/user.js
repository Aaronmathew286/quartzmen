const express = require("express");
const router = express.Router()
const usercontroller = require("../controller/usercontroller/usercontroller");
const userdetails = require("../controller/usercontroller/userdetails")
const userCart = require("../controller/usercontroller/userCart")
const userCheckout = require("../controller/usercontroller/userCheckout")
const userOrder = require("../controller/usercontroller/userOrder")
const userWishlist = require("../controller/usercontroller/userWishlist")
const passport = require("passport");
const isAuth = require('../middleware/userBlock').isUser
const crypto = require('crypto');



router.get("/",usercontroller.homepage)
router.get("/signup",usercontroller.signup)
router.post("/signup",usercontroller.signuppost)

router.get("/otp",usercontroller.otp)
router.post("/otp",usercontroller.otppost)
router.get("/login",usercontroller.login)
router.post("/login",usercontroller.loginpost)
router.get("/watches",usercontroller.watches)
router.get("/productdetail/:_id",usercontroller.productdetail)

// Forget password:
router.get("/forgetpassword",usercontroller.forgetpassword);
router.post("/forgetpassword",usercontroller.forgetpasswordpost);
router.get("/forgetpassword/otp",usercontroller.verifyresetotp)
router.post("/forgetpassword/otp",usercontroller.verifyresetotppost)

router.post("/resendotp",usercontroller.resendotp)
router.get("/newpassword",usercontroller.newpassword)
router.post("/newpassword",usercontroller.newpasswordpost)


// User Profile:
router.get("/profile",isAuth,userdetails.profile)
router.post("/editprofile",isAuth,userdetails.editProfile)

router.get("/address",isAuth,userdetails.address)
router.post("/addaddress",isAuth,userdetails.addAddress)
router.post("/editaddress/:_id",isAuth,userdetails.editAddress)


// Wishlist
router.get("/wishlist",isAuth,userWishlist.getWishlist)
router.post('/wishlist/add/:productId',isAuth, userWishlist.addToWishlist);
router.post('/wishlist/remove/:productId',isAuth,userWishlist.removeFromWishlist);


// Cart:
router.get("/cart",isAuth,userCart.userCart)
router.post("/cart/:_id",isAuth,userCart.addToCart)
router.post("/cartUpdate/:_id",isAuth,userCart.updateCartQuantity)
router.post("/cartRemove/:_id",isAuth,userCart.removeItemFromCart)


// Checkout:
router.get("/checkout",isAuth,userCheckout.userCheckout)
router.post("/checkout",isAuth,userCheckout.userCheckoutPost)
router.post('/apply-coupon', isAuth,userCheckout.applyCoupon);
router.post('/remove-coupon', isAuth,userCheckout.removeCoupon);


router.get("/wallet",isAuth,userdetails.wallet)
router.get("/wallet/update",isAuth,userdetails.updateWallet)

// Order:
router.get("/order",isAuth,userOrder.orderPage);
router.post("/cancelorder/:_id",isAuth,userOrder.cancelOrder);


// User Logout
router.get("/logout",usercontroller.logout);


module.exports = router