const User = require('../../models/user')



const usermanagement = async(req,res) => {
        try{
            const users = await User.find()
            res.render("admin/usermanagement",{status:true,users:users})
        }catch(err){
            console.error(err)
        }
}



const blockuserpost = async (req, res) => {
    try{
        const userID = req.params._id;
        console.log(userID);
        const user = await User.updateOne({_id : userID},{$set : {isBlocked:false}})
        console.log(user)
        res.redirect("/admin/usermanagement")
    }catch(error){
        console.log("error in block",error)
    }
};

const unblockuserpost = async (req, res) => {
    try{
        const userID = req.params._id;
        console.log(userID);
        const user = await User.updateOne({_id : userID},{$set : {isBlocked:true}})
        console.log(user)
        res.redirect("/admin/usermanagement")
    }catch(error){
        res.render("admin/usermanagement")
        console.log("error in block",error)
    }
};


module.exports = {

    usermanagement,
    blockuserpost,
    unblockuserpost,
    

}