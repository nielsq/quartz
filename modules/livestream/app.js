const RTMPserver = require('../livestream/Node-Media-Server/app');
const express = require('express');
const router = express.Router();
const database = require('./database')
const util = require('../util');
const fetch = require('node-fetch');
const busboy = require('connect-busboy')
const ls_util = require('./ls_util')
const fs = require('fs')
const flash = require('express-flash')
const session = require('express-session')

router.use(flash())
router.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}))

router.use(busboy());


RTMPserver.startStreamServer(ls_util.config);

router.use(express.static('player'));

router.get('/', async function(req, res) {

  var user = await req.user

  var resp = await fetch('http://admin:admin@localhost:8000/api/streams').then(res => res.json());
  res.render('livestream.ejs', {page:"livestream",user:user})
});

router.get("/settings/",util.checkAuthenticated, async function(req, res){

  var user = await req.user
  var channel = await database.getChannel(user.nickname)
  var key = await database.getStreamKey(user.nickname)

  res.render('settings.ejs', { chn: channel[0], Skey:key, page:"livestream", user:user, status: req.flash('status')})

})

router.post("/settings/", util.checkAuthenticated, async function(req, res){


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

router.post("/settings/streamKey", util.checkAuthenticated, async function (req, res){

  var user = await req.user

  var oldKey = await database.getStreamKey(user.nickname)
  var resp = await fetch('http://admin:admin@localhost:8000/api/streams').then(res => res.json());

    if(!isEmpty(resp)){
      if(Object.keys(resp.live).includes(oldKey)){
        console.log("same")
        req.flash("status", "Fehler: Der Channel ist gerade live")
        res.redirect('/livestream/settings/')
        return

      }else {
        await database.renewStreamKey(user.nickname)
        res.redirect('/livestream/settings/')
        return
      }
    } else {
      //keiner live
      await database.renewStreamKey(user.nickname)
      res.redirect('/livestream/settings/')
    }
    
    

})

router.post("/settings/offline", util.checkAuthenticated, async function(req,res) {

  var user = await req.user
  var streamKey = await database.getStreamKey(user.nickname)

  req.pipe(req.busboy);

  // Für jede empfangene Datei
  req.busboy.on('file', function (fieldname, file, filename) {
      // Schreibe die Datei auf die Festplatte
      file.pipe(fs.createWriteStream(__dirname +"/media/live/"+streamKey+ "/"+ filename));
  });

  // Busboy hat alle Formulardaten fertig verarbeitet
  req.busboy.on('finish', function() {
      // Sende Antwort zum Client
      res.send("done");
  });

})

router.get("/channel/:chn", async function(req, res) {
 
  const chn = req.params.chn
  var channel = await database.getChannel(chn)
  var user = await req.user
  var same

  if(user){
    if(user.nickname == chn){
      same = true
    } else {
      same = false
    }
  }
  

  res.render('channel.ejs', { name:chn, chn: channel[0], page:"livestream", user:user, same:same})
  
})

router.use("/content/:chn", async function(req, res){
  var chn = await req.params.chn
  var key = await database.getStreamKey(chn)
  var chnDetails = await database.getChannel(chn)
  
  if(chnDetails[0].chan_log_on_only == 1){
    if(!req.isAuthenticated()){
      res.send("NOPE")
      return;
    }
  } 

  res.sendFile(__dirname + "/media/live/" + key + req.url,  function (err) {
    if (err) {
      res.status(err.status).end();
    }
  });

})

router.use('/player', express.static(__dirname + '/player'));

function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}



module.exports = router;