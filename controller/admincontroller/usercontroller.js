const User = require('../../models/user')


const userManagement = async(req,res) => {
        try{
            const users = await User.find()
            res.render("admin/usermanagement",{status:true,users:users})
        }catch(err){
            console.error(err)
            res.render("Internal server error occured in user management")
        }
}

const blockUserPost = async (req, res) => {
    try{
        const userID = req.params._id;
        const user = await User.updateOne({_id : userID},{$set : {isBlocked:false}})

        res.redirect("/admin/usermanagement")
    }catch(error){
        console.error("error in block",error)
        res.render("Internal Server error")
    }
};

const unblockUserPost = async (req, res) => {
    try{
        const userID = req.params._id;
        const user = await User.updateOne({_id : userID},{$set : {isBlocked:true}})

        res.redirect("/admin/usermanagement")
    }catch(error){
        res.render("admin/usermanagement")
        console.error("error in block",error)
    }
};


module.exports = {
    userManagement,
    blockUserPost,
    unblockUserPost,
}