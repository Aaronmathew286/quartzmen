const express = require("express");
const router = express.Router()
const usercontroller = require("../controller/usercontroller/usercontroller");
const userdetails = require("../controller/usercontroller/userdetails")
const userCart = require("../controller/usercontroller/userCart")
const userCheckout = require("../controller/usercontroller/userCheckout")
const userOrder = require("../controller/usercontroller/userOrder")
const userWishlist = require("../controller/usercontroller/userWishlist");
const { redirectIfLogin } = require("../middleware/userBlock");
const isAuth = require('../middleware/userBlock').isUser
const userAuth = require('../middleware/userBlock').redirectIfLogin


router.get('/auth/google',usercontroller.googleAuth);
router.get('/auth/google/callback',usercontroller.googleAuthCallback);
router.get("/",usercontroller.homePage)
router.get("/signup",usercontroller.getSignup)
router.post("/signup",usercontroller.signupPost)
router.get("/otp",usercontroller.getOtp)
router.post("/otp",usercontroller.otpPost)
router.get("/login",userAuth,usercontroller.login)
router.post("/login",usercontroller.loginPost)
router.get("/watches/:category",usercontroller.categoryWatches)
router.get('/shopwatches', usercontroller.shopWatches);
router.get("/productdetail/:_id",usercontroller.productDetail)
router.get('/search',usercontroller.searchProduct)
// Forget password:
router.get("/forgetpassword",usercontroller.forgetPassword);
router.post("/forgetpassword",usercontroller.forgetPasswordPost);
router.get("/forgetpassword/otp",usercontroller.verifyResetOtp)
router.post("/forgetpassword/otp",usercontroller.verifyResetOtpPost)
router.post("/resendotp",usercontroller.resendOtp)
router.get("/newpassword",usercontroller.newPassword)
router.post("/newpassword",usercontroller.newPasswordPost)
// User Profile:
router.get("/profile",isAuth,userdetails.profile)
router.post("/editprofile",isAuth,userdetails.editProfile)
router.post("/resetpassword",isAuth,userdetails.resetPassword)
router.get("/address",isAuth,userdetails.address)
router.post("/addaddress",isAuth,userdetails.addAddress)
router.post("/editaddress/:_id",isAuth,userdetails.editAddress)
// Wishlist
router.get("/wishlist",isAuth,userWishlist.getWishlist)
router.post('/wishlist/add/:productId',isAuth, userWishlist.addToWishlist);
router.post('/wishlist/remove/:productId',isAuth,userWishlist.removeFromWishlist);
// Cart:
router.get("/cart",isAuth,userCart.userCart)
router.post('/cart/:_id',isAuth,userCart.addToCart)
router.post('/cartUpdate/:itemId',isAuth,userCart.updateCartQuantity)
router.post("/cartRemove/:_id",isAuth,userCart.removeItemFromCart)
// Checkout:
router.post("/create-order",isAuth,userCheckout.razorPaymentPost)
router.get("/checkout",isAuth,userCheckout.userCheckout)
router.post("/checkout",isAuth,userCheckout.userCheckoutPost)
router.post('/apply-coupon', isAuth,userCheckout.applyCoupon);
router.post('/remove-coupon', isAuth,userCheckout.removeCoupon);
router.post('/process-wallet-payment',isAuth,userCheckout.processWalletPayment)
router.post('/handle-failed-payment/:orderId', isAuth, userCheckout.handleFailedPayment);
// Order:
router.get('/orderSuccess',isAuth,userOrder.orderSuccess);
router.get('/orderFailed',isAuth,userOrder.orderFailed);
router.get("/order",isAuth,userOrder.orderPage);
router.post("/order/cancel",isAuth,userOrder.cancelOrder);
router.post('/order/return-request',isAuth,userOrder.returnRequestOrder)
router.get('/orderHistory',isAuth,userOrder.orderHistory)
router.get('/invoice',isAuth,userOrder.orderInvoice)
// Wallet:
router.get("/wallet",isAuth,userdetails.wallet)
router.get("/create-wallet-order",isAuth,userdetails.createWalletOrder)
router.post("/wallet-transaction-success", isAuth, userdetails.walletTransactionSuccess)
// User Logout
router.get("/logout",usercontroller.logout);


module.exports = router