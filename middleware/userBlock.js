const User = require('../models/user');

exports.isUser = async (req, res, next) => {

    if (req.session && req.session.user) {
        const user = await User.findById(req.session.user)
        if (user.isBlocked === true) {
            req.session.user = false
            res.redirect("/login")
        } else {
            next();
        }
    }
    else {
        res.redirect("/login")
    }
}
