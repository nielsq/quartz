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
const fs = require('fs')
const https = require('https');
const http = require('http');
const utils = require('./modules/util');
const passportSocketIo = require("passport.socketio");
const { connect } = require('./modules/placeholder');
const MySQLStore = require('express-mysql-session')(session)    
const connect2 = require("passport/lib/framework/connect")


//80 -> 443
http.createServer(function (req, res) {
  res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
  res.end();
}).listen(80);

//SSL
var privateKey = fs.readFileSync( 'cert.key' );
var certificate = fs.readFileSync( 'cert.crt' );

var server = https.createServer({
  key: privateKey,
  cert: certificate
}, app).listen(443)



const sessionStore = new MySQLStore({
  host            : process.env.DB_HOST,
  user            : process.env.DB_USER,
  password        : "root",
  database        : "sessions",
  insecureAuth : true
});

initializePassport(passport)

app.set('view-engine', 'ejs')

app.use(express.urlencoded({
  extended: false
}))
app.use(flash())
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))
app.set('views', [__dirname + '/views', __dirname + '/modules/livestream/views']);


//SocketIO
const io = require('socket.io')(server);

io.use(passportSocketIo.authorize({

  cookieParser: require("cookie-parser"),
  key:          'connect.sid', 
  secret:       process.env.SESSION_SECRET,
  store:       sessionStore,
  success:      onAuthorizeSuccess, 
  fail:         onAuthorizeFail,
}));

io.on("connection", async function(socket){
  console.log("HELLO")
        
});

function onAuthorizeSuccess(data, accept){

  accept(null, true);
}
 
function onAuthorizeFail(data, message, error, accept){

  accept(null, true);
}

  

//routes

app.get("/", (req, res) => {
  res.render("index.ejs")
})

app.post('/login', utils.checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/dashboard',
  failureRedirect: '/login',
  failureFlash: true
}))

app.get('/login', utils.checkNotAuthenticated, (req, res) => {
  res.render('login.ejs', { page: "login", user:""} )
})

app.get('/dashboard', utils.checkAuthenticated, async (req, res) => {
  
  var user = await req.user
  
  var aMods = await database.getActivModules()
  console.log(user.nickname)
  res.render('dashboard.ejs', { user:user, mods: aMods, page:"dashboard"  })
 
})

app.delete('/logout', (req, res) => {
  req.logOut()
  res.redirect('/login')
})

app.use('/placeholder', placeholder);

app.use('/livestream', livestream);

app.use('/content', express.static(__dirname + '/content'));



