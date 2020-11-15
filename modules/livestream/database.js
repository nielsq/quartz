var mysql = require('mysql2');
var ad = require('../ad');
var database = require('../database');
var userMod = require("../user");
var ad = require('../ad')

const uuid = require('uuid');

class Channel {
    constructor(sid, chan_title, chan_descrip, chan_log_on_only){
        this.sid = sid;
        this.chan_title = chan_title;
        this.chan_descrip = chan_descrip;
        this.chan_log_on_only = chan_log_on_only;
    }
}

//create Channel

async function createChannel(name){

    var sid = (await userMod.getUserByNickname(name)).objectSid

    const test = uuid.v4();

    var values = "(\"" + sid + "\", \"TITLE\", \"DESCIPTION\", \"" + test + "\", 0);"
    var q2 ="INSERT INTO app_livestream_channel VALUES "
    const [rows2, fields2] = await database.promisePool.query(q2 + values).catch(console.log());

}

async function getChannel(name){

    var sid = (await userMod.getUserByNickname(name)).objectSid

    var q2 ="SELECT chan_title, chan_descrip, chan_log_on_only FROM app_livestream_channel WHERE sid = \"" + sid + "\";"
    const [rows2, fields2] = await database.promisePool.query(q2);

    if(isEmpty(rows2)){

        ad.getUserById(sid)

        if(isEmpty(ad)){
            return false;
        } else {
            await createChannel(name)
            return (await getChannel(name))
        }

    } else {
        return chn = new Channel(sid,rows2.chan_title, rows2.chan_descrip ,rows2.chan_log_on_only)
    }

}

async function getStreamKey(name){

    var sid = (await userMod.getUserByNickname(name)).objectSid
    var q2 ="SELECT chan_key from app_livestream_channel WHERE sid = \""+ sid + "\";"
    const [rows2, fields2] = await database.promisePool.query(q2).catch(console.log());

    return rows2[0].chan_key
}

function isEmpty(obj) {
    return Object.keys(obj).length === 0;
  }


module.exports.getStreamKey = getStreamKey;
module.exports.getChannel = getChannel;
module.exports.createChannel = createChannel;