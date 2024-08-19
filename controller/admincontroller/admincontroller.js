const User = require("../../models/user")
const Product = require("../../models/product")
const Category = require("../../models/category")



const login = (req,res)=>{

    
    if(!req.session.admin){
        res.render("admin/login")
    }else{
        res.redirect('/admin/dashboard')
    }
}

const loginpost = async(req,res) =>{

    const {username,password} = req.body

    if(username == process.env.ADMINMAIL && password == process.env.ADMINPASSWORD){
        req.session.admin = req.body.username;
        adminsession = req.session.admin;

        res.redirect("/admin/dashboard")

    }else {
        res.render("admin/login",{status:true,errMessage:"Invalid name and password,Retry..."})
    }
}

const dashboard = (req,res) => {
    if(req.session.admin){
        res.render("admin/dashboard")
    }else{
        res.render("admin/login")
    }
}

const logout = (req,res) =>{
    req.session.destroy((err)=>{
        if(err){
            
            console.log("An error occured while logout",err)
        }else{
            res.redirect("/admin/login")
        }
    })
}

module.exports = {

    login,
    dashboard,
    logout,
    loginpost,

}