const LocalStrategy = require('passport-local').Strategy
var user = require('./user')
const database = require('./database');

function initialize(passport) {
  const authenticateUser = async (name, passpord, done) => {
    
    const result = await user.authUser(name+ process.env.DOMAIN, passpord)
    
    if(result){

      const user = await database.getUserByNickname(name)
      console.dir(user)
        return done(null, user)
        
    } else {
        return done(null, false, { message: 'Thats not correct' })

    }

  }

  passport.use(new LocalStrategy({ usernameField: 'username' }, authenticateUser))
  passport.serializeUser((user, done) => done(null, user.id))
  passport.deserializeUser((id, done) => {
    return done(null, database.getUser(id))
  })
}

module.exports = initialize