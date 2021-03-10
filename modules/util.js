
const thumbnail = require('./thumbnail');
const cron = require('node-cron');
const fs = require('fs')
const fetch = require('node-fetch');
var path = require('path');

const config = {
  logType: 1,
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60,
    
    ssl: {
      port: 1936,
      key: './cert.key',
      cert: './cert.crt',
    }
    
  },
  http: {
    port: 8000,
    mediaroot: './media',
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
    secret: process.env.SECRET_2
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

async function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next()
    }
  
    res.redirect('/login')
}

async function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return res.redirect('/')
    }
    next()
}

async function genThumbnails(){

    var resp = await fetch('http://admin:admin@localhost:8000/api/streams').then(res => res.json());
    if(!isEmpty(resp))
    Object.keys(resp.live).forEach (item => {
      thumbnail.generateStreamThumbnail(config, item) 
    })
   
}
  
cron.schedule('*/1 * * * *', () => {
    genThumbnails()
});

function delThumbnail(streamKey) {
    
    var path2Thumb = '/media/live/'+ streamKey+ '/thumbnail.png'
    try {
    
        fs.unlinkSync(path.join(__dirname , '../', path2Thumb))
      } catch (err) {
        console.log(err)
      }

      
 
}

function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

function removeItemOnce(arr, value) {
  var index = arr.indexOf(value);
  if (index > -1) {
    arr.splice(index, 1);
  }
  return arr;
}


module.exports.config = config;
  module.exports.delThumbnail = delThumbnail;
  module.exports.isEmpty = isEmpty;
  module.exports.checkAuthenticated = checkAuthenticated;
  module.exports.checkNotAuthenticated = checkNotAuthenticated;
  module.exports.removeItemOnce = removeItemOnce;
  
  

