var mysql = require('mysql2');
var ad = require('../ad');
var database = require('../database');
var userMod = require("../user");
var ad = require('../ad')

const uuid = require('uuid');


async function createChannel(name){

    var sid = (await userMod.getUserByNickname(name)).objectSid

    const test = uuid.v4();

    var values = "(\"" + sid + "\", \"TITLE\", \"DESCIPTION\", \"" + test + "\", 0);"
    var q2 ="INSERT INTO app_livestream_channel VALUES "
    const [rows2, fields2] = await database.promisePool.query(q2 + values);

}

async function renewStreamKey(name){
    
    const newUUID = uuid.v4();

    var sid = (await userMod.getUserByNickname(name)).objectSid
    var values = "chan_key=\""+newUUID+ "\""
    var q = "UPDATE app_livestream_channel SET " + values + " WHERE sid=\""+sid + "\";"

    await database.promisePool.query(q);

}

async function updateChannel(name, title, descrip, onlyUser){

    var sid = (await userMod.getUserByNickname(name)).objectSid
    var values = "chan_title=\""+title+ "\", chan_descrip=\""+descrip+"\" ,chan_log_on_only=\""+ onlyUser + "\" "
    var q = "UPDATE app_livestream_channel SET " + values + " WHERE sid=\""+sid + "\";"

    await database.promisePool.query(q);
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
        return rows2
    }

}

async function getStreamKey(name){

    var sid = (await userMod.getUserByNickname(name)).objectSid
    var q2 ="SELECT chan_key from app_livestream_channel WHERE sid = \""+ sid + "\";"
    const [rows2, fields2] = await database.promisePool.query(q2);

    return rows2[0].chan_key
}

function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}


module.exports.getStreamKey = getStreamKey;
module.exports.getChannel = getChannel;
module.exports.createChannel = createChannel;
module.exports.updateChannel = updateChannel;
module.exports.renewStreamKey = renewStreamKey;
