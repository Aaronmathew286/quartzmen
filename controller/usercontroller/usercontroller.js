const User = require('../../models/user')
const Product = require("../../models/product");
const Category = require("../../models/category");
const Otp = require("../../models/otp");
const nodemailer = require("nodemailer")
const { authenticator } = require("otplib");
const Wishlist = require('../../models/wishlist');
require("dotenv").config();
const secret = authenticator.generateSecret();
const token = authenticator.generate(secret)
const bcrypt = require('bcryptjs')


const getSignup = (req, res) => {
    res.render("user/signup",)
}

const signupPost = async (req, res) => {
    try {
        req.session.userData = null;
        req.session.otpTimestamp = null;

        const data = {
            name: req.body.username,
            email: req.body.email,
            password: req.body.password
        };

        // Check if user already exists
        const existingUser = await User.findOne({ email: data.email });
        if (existingUser) {
            return res.render("user/signup", { status: true, errMessage: "User already exists" });
        }

        // Hash the password using bcryptjs
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(data.password, saltRounds);
        data.password = hashedPassword; // Store the hashed password

        req.session.userData = data; 

        // Configure Nodemailer for OTP
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
                user: process.env.ADMINMAIL,
                pass: process.env.ADMINPASS
            }
        });

        // Generate and send OTP
        const token = Math.floor(100000 + Math.random() * 900000);
        const mailOptions = {
            from: {
                name: 'Quartzmen',
                address: process.env.ADMINMAIL
            },
            to: req.session.userData.email,
            subject: "OTP verification✔",
            text: "Hello world?",
            html: `Please verify your mail with this OTP: ${token}`,
        };

        await transporter.sendMail(mailOptions);

        // Save the OTP in the database
        const otpmail = { email: req.body.email, otp: token };
        await Otp.insertMany(otpmail);

        req.session.otpTimestamp = Date.now();
        req.session.otpExpiryTime = 60 * 1000; 

        // Redirect to OTP verification page
        res.redirect("/otp");

    } catch (error) {
        console.error("Error during signup:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

const getOtp = (req, res) => {
    if (!req.session.otpTimestamp) {
        return res.redirect("/signup"); 
    }

    const timePassed = Date.now() - req.session.otpTimestamp; 
    const timeLeft = Math.max(60 - Math.floor(timePassed / 1000), 0);

    if (timeLeft <= 0) {
        return res.render("user/otp", {
            context: 'signup',
            errMessage: "OTP expired. Please request a new one.",
            timeLeft: 0
        });
    }

    res.render("user/otp", { context: 'signup', timeLeft: timeLeft });
};

const otpPost = async (req, res) => {
    try {
        const enteredOtp = req.body['otp[]'] ? req.body['otp[]'].join('') : null;
        if (!enteredOtp) {
            throw new Error("OTP not entered");
        }

        // Calculate remaining time dynamically
        const timePassed = Date.now() - req.session.otpTimestamp;
        const timeLeft = Math.max(60 - Math.floor(timePassed / 1000), 0);

        if (timeLeft <= 0) {
            return res.render("user/otp", {
                errMessage: "OTP expired. Please request a new one.",
                context: "signup",
                timeLeft: 0
            });
        }

        const otpdata = await Otp.findOne({ email: req.session.userData.email });

        if (enteredOtp === otpdata.otp) {
            const userData = req.session.userData;
            if (!userData || !userData.password || !userData.email || !userData.name) {
                console.error("Missing required fields in user data");
                return res.status(400).json({ error: "Missing required fields in user data" });
            }

            await User.insertMany(userData);
            return res.redirect("/login");
        } else {
            return res.render("user/otp", {
                errMessage: "OTP is incorrect",
                context: "signup",
                timeLeft: timeLeft // Maintain the current timeLeft without resetting
            });
        }
    } catch (error) {
        console.error("Error during OTP verification:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

const resendOtp = async (req, res) => {
    try {
        const userEmail = req.session.userData.email;
        if (!userEmail) {
            return res.status(400).json({ error: "No email found in session" });
        }

        const newToken = authenticator.generate(authenticator.generateSecret());  // Generate new OTP

        // Remove any existing OTP entry for this email
        await Otp.deleteOne({ email: userEmail });

        // Create a new OTP document in the database
        const newOtp = new Otp({
            email: userEmail,
            otp: newToken,
            createdAt: new Date()  // Optional: You can use this to track OTP creation time
        });

        await newOtp.save();  // Save the new OTP document

        // Set up the nodemailer transport and mail options
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
                user: process.env.ADMINMAIL,
                pass: process.env.ADMINPASS
            }
        });

        const mailOptions = {
            from: { name: 'Quartzmen', address: process.env.ADMINMAIL },
            to: userEmail,
            subject: "Resend OTP Verification",
            html: `Please verify your email with this OTP: ${newToken}`
        };

        await transporter.sendMail(mailOptions);  // Send OTP via email

        // Reset the session timestamp to start a new countdown timer
        req.session.otpTimestamp = Date.now();
        res.status(200).json({ success: true, timeLeft: 60 });
    } catch (error) {
        console.error("Error during OTP resend:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

const forgetPassword = (req, res) => {
    res.render("user/forgetpassword")
}

const forgetPasswordPost = async (req, res) => {
    try {
        const { email } = req.body;
        const existingUser = await User.findOne({ email: email });

        if (!existingUser) {
            res.render("user/forgetpassword", { status: true, errMessage: "User is not found,Retry..." })
        }
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            host: 'smtp.gmail.email',
            port: 587,
            secure: false,
            auth: {
                user: process.env.ADMINMAIL,
                pass: process.env.ADMINPASS
            }
        })
        const mailOptions = {
            from: {
                name: 'Quartzmen',
                address: process.env.ADMINMAIL
            },
            to: email,
            subject: 'OTP for password reset',
            text: "Your OTP for password reset is " + token,
            html: `Your OTP for password reset is ${token}`
        }
        await transporter.sendMail(mailOptions);
        const otpdata = {
            email: email,
            otp: token
        };

        await Otp.insertMany(otpdata);

        req.session.userData = { email };
        res.redirect("forgetpassword/otp");

    } catch (error) {
        console.error(error)
        res.status(500).send("Internal error occured in otp")
    }
}

const verifyResetOtp = (req, res) => {
    if (!req.session.otpStartTime) {
        req.session.otpStartTime = Date.now();
    }
    const timeElapsed = Math.floor((Date.now() - req.session.otpStartTime) / 1000);
    const timeLeft = Math.max(60 - timeElapsed, 0);
    res.render("user/otp", { context: 'reset', userData: req.session.userData, timeLeft: timeLeft });
};

const verifyResetOtpPost = async (req, res) => {
    try {
        const enteredOTP = req.body['otp[]'];
        const enteredOTPStr = enteredOTP.join('');
        const otpdata = await Otp.findOne({ email: req.session.userData.email });
        const timeElapsed = Math.floor((Date.now() - req.session.otpStartTime) / 1000);
        const timeLeft = Math.max(60 - timeElapsed, 0);

        if (enteredOTPStr === otpdata.otp) {
            res.redirect("/newpassword");
        } else {
            res.render("user/otp", { errMessage: "The OTP is incorrect", context: 'reset', timeLeft: timeLeft });
        }
    } catch (error) {
        console.error("Error during OTP verification:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

const newPassword = (req, res) => {
    res.render("user/newpassword");
};

const newPasswordPost = async (req, res) => {
    try {
        const { password } = req.body; 
        const email = req.session.userData.email; 
        const user = await User.findOne({ email: email }); 

        if (!user) {
            return res.render("user/newpassword", { status: true, errMessage: "User not found" });
        }

        const hashedPassword = await bcrypt.hash(password, 10); 
        user.password = hashedPassword; 

        await user.save(); 
        await Otp.deleteOne({ email: email }); 

        res.redirect("/login"); 
    } catch (error) {
        console.error("Error during password reset:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

const login = (req, res) => {
    res.render("user/login")
}

const loginPost = async (req, res) => {
    const userData = {
      email: req.body.email.toLowerCase(), 
      password: req.body.password 
    };
  
    try {
      const checkUser = await User.findOne({ email: userData.email });
  
      if (checkUser) {
        if (checkUser.isBlocked === true) {
          return res.render("user/login", { status: true, errMessage: "You are blocked" });
        }

        const isMatch = await bcrypt.compare(userData.password, checkUser.password);
  
        if (isMatch) {
          req.session.user = checkUser._id;
          res.redirect("/");
        } else {
          res.render("user/login", { status: true, errMessage: "Wrong information, please try again" });
        }
      } else {
        res.render("user/login", { status: true, errMessage: "User not found" });
      }
    } catch (err) {
      res.status(500).send(err);
    }
};

const homePage = async (req, res) => {
    try {
        const userProducts = await Product.find();
        const userCategories = await Category.find();
        const logIn = req.session.user;
        const userData = User.findById(logIn)
        if (!userData) {
            res.render("user/login", { errMessage: "The user does not exist." })
        }

        const visibleCategory = userCategories.filter(category => !category.isBlocked);
        const visibleProducts = userProducts.filter(product => {
            return visibleCategory.some(category => category.categoryName === product.category);
        });
        const strapMaterials = visibleProducts.filter(strap => strap.strapMaterial)
        let wishlistProducts = [];

        if (userData) {
            const userWishlist = await Wishlist.findOne({ user: logIn }).select('products');
            if (userWishlist) {
                wishlistProducts = userWishlist.products.map(product => product.toString());
            }
        }
        const productsWithWishlist = visibleProducts.map(product => {
            return {
                ...product.toObject(),
                wishlist: wishlistProducts.includes(product._id.toString())
            };
        });
        res.render('user/homepage', { products: productsWithWishlist, loggedIn: logIn, categories: visibleCategory, strapMaterials: strapMaterials});
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal error occured in the home page')
    }
}

const categoryWatches = async (req, res) => {
    try {
        const user = req.session.user;
        const { category } = req.params;
        const categories = await Category.findOne({ categoryName: category, isBlocked: false });
        if (!categories) {
            return res.status(404).send('Category not found or blocked.');
        }
        const products = await Product.find({ category: categories.categoryName, isBlocked: false });
        let wishlistProducts = [];

        if (user) {
            const userWishlist = await Wishlist.findOne({ user }).select('products');
            if (userWishlist) {
                wishlistProducts = userWishlist.products.map(product => product.toString());
            }
        }
        const productsWithWishlist = products.map(product => ({
            ...product.toObject(),
            wishlist: wishlistProducts.includes(product._id.toString())
        }));

        res.render('user/watches', { products: productsWithWishlist, categories, loggedIn: user });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

const shopWatches = async (req, res) => {
    const { category, gender, strapMaterial, priceRange, sortBy, page = 1 } = req.query;
    let filter = { isBlocked: false };
    try {
        const unblockedCategories = await Category.find({ isBlocked: false }).select('categoryName').lean();
        const unblockedCategoryNames = unblockedCategories.map(cat => cat.categoryName.toLowerCase());

        if (category && category !== '-' && unblockedCategoryNames.includes(category.trim().toLowerCase())) {
            filter.category = category.trim().toLowerCase();
        }
        if (gender && gender !== '-') {
            filter.gender = gender.trim().toLowerCase();
        }
        if (strapMaterial && strapMaterial !== '-') {
            filter.strapMaterial = strapMaterial.trim().toLowerCase();
        }
        if (priceRange && parseInt(priceRange) > 0) {
            const maxPrice = parseInt(priceRange);
            filter.price = { $gte: 0, $lte: maxPrice };
        }
        let sort = {};
        if (sortBy === 'priceAsc') sort.price = 1;
        if (sortBy === 'priceDesc') sort.price = -1;
        if (sortBy === 'brandAsc') sort.brand = 1;
        if (sortBy === 'brandDesc') sort.brand = -1;

        const limit = 12;
        const skip = (page - 1) * limit;
        const products = await Product.find({
            ...filter,
            isBlocked: false
        })
        .sort(sort)
        .skip(skip)
        .limit(limit);

        const totalProducts = await Product.countDocuments({
            ...filter,
            isBlocked: false
        });
        const totalPages = Math.ceil(totalProducts / limit);
        const categoryName = await Category.find({ isBlocked: false });
        const user = req.session.user;

        let wishlistProducts = [];
        if (user) {
            const userWishlist = await Wishlist.findOne({ user }).select('products');
            if (userWishlist) {
                wishlistProducts = userWishlist.products.map(product => product.toString());
            }
        }
        const productsWithWishlist = products.map(product => ({
            ...product.toObject(),
            wishlist: wishlistProducts.includes(product._id.toString())
        }));
        const noProductsMessage = products.length === 0 ? "There are no such products." : "";

        res.render('user/shopwatches', {
            products: productsWithWishlist, 
            categories: categoryName,
            currentPage: parseInt(page),
            totalPages,
            loggedIn: user,
            noProductsMessage
        });
    } catch (err) {
        console.error('Error fetching products or categories:', err);
        res.status(500).send('Server Error');
    }
};

const productDetail = async (req, res) => {
    try {
        const id = req.params._id;
        const categories = await Category.find();
        const loggedIn = req.session.user; 
        const products = await Product.findById(id);
        if (!products) {
            throw new Error('Product not found');
        }

        res.render("user/productdetail", { products: products, categories: categories, loggedIn: loggedIn, item: products });
    } catch (error) {
        console.error(error);
        res.status(400).send({ error: error.message });
    }
}

const searchProduct = async (req, res) => {
    try {
        const searchTerm = req.query.q || '';
        const user = req.session.user;
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const skip = (page - 1) * limit;


        const searchTerms = searchTerm.split(' ').filter(term => term);

        
        const searchQuery = searchTerms.length > 0 ? {
            $or: searchTerms.map(term => ({
                $or: [
                    { name: { $regex: term, $options: 'i' } }, 
                    { brand: { $regex: term, $options: 'i' } }, 
                    { strapMaterial: { $regex: term, $options: 'i' } }, 
                    { category: { $regex: term, $options: 'i' } },
                ]
            }))
        } : { price: { $gt: 0 } }; 

        const products = await Product.find(searchQuery)
            .skip(skip)
            .limit(limit);

        const totalProducts = await Product.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalProducts / limit);

        if (products.length === 0) {
            return res.render('user/search', {
                products: [], 
                searchTerm, 
                loggedIn: user, 
                totalPages: 0, 
                currentPage: page, 
                message: 'Product not found'
            });
        }

        res.render('user/search', { 
            products, 
            searchTerm, 
            loggedIn: user, 
            totalPages, 
            currentPage: page, 
            message: ''
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

const logout = (req, res) => {
    req.session.user = false;
    res.redirect("/login")
}

module.exports = {

    homePage,
    login,
    getSignup,
    forgetPassword,
    newPassword,
    getOtp,
    resendOtp,
    categoryWatches,
    shopWatches,
    productDetail,
    verifyResetOtp,
    searchProduct,
    logout,
    signupPost,
    verifyResetOtpPost,
    forgetPasswordPost,
    newPasswordPost,
    loginPost,
    otpPost,

}