const nodemailer = require("nodemailer")
const randomstring = require("randomstring")
const { authenticator } = require("otplib");
const User = require('../../models/user')
const Product = require("../../models/product");
const Category = require("../../models/category");
const Otp = require("../../models/otp");





require("dotenv").config();

const secret = authenticator.generateSecret();
const token = authenticator.generate(secret)



const signup = (req, res) => {
    res.render("user/signup",)
}

const signuppost = async (req, res) => {
    try {
        const data = {
            name: req.body.username,
            email: req.body.email,
            password: req.body.password
        };
        console.log("data")
        const existingUser = await User.findOne({ email: data.email });

        if (existingUser) {
            res.render("user/signup",{status:true,errMessage:"User already exists"})
        } else {
            req.session.userData = data;
            console.log("c1", req.session.userData);


            const transporter = nodemailer.createTransport({
                service: 'gmail',
                host: "smtp.gmail.email",
                port: 587,
                secure: false,
                auth: {
                    user: process.env.ADMINMAIL,
                    pass: process.env.ADMINPASS
                },
            });

            const mailOptions = {
                from: {
                    name: 'Quartzmen',
                    address: process.env.ADMINMAIL
                },
                to: req.session.userData.email,
                subject: "OTP verification✔",
                text: "Hello world?",
                html: `please verify your mail with this OTP   ${token}`,
            };

            const sendMail = async (transporter, mailOptions) => {
                try {
                    await transporter.sendMail(mailOptions);
                    console.log('email has been sent');
                } catch (error) {
                    console.log(error);
                }
            };

            sendMail(transporter, mailOptions);
        }
        const otpmail = {
            email: req.body.email,
            otp: token

        }
        await Otp.insertMany(otpmail)
        res.redirect("/otp")
    } catch (error) {
        console.error("Error during signup:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

const otp = (req, res) => {
    const timeLeft = req.session.timeLeft || 60; 
    res.render("user/otp",{context:'signup',timeLeft:timeLeft})
}
const otppost = async (req, res) => {
    try {

        const enteredOtp = req.body['otp[]'] ? req.body['otp[]'].join('') : null;
        const timeLeft = req.session.timeLeft || 60; 
        if (!enteredOtp) {
            throw new Error("OTP not entered");
        }
        const otpdata = await Otp.findOne({ email: req.session.userData.email })
       

        if (enteredOtp ===otpdata.otp ) {
            console.log('OTP verified successfully');

            const userData = req.session.userData;
            if (!userData || !userData.password || !userData.email || !userData.name) {
                console.error("Missing required fields in user data");
                return res.status(400).json({ error: "Missing required fields in user data" });
            }

            await User.insertMany(userData);
            return res.redirect("/login");
        } else {
            res.render("user/otp",{errMessage:"otp is incorrect",context:"signup",timeLeft});
        }
    } catch (error) {
        console.error("Error during OTP verification:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

const resendotp = async(req,res) =>{
    try {
        const userEmail = req.session.userData.email;

        if (!userEmail) {
            return res.status(400).json({ error: "No email found in session" });
        }

        const secret = authenticator.generateSecret();
        const newToken = authenticator.generate(secret);

        // Update the OTP in the database
        await Otp.updateOne({ email: userEmail }, { otp: newToken });

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            host: "smtp.gmail.email",
            port: 587,
            secure: false,
            auth: {
                user: process.env.ADMINMAIL,
                pass: process.env.ADMINPASS
            },
        });

        const mailOptions = {
            from: {
                name: 'Quartzmen',
                address: process.env.ADMINMAIL
            },
            to: userEmail,
            subject: "Resend OTP Verification",
            text: "Hello, here is your OTP code for verification",
            html: `Please verify your email with this OTP: ${newToken}`,
        };

        await transporter.sendMail(mailOptions);

        res.render("user/otp")
    } catch (error) {
        console.error("Error during OTP resend:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

const forgetpassword = (req,res) =>{
    res.render("user/forgetpassword")
}

const forgetpasswordpost = async(req,res) =>{
    try{
        const {email} = req.body;
        const existingUser = await User.findOne({email : email});

        if(!existingUser){
            res.render("user/forgetpassword",{status:true,errMessage:"User is not found,Retry..."})
        }
        const transporter = nodemailer.createTransport({
            service:'gmail',
            host:'smtp.gmail.email',
            port:587,
            secure:false,
            auth:{
                user:process.env.ADMINMAIL,
                pass:process.env.ADMINPASS
            }
        })
        const mailOptions = {
            from:{
                name:'Quartzmen',
                address:process.env.ADMINMAIL
            },
            to:email,
            subject:'OTP for password reset',
            text:"Your OTP for password reset is "+ token,
            html: `Your OTP for password reset is ${token}`
        }
        await transporter.sendMail(mailOptions);
        const otpdata = {
            email:email,
            otp:token
        };

        await Otp.insertMany(otpdata);

        req.session.userData = { email };
        res.redirect("forgetpassword/otp");
        
    }catch(error){
        console.log(error)
    }
}

const verifyresetotp = (req, res) => {
    res.render("user/otp",{context:'reset',userData: req.session.userData});
};

const verifyresetotppost = async (req, res) => {
    try {
        const enteredOTP = req.body['otp[]'];
        console.log(req.body);
        const enteredOTPStr = enteredOTP.join('');
        console.log('Entered OTP:', enteredOTPStr);

        const otpdata = await Otp.findOne({ email: req.session.userData.email });

        if (enteredOTPStr === otpdata.otp) {
            console.log('Reset OTP verified successfully');
            res.redirect("/newpassword");
        } else {
            res.render("user/forgetpassword",{errMessage:"An error occured try again"})
        }
    } catch (error) {
        console.error("Error during OTP verification:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};


const newpassword = (req, res) => {
    console.log("newpass")
    res.render("user/newpassword");
};

const newpasswordpost = async (req, res) => {
    try {
        const { password } = req.body;
        const email = req.session.userData.email;
        console.log(email)

        const user = await User.findOne({ email: email });

        if (!user) {
            return res.render("user/newpassword", { status: true, errMessage: "User not found" });
        }

        user.password = password;
        await user.save();

        // Clear OTP data from database
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

const loginpost = async (req, res) => {
    const userData = {
        email: req.body.email.toLowerCase(),  // Normalize the email to lowercase
        password: req.body.password
    }
    console.log(userData);

    try {
        const checkUser = await User.findOne({ email: userData.email });
        console.log(checkUser);

        if (checkUser) {
            if (checkUser.isBlocked === true) {

                req.session.destroy((err) => {
                    if (err) {
                        return res.status(500).send("Session destruction failed");
                    }
                    res.render("user/login", { status: true, errMessage: "You are blocked" });
                });
            } else if (checkUser.password === userData.password) {
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
}


const homepage = async (req, res) => {
    try {
        const userProducts = await Product.find();
        const userCategories = await Category.find();
        const logIn = req.session.user;
        const userData = User.findById(logIn)

        if(!userData){
            res.render("user/login",{errMessage:"The user does not exist."})
        }

        const visibleCategory = userCategories.filter(category => !category.isBlocked);
        const visibleProduct = userProducts.filter(product => !product.isBlocked);
        
        
        res.render('user/homepage', { products: visibleProduct, loggedIn: logIn, categories: visibleCategory });
    } catch (err) {
        console.log(err);
    }
}

const watches = async(req,res) =>{
    try{
        const products = await Product.find();
        const categories = await Category.find();
        const loggedIn = req.session.user

        const unBlockedProducts = products.filter(product => !product.isBlocked)
        const unBlockedCategories  = categories.filter(category => !category.isBlocked)

        res.render("user/watches",{products:unBlockedProducts,categories:unBlockedCategories,loggedIn:loggedIn})
    }catch(error){
        console.log(error)
    }
}

const productdetail = async(req, res) => {
    try {
        const id = req.params._id;
        console.log(id);

        // Validate the ID


        const categories = await Category.find();
        const loggedIn = req.session.user;
        const products = await Product.findById(id);
        
        if (!products) {
            throw new Error('Product not found');
        }

        console.log(products);
        res.render("user/productdetail", { products: products, categories: categories, loggedIn: loggedIn, item : products});
    } catch (error) {
        console.log(error);
        res.status(400).send({ error: error.message });
    }
}

const searchProduct = async(req,res) => {
    try{
        const {search} = req.query;

        let products = [];
        if(search){
            products = await Product.find({
                $or:[
                    {name:{$regex:search,$options:'i'}},
                    {brand:{$regex:search,$options:'i'}},
                    {strapMaterial:{$regex:search,$options:'i'}},
                    {category:{$regex:search,$options:'i'}}
                    
                ]
            })
        }
        res.render("user/search",{products,search})
    }catch(err){
        console.error(err)
        res.status(500).send("Internal error occured in the search")
    }
}



const logout = (req,res) =>{
    req.session.destroy((err)=>{
        if(err){
            console.log("An error occured while logout",err)
        }else{
            res.redirect("/login")
        }
    })
}


module.exports = {
    // get
    homepage,
    login,
    signup,
    forgetpassword,
    newpassword,
    otp,
    resendotp,
    watches,
    productdetail,
    verifyresetotp,
    searchProduct,
    
    // post
    signuppost,
    verifyresetotppost,
    forgetpasswordpost,
    newpasswordpost,
    loginpost,
    otppost,
    logout,
}