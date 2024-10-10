const User = require('../../models/user')


const userManagement = async (req, res) => {
    try {
  
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit; 

        const users = await User.find()
            .sort({ createdAt: -1 }) 
            .skip(skip) 
            .limit(limit); 

        const totalUsers = await User.countDocuments();
        const totalPages = Math.ceil(totalUsers / limit);
        res.render("admin/usermanagement", {
            status: true,
            users: users,
            currentPage: page,
            totalPages: totalPages,
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal server error occurred in user management");
    }
};

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