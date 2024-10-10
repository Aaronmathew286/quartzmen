const User = require('../models/user');

exports.isUser = async (req, res, next) => {
    if (req.session && req.session.user) {
      const user = await User.findById(req.session.user);
      if (user && user.isBlocked) {
        req.session.user = false; // Set the session user to false for blocked users
        res.redirect("/login");
      } else {
        next();
      }
    } else {
      res.redirect("/login");
    }
  };
  
