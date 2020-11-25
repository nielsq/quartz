const RTMPserver = require('../livestream/Node-Media-Server/app');
const express = require('express');
const router = express.Router();
const database = require('./database')
const util = require('../util');



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

  res.render('livestream.ejs', {page:"livestream",user:user})
});

router.get("/admin", function(req, res){
  res.render('admin.ejs')
})

router.get("/channel/:chn", async function(req, res) {
 
  const chn = req.params.chn
  var channel = await database.getChannel(chn)
  var user = await req.user
  var link = "http://vssubuntu:3000/livestream/content/"+chn+"/index.m3u8"

  res.render('channel.ejs', { name:chn, chn: channel[0], link:link, page:"livestream", user:user})
  
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

  res.sendFile(__dirname + "/media/live/" + key + req.url);
})

router.use('/player', express.static(__dirname + '/player'));

module.exports = router;