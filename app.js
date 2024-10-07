const express = require("express");
const session = require("express-session");
const dotenv = require("dotenv");
const nocache = require("nocache");
const morgan = require("morgan");
const mongoose = require("mongoose")
const uuid = require("uuid");
const path = require('path');
const flash = require('connect-flash')

const app = express();
require('dotenv').config()

const userRouter = require("./routes/user");
const adminRouter = require("./routes/admin");
const authRouter = require('./routes/user')


app.use('/images', express.static(path.join(__dirname, 'public/images')));

app.use(morgan('dev'));
app.use(express.json());

app.use('/auth',authRouter)
app.use(express.static('public'));
app.use("/uploads",express.static('uploads'));
app.use(express.urlencoded({extended:false}));


app.use(nocache());

const port = process.env.PORT || 3000;
const mongodbURI = process.env.MONGODB_URI
const mySecretKey = process.env.SECRET_KEY

const oneday = 1000 * 60 * 60 * 24;
app.use(
    session({
        genid: function(req){
            return uuid.v4();
        },
        resave:false,
        saveUninitialized:true,
        secret:mySecretKey,
        cookie: {maxAge: oneday}
    })
)

// Initialize flash middleware
app.use(flash());

// Make flash messages available in templates
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    next();
});

app.set("view engine","ejs");
app.set('views', path.join(__dirname, 'views')); 
app.use(express.static('./public'));
app.use("/",userRouter);
app.use("/admin",adminRouter);

app.get('*', (req, res) => {
    res.status(404).render('user/404');
  });

mongoose.connect(mongodbURI)
.then(()=> console.log("Mongodb connected..."))
.catch((err) => console.log(err))


app.listen(port,() => console.log('mongoDB connected successfully'));