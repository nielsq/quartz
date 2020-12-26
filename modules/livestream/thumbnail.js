const spawn = require('child_process').spawn,


generateStreamThumbnail = (config, stream_key) => {
    config = config
    const args = [
        '-y',
        '-i', 'http://admin:admin@localhost:8000/live/'+stream_key+'/index.m3u8',
        '-ss', '00:00:01',
        '-vframes', '1',
        '-vf', 'scale=-2:300',
        './modules/livestream/media/live/'+stream_key+'/thumbnail.png',
    ];

    const child = spawn(config.trans.ffmpeg, args, {
        detached: true,
        stdio: 'ignore'
    }).unref();

    
};


module.exports.generateStreamThumbnail = generateStreamThumbnail;