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
const initializePassport = require('./modules/passport-config')
const database = require('./modules/database');
const fs = require('fs')
const https = require('https');
const http = require('http');
const utils = require('./modules/util');
const passportSocketIo = require("passport.socketio");
const MySQLStore = require('express-mysql-session')(session)    


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
app.set('view-engine', 'ejs')

//SocketIO
const io = require('socket.io')(server);

var authSockets = {};
var viewerCount = {};
var viewerfd = {}

const chatNSP = io.of("/chat")
const viewerNSP = io.of("/viewer")

chatNSP.use(passportSocketIo.authorize({

  cookieParser: require("cookie-parser"),
  key:          'connect.sid', 
  secret:       process.env.SESSION_SECRET,
  store:       sessionStore,
  success:      onAuthorizeSuccess, 
  fail:         onAuthorizeFail,
}));

viewerNSP.use(passportSocketIo.authorize({

  cookieParser: require("cookie-parser"),
  key:          'connect.sid', 
  secret:       process.env.SESSION_SECRET,
  store:       sessionStore,
  success:      onAuthorizeSuccess, 
  fail:         onAuthorizeFail,
}));

viewerNSP.on("connection", async function(socket){

  socket.on('join', async function (room) {
    
    socket.join(room);
    socket.room = room;
    if (viewerCount[room] == undefined) {
        viewerCount[room] = 1;
    } else {
        viewerCount[room]++;
    }

  })

  socket.on('disconnect', async function () {

    viewerCount[socket.room]--;


  })

})

chatNSP.on("connection", async function(socket){

  socket.on('join', async function (room) {

    var user = await socket.request.user
    console.log(room)
    var chn = await database.getChannelByName(room)
    var allowedUser = chn.users.split(";")

    if(chn.chat == 1){
      socket.close()
      return
    } else if (!user.nickname && (chn.chat == 3 || chn.chat == 5)){
      socket.close()
      return
    } else if(chn.user_only == 2 && user.logged_in  == false){
      socket.close()
      return
    } else if(chn.user_only == 3 && !allowedUser.includes(user.nickname) && room != user.nickname){
      socket.close()
      return
    }

    socket.join(room);
    socket.room = room;
    
    if(user.logged_in  == false){
  
    } else if (user.nickname){

      var ary = [];
      if(!authSockets[user.nickname]){
  
        ary[0] = socket.id
  
        authSockets[user.nickname] = ary
  
      } else {
  
        ary = authSockets[user.nickname]
        ary[ary.length] = socket.id
        authSockets[user.nickname] = ary
  
      }
      
    } 
  });

  socket.on('disconnect', async function () {

    if(socket.room){
      var socketIDS = []
      socketIDS = authSockets[socket.room]
      utils.removeItemOnce(socketIDS, socket.id)
      utils.removeItemOnce(viewerfd[socket.room].positiv, socket.id)
      utils.removeItemOnce(viewerfd[socket.room].negativ, socket.id)
    }

  });

  socket.on('chat message', async function (msg) {
    var user = await socket.request.user;
    var chn = await database.getChannelByName([socket.room])
    var allowedUser = chn.users.split(";")

    if(chn.chat == 1){
      chatNSP.to(socket.id).emit("status", {success: false, asw: "Deaktiviert"} )
    } else if((chn.user_only == 2 || chn.user_only == 3) && user.logged_in  == false){
      chatNSP.to(socket.id).emit("status", {success: false, asw: "Nicht berechtigt"} )
    } else if((chn.chat == 3 || chn.chat == 5) && !allowedUser.includes(user.nickname) && socket.room != user.nickname && chn.user_only == 3){
      chatNSP.to(socket.id).emit("status", {success: false, asw: "Nicht berechtigt"} )    
    }else if(msg.length > 280){
      chatNSP.to(socket.id).emit("status", {success: false, asw: "Maximal 280 zeichen"} )
    }else if(msg.length <= 0){
      chatNSP.to(socket.id).emit("status", {success: false, asw: "Bro, musst schon was schreiben"} )
    } else if (!user.nickname && (chn.chat == 3 || chn.chat == 5)){
      chatNSP.to(socket.id).emit("status", {success: false, asw: "User only"} )
    } else {
      chatNSP.to(socket.id).emit("status", {success: true, asw: "Danke für die Nachricht"} )

      if(chn.chat == 2 || chn.chat == 3 ) {
        var socketIDS = []
        socketIDS = authSockets[socket.room]
    
        socketIDS.forEach(element => {
          if(user.nickname){
            chatNSP.to(element).emit("chat message", {name: user.nickname + ": ", msg: msg} )
          } else {
            chatNSP.to(element).emit("chat message", {name: "Gast: ", msg: msg} )
          }
          
        });
      } else if( chn.chat == 4 || chn.chat == 5 ) {
        console.log("Sending to all")
        if(user.nickname){
          chatNSP.to(socket.room).emit("chat message", {name: user.nickname + ": ", msg: msg} )
        } else {
          chatNSP.to(socket.room).emit("chat message", {name: "Gast: ", msg: msg} )
        }
        
      }

    }
   
  });

  socket.on("feedback", async function(status) {

    var chan = await database.getChannelByName([socket.room])
    var user = await socket.request.user;
    var allowedUser = chan.users.split(";")

    if(chan.feedback == 1 ){
      chatNSP.to(socket.id).emit("feedback", {success: false, asw: "Deaktiviert"} )
    } else if( chan.feedback == 2 && !user.nickname){
      chatNSP.to(socket.id).emit("feedback", {success: false, asw: "User only"} )
    } else if( chan.feedback == 2 && !allowedUser.includes(user.nickname) && socket.room != user.nickname && chan.user_only == 3){
      chatNSP.to(socket.id).emit("feedback", {success: false, asw: "nicht Berechtigt"} )
    } else if( (chan.feedback == 2 && user.nickname) ||  chan.feedback == 3 ){
      //chat user ONly WIR SIND USER
      if(viewerfd[socket.room] === undefined){
        viewerfd[socket.room] = {
          positiv : [],
          negativ : [] 
        }
      }
      
      //feedback 1 = good | 0 = bad
      if(status == 1){
        console.log("GOOOD")
        if(viewerfd[socket.room].positiv.includes(socket.id)) {
          utils.removeItemOnce(viewerfd[socket.room].positiv, socket.id)
          chatNSP.to(socket.id).emit("feedback", {success: true, asw: "Vote removed"} )
        } else {
          utils.removeItemOnce(viewerfd[socket.room].negativ, socket.id)
          viewerfd[socket.room].positiv.push(socket.id)
          chatNSP.to(socket.id).emit("feedback", {success: true, asw: "Vote: Positiv"} )
        }
       
      } else if(status == -1) {
        console.log("NOT GOOOOED")
        if(viewerfd[socket.room].negativ.includes(socket.id)) {
          utils.removeItemOnce(viewerfd[socket.room].negativ, socket.id)
          chatNSP.to(socket.id).emit("feedback", {success: true, asw: "Vote removed"} )
        } else {
          utils.removeItemOnce(viewerfd[socket.room].positiv, socket.id)
          viewerfd[socket.room].negativ.push(socket.id)
          chatNSP.to(socket.id).emit("feedback", {success: true, asw: "Vote: Negativ"} )
        }
      }  else if(status == "reset") {

        if(socket.room == user.nickname){
          viewerfd[socket.room] = {
            positiv : [],
            negativ : [] 
          }
          chatNSP.to(socket.room).emit("feedback", {success: true, asw: "Vote removed"} )
        } 
      } 

      var socketIDS = []
      socketIDS = authSockets[socket.room]
      
      socketIDS.forEach(element => {
        chatNSP.to(element).emit("feedback", {negativ: viewerfd[socket.room].negativ.length, positiv: viewerfd[socket.room].positiv.length})  
      });
    }

  })

})


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
  var resp = await fetch('http://admin:admin@localhost:8000/api/streams').then(res => res.json());
  var channels = []

  if(!utils.isEmpty(resp)){

    var liveChans = Object.keys(resp.live);
    
    for(const item in liveChans){
      console.log(liveChans[item])
      var infos = await database.getChannelBySKey(liveChans[item])
      var infos2 = await database.getUser(infos.id)
      
      var channel = {
        title : infos.title,
        nickname : infos2.nickname 
      }
      
      channels.push(channel)
  
    }
  }


  console.dir(channels)
  res.render('home.ejs', { page: "home", user:user, livechannel: channels} )

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
  var channel = await database.getChannel(user.id)

  res.render('settings.ejs', { chn: channel, Skey:channel.skey, page:"channel", user:user, status: req.flash('status'), same:true})

})

app.post("/settings", utils.checkAuthenticated, async function(req, res){

  var user = await req.user

  var title = req.body.Title
  var descrip = req.body.descrip
  var chat = req.body.chat
  var feedback = req.body.feedback
  var user_only = req.body.user_only
  var users = req.body.users


  if(chat > 5 || chat < 0){
    req.flash("status", "Fehler: Falsche Chat funktion")
  }

  await database.updateChannel(user.id, title, descrip, user_only, chat, feedback, users)

  
  res.redirect('/channel/' + user.nickname)

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
    await database.updateThumbnails(user.id, offline, online)
  }

  res.redirect('/settings/')

})

app.post("/settings/streamKey", utils.checkAuthenticated, async function (req, res){

  var user = await req.user
  var oldKey = await database.getStreamKey(user.id)
  var resp = await fetch('http://admin:admin@localhost:8000/api/streams').then(res => res.json());

  const mkdirAsync = promisify(fs.mkdir)
  
    if(!utils.isEmpty(resp)){
      if(Object.keys(resp.live).includes(oldKey)){
        console.log("same")
        req.flash("status", "Fehler: Der Channel ist gerade live")
        res.redirect('/livestream/settings/')
        return

      }else {
        await database.renewStreamKey(user.id)
        var newKey = await database.getStreamKey(user.id)
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
      await database.renewStreamKey(user.id)
      var newKey = await database.getStreamKey(user.id)
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
  var streamKey = await database.getStreamKey(user.id)

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
  var streamKey = await database.getStreamKey(user.id)

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
  var channel = await database.getChannelByName(chn)
  var user = await req.user
  var same = false
  var live = false;  

  var resp = await fetch('http://admin:admin@localhost:8000/api/streams').then(res => res.json());

    if(!utils.isEmpty(resp)){
      if(Object.keys(resp.live).includes(channel.skey)){

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
  
  res.render('channel.ejs', { name:chn, chn: channel, page:"channel", user:user, same:same, live:live})
  
})

app.get("/mychannel", utils.checkAuthenticated, async function(req, res) {
 
  var user = await req.user

  res.redirect('/channel/' + user.nickname)
  
})

app.get("/viewer/:chn", async function(req, res) {
 
  const chn = req.params.chn
  var viewer = viewerCount[chn]

  if (viewer === undefined ){
    res.send("Viewer: 0 ")
  } else {
    res.send("Viewer: " + viewer)
  }

})

app.use("/content/:chn", async function(req, res){

  var chn = await req.params.chn 
  var chnDetails = await database.getChannelByName(chn)
  var key = chnDetails.skey
  var user = await req.user

  
  if((chnDetails.user_only == 2 || chnDetails.user_only == 3) && !req.isAuthenticated()){
      res.send("NOPE")
      return;
  } 

    var allowedUser = chnDetails.users.split(";")

  if(chnDetails.user_only == 3 && !allowedUser.includes(user.nickname) && chn != user.nickname){
    res.send("NOPE")
    return;
  }

  if(req.url == "/thumbnail.png"){
    var resp = await fetch('http://admin:admin@localhost:8000/api/streams').then(res => res.json());

    if(!utils.isEmpty(resp)){
      if(Object.keys(resp.live).includes(key)){
        if(chnDetails.thumb_online == 1){
          res.sendFile(__dirname + "/media/default/live.png")
        } else if (chnDetails.thumb_online == 2){
          res.sendFile(__dirname + "/media/live/" + key + "/live.png", (err)=>{
            if (err) {
              res.sendFile(__dirname + "/media/default/live.png")
            }
          })
        } else if (chnDetails.thumb_online == 3){
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
        if(chnDetails.thumb_offline == 1){
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
      if(chnDetails.thumb_offline == 1){
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