const User = require('../models/user');

exports.isUser=async (req,res,next)=>{
    
     if( req.session.user){
        const user=await User.findById( req.session.user)
        if(user.isBlocked === true){
            delete  req.session.user
            res.redirect("/login")
        }else{
            next();
        }
        
        }
    else{
            res.redirect("/login")
    } 
}
