const thumbnail = require('./thumbnail');
const cron = require('node-cron');
const fs = require('fs')
const path = require('path');
const fetch = require('node-fetch');

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
        fs.unlinkSync(__dirname+path2Thumb)
      } catch (err) {

      }

    
 
}

function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

  module.exports.delThumbnail = delThumbnail;
  module.exports.config = config;
  module.exports.isEmpty = isEmpty;