const RTMPserver = require('../livestream/Node-Media-Server/app');
const express = require('express');
const router = express.Router();
const database = require('./database')
const util = require('../util');
const fetch = require('node-fetch');
const util2 = require('util')

const config = {
  logType: 0,
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60,
    /*
    ssl: {
      port: 443,
      key: './privatekey.pem',
      cert: './certificate.pem',
    }
    */
  },
  http: {
    port: 8000,
    mediaroot: './modules/livestream/media',
    webroot: './www',
    allow_origin: '*',
    api: true
  },
/*
  https: {
    port: 8443,
    key: './privatekey.pem',
    cert: './certificate.pem',
  },
*/
  auth: {
    api: true,
    api_user: 'admin',
    api_pass: 'admin',
    play: false,
    publish: false,
    secret: 'nodemedia2017privatekey'
  },
  trans: {
    ffmpeg: '/usr/bin/ffmpeg',
    tasks: [
        {
            app: 'live',
            hls: true,
            hlsFlags: '[hls_time=1:hls_list_size=1:hls_flags=delete_segments]',
        }
    ]
}
};

RTMPserver.startStreamServer(config);

router.use(express.static('player'));

router.get('/', async function(req, res) {

  var user = await req.user

  var resp = await fetch('http://admin:admin@localhost:8000/api/streams').then(res => res.json());

  var test = JSON.stringify(resp)
  console.log(test)



  res.render('livestream.ejs', {page:"livestream",user:user})
});

router.get("/settings/",util.checkAuthenticated, async function(req, res){

  var user = await req.user
  var channel = await database.getChannel(user.nickname)
  var key = await database.getStreamKey(user.nickname)

  res.render('settings.ejs', { chn: channel[0], Skey:key, page:"livestream", user:user})

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

router.get("/channel/:chn", async function(req, res) {
 
  const chn = req.params.chn
  var channel = await database.getChannel(chn)
  var user = await req.user
  var link = "/livestream/content/"+chn+"/index.m3u8"
  var same

  if(user){
    if(user.nickname == chn){
      same = true
    } else {
      same = false
    }
  }
  

  res.render('channel.ejs', { name:chn, chn: channel[0], link:link, page:"livestream", user:user, same:same})
  
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

module.exports = router;