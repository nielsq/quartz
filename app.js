require('dotenv').config()

const RTMPserver = require('./Node-Media-Server/app');
const fetch = require('node-fetch');
const Busboy = require('busboy')
const { promisify } = require('util')
const express = require("express");
const app = express();
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const methodOverride = require('method-override')
const initializePassport = require('./passport-config')
const database = require('./modules/database');
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
app.set('views');


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

//rtmp
RTMPserver.startStreamServer(utils.config);


//routes
app.get("/",  async (req, res) => {

  var user = await req.user

  res.render('home.ejs', { page: "home", user:user} )
})

app.post('/login', utils.checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}))

app.get('/login', utils.checkNotAuthenticated, (req, res) => {
  res.render('login.ejs', { page: "login", user:""} )
})

app.get("/settings",utils.checkAuthenticated, async function(req, res){

  var user = await req.user
  var channel = await database.getChannel(user.nickname)
  var key = await database.getStreamKey(user.nickname)

  res.render('settings.ejs', { chn: channel[0], Skey:key, page:"livestream", user:user, status: req.flash('status')})

})

app.post("/settings", utils.checkAuthenticated, async function(req, res){


  var user = await req.user

  var title = req.body.Title
  var descrip = req.body.descrip
  var loginOnly = req.body.loginOnly

  if(loginOnly == "on"){
    loginOnly = 1
  } else {
    loginOnly = 0
  }

  await database.updateChannel(user.nickname, title, descrip, loginOnly)

  
  res.redirect('/livestream/channel/' + user.nickname)

})

app.post("/settings/thumbnails", utils.checkAuthenticated, async function(req, res){


  var user = await req.user

  var offline = req.body.offline
  var online = req.body.online

  if(offline > 2  || offline < 1){
    req.flash("status", "Fehler: 1 oder 2")
  } else if(online > 3 || online < 1) {
    req.flash("status", "Fehler: 1,2 oder 3")
  } else {
    await database.updateThumbnails(user.nickname, offline, online)
  }

  res.redirect('/livestream/settings/')

})

app.post("/settings/streamKey", utils.checkAuthenticated, async function (req, res){

  var user = await req.user
  var oldKey = await database.getStreamKey(user.nickname)
  var resp = await fetch('http://admin:admin@localhost:8000/api/streams').then(res => res.json());

  const mkdirAsync = promisify(fs.mkdir)
  
    if(!utils.isEmpty(resp)){
      if(Object.keys(resp.live).includes(oldKey)){
        console.log("same")
        req.flash("status", "Fehler: Der Channel ist gerade live")
        res.redirect('/livestream/settings/')
        return

      }else {
        await database.renewStreamKey(user.nickname)
        var newKey = await database.getStreamKey(user.nickname)
        await mkdirAsync(__dirname +"/media/live/"+newKey+ "/")
        
        fs.rename(__dirname +"/media/live/"+oldKey+ "/live.png",__dirname +"/media/live/"+newKey+ "/live.png", (err) =>{
          fs.rename(__dirname +"/media/live/"+oldKey+ "/offline.png",__dirname +"/media/live/"+newKey+ "/offline.png", (err) =>{
            fs.rmdir(__dirname +"/media/live/"+oldKey, (err) =>{

            })
          })
        })
        res.redirect('/settings/')
        return
      }
    } else {
      //keiner live
      await database.renewStreamKey(user.nickname)
      var newKey = await database.getStreamKey(user.nickname)
      await mkdirAsync(__dirname +"/media/live/"+newKey+ "/")
        
      fs.rename(__dirname +"/media/live/"+oldKey+ "/live.png",__dirname +"/media/live/"+newKey+ "/live.png", (err) =>{
        fs.rename(__dirname +"/media/live/"+oldKey+ "/offline.png",__dirname +"/media/live/"+newKey+ "/offline.png", (err) =>{
          fs.rmdir(__dirname +"/media/live/"+oldKey, (err) =>{

          })
        })
      })
       res.redirect('/settings/')
    }
    
    

})

app.post("/settings/offline", utils.checkAuthenticated, async function(req,res) {

  var user = await req.user
  var streamKey = await database.getStreamKey(user.nickname)


  var busboy = new Busboy({
    headers: req.headers,
    limits: {
      fileSize: 2*1024*1024
    }
  });


  busboy.on('file',  async function(fieldname, file, filename, encoding, mimetype) {
    //validate against empty file fields

        // validate file mimetype
        if(mimetype != 'image/png'){
          req.flash("status", "Fehler: Nur PNG")
          file.resume();
        } else {
         
          file.on('limit', function(){
            fs.unlink(__dirname +"/media/live/"+streamKey+ "/"+ filename, function(){ 
              req.flash("status", "Fehler: Max 2mb")
             });
            
          });

          //storing the uploaded photo
          fstream = fs.createWriteStream(__dirname +"/media/live/"+streamKey+ "/"+ filename);
          file.pipe(fstream);

          fstream.on('close', async function() {
            fs.rename(__dirname +"/media/live/"+streamKey+ "/"+ filename,__dirname +"/media/live/"+streamKey+ "/offline.png", (err) => {})
          });
        }

    });

    busboy.on('finish', function() {
      res.redirect('/settings/')

    });
    return req.pipe(busboy);

})

app.post("/settings/live", utils.checkAuthenticated, async function(req,res) {

  var user = await req.user
  var streamKey = await database.getStreamKey(user.nickname)


  var busboy = new Busboy({
    headers: req.headers,
    limits: {
      fileSize: 2*1024*1024
    }
  });


  busboy.on('file',  async function(fieldname, file, filename, encoding, mimetype) {
    //validate against empty file fields

        // validate file mimetype
        if(mimetype != 'image/png'){
          req.flash("status", "Fehler: Nur PNG")
          file.resume();
        } else {
         
          file.on('limit', function(){
            fs.unlink(__dirname +"/media/live/"+streamKey+ "/"+ filename, function(){ 
              req.flash("status", "Fehler: Max 2mb")
             });
            
          });

          //storing the uploaded photo
          fstream = fs.createWriteStream(__dirname +"/media/live/"+streamKey+ "/"+ filename);
          file.pipe(fstream);

          fstream.on('close', async function() {
            fs.rename(__dirname +"/media/live/"+streamKey+ "/"+ filename,__dirname +"/media/live/"+streamKey+ "/live.png", (err) => {})
          });
        }

    });

    busboy.on('finish', function() {
      res.redirect('/settings/')

    });
    return req.pipe(busboy);

})

app.get("/channel/:chn", async function(req, res) {
 
  const chn = req.params.chn
  var channel = await database.getChannel(chn)
  var user = await req.user
  var same
  var live = false;
  var key = await database.getStreamKey(chn)
  var resp = await fetch('http://admin:admin@localhost:8000/api/streams').then(res => res.json());

    if(!utils.isEmpty(resp)){
      if(Object.keys(resp.live).includes(key)){
        var live = true;
      }
    }

  if(user){
    if(user.nickname == chn){
      same = true
    } else {
      same = false
    }
  }
  

  res.render('channel.ejs', { name:chn, chn: channel[0], page:"livestream", user:user, same:same, live:live})
  
})

app.use("/content/:chn", async function(req, res){

  var chn = await req.params.chn
  var key = await database.getStreamKey(chn)
  var chnDetails = await database.getChannel(chn)

  
  if(chnDetails[0].chan_log_on_only == 1){
    if(!req.isAuthenticated()){
      res.send("NOPE")
      return;
    }
  } 

  if(req.url == "/thumbnail.png"){
    var resp = await fetch('http://admin:admin@localhost:8000/api/streams').then(res => res.json());

    if(!utils.isEmpty(resp)){
      if(Object.keys(resp.live).includes(key)){
        if(chnDetails[0].chan_thumb_online == 1){
          res.sendFile(__dirname + "/media/default/live.png")
        } else if (chnDetails[0].chan_thumb_online == 2){
          res.sendFile(__dirname + "/media/live/" + key + "/live.png", (err)=>{
            if (err) {
              res.sendFile(__dirname + "/media/default/live.png")
            }
          })
        } else if (chnDetails[0].chan_thumb_online == 3){
          res.sendFile(__dirname + "/media/live/" + key + "/thumbnail.png", (err)=>{
            if (err) {
              res.sendFile(__dirname + "/media/live/" + key + "/live.png", (err)=>{
                if (err) {
                  res.sendFile(__dirname + "/media/default/live.png")
                }
              })
            }
              
          })
        }
        
      } else {
        if(chnDetails[0].chan_thumb_offline == 1){
          res.sendFile(__dirname + "/media/live/" + key + "/offline.png", (err)=>{
            if (err) {
              res.sendFile(__dirname + "/media/default/offline.png")
            }
          })
        } else {
          res.sendFile(__dirname + "/media/default/offline.png")
        }
        
      }
    } else {
      if(chnDetails[0].chan_thumb_offline == 1){
        res.sendFile(__dirname + "/media/default/offline.png")
      } else {
        
        res.sendFile(__dirname + "/media/live/" + key + "/offline.png", (err)=>{
          if (err) {
            res.sendFile(__dirname + "/media/default/offline.png")
          }
        })
      }
    }
    
  } else {
    res.sendFile(__dirname + "/media/live/" + key + req.url,  function (err) {
      if (err) {
        res.status(err.status).end();
      }
    });
  }



})

app.delete('/logout', (req, res) => {
  req.logOut()
  res.redirect('/login')
})

app.use('/resources', express.static(__dirname + '/resources'));