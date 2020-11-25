const LocalStrategy = require('passport-local').Strategy
var ad = require('./modules/ad')
var userMod = require("./modules/user");

function initialize(passport) {
  const authenticateUser = async (name, passpord, done) => {
    
    const result = await ad.authUser(name+ process.env.DOMAIN, passpord)
    
    if(result){

      const user = await userMod.getUserByNickname(name)

        return done(null, user)
        
    } else {
        return done(null, false, { message: 'Thats not correct' })

    }

  }

  passport.use(new LocalStrategy({ usernameField: 'username' }, authenticateUser))
  passport.serializeUser((user, done) => done(null, user.objectSid))
  passport.deserializeUser((id, done) => {
    return done(null, userMod.getUserBySID(id))
  })
}




module.exports = initialize