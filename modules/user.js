var database = require('./database');
var ad = require('./ad')
var stringify = require('stringify')


exports.getUserBySID = async function (objectSid) {

    var user = await database.getUser(objectSid)
    return user
}


exports.getUserByNickname = async function (nickname) {

    var tmp = await ad.getUserByUname(nickname)
    if(tmp){
        var user = await database.getUser(tmp.objectSid)
        return user
    } else {
        return null
    }
    
}
