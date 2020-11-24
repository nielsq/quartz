require('dotenv').config()

const express = require("express");
const app = express();
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const methodOverride = require('method-override')
const initializePassport = require('./passport-config')
const placeholder = require('./modules/placeholder');
const database = require('./modules/database');
const livestream = require('./modules/livestream/app');


initializePassport(passport)

app.set('view-engine', 'ejs')

app.use(express.urlencoded({
  extended: false
}))
app.use(flash())
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))
app.set('views', [__dirname + '/views', __dirname + '/modules/livestream/views']);


//routes

app.get("/", (req, res) => {
  res.render("index.ejs")
})

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/dashboard',
  failureRedirect: '/login',
  failureFlash: true
}))


app.get('/login', checkNotAuthenticated, (req, res) => {
  res.render('login.ejs', { page: "login"} )
})

app.get('/dashboard', checkAuthenticated, async (req, res) => {
  
  var user = await req.user
  
  var aMods = await database.getActivModules()
  console.log(user.nickname)
  res.render('dashboard.ejs', { givenName: user.nickname, mods: aMods, page:"dashboard"  })
 
})


app.delete('/logout', (req, res) => {
  req.logOut()
  res.redirect('/login')
})


app.use('/placeholder', placeholder);

app.use('/livestream', livestream);

app.use('/content', express.static(__dirname + '/content'));

app.listen(3000)


function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }

  res.redirect('/login')
}

function checkNotAuthenticated (req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard')
  }
  next()
}


