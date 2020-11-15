const RTMPserver = require('../livestream/Node-Media-Server/app');
const express = require('express');
const router = express.Router();
const database = require('./database')
var userMod = require("../user");
const { connect } = require('../placeholder');
const config = {
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
            hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
        }
    ]
}
};

router.use(express.static('player'));

router.get('/', function(req, res) {
  RTMPserver.startStreamServer(config);
  res.send('test');
});

router.get("/admin", function(req, res){

  res.render('admin.ejs')

})

router.get("/channel/:chn", async function(req, res) {
 
  const chn = req.params.chn
  var channel = await database.getChannel(chn)
  var user = await req.user
  var key = null
  
  if(!(user === undefined)){

    if(user.objectSid == channel.sid){
      var key = await database.getStreamKey(chn)
    }
    
  }

  res.render('channel.ejs', { name:chn, chn: channel, key:key})
  
})

router.use("/content/:chn", async function(req, res){



  const chn = await req.params.chn
  const key = await database.getStreamKey(chn)
  console.log(req.url)
  console.log(__dirname + "/media/live/" + key + "/")
  //router.ServeFiles("/media/live/" + key + req.url)
  res.sendFile(__dirname + "/media/live/" + key + req.url);
})



function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}  



module.exports = router;