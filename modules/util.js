const connect = require("passport/lib/framework/connect")

 exports.checkAuthenticated= function(req, res, next) {
    if (req.isAuthenticated()) {
      return next()
    }
  
    res.redirect('/login')
  }
  
   exports.checkNotAuthenticated = function(req, res, next) {
    if (req.isAuthenticated()) {
      return res.redirect('/dashboard')
    }
    next()
  }
