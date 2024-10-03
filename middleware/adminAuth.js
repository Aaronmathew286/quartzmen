const adminAuth = (req, res, next) => {
    if ( req.session && req.session.admin) {
        return next();
    } else {
        res.render("admin/login")
    }
};

module.exports = adminAuth;