
 exports.checkAuthenticated= function(req, res, next) {
    if (req.isAuthenticated()) {
      return next()
    }
  
    res.redirect('/login', {page:"login"})
  }
  
   exports.checkNotAuthenticated = function(req, res, next) {
    if (req.isAuthenticated()) {
      return res.redirect('/dashboard', {page:"dashboard"})
    }
    next()
  }

  
