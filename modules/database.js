
var mysql = require('mysql2');
var ad = require('./ad')
const uuid = require('uuid');
var mysql = require('mysql2');
var userMod = require("./user");
const fs = require('fs')



function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

class User {
    constructor(nickname, cn, givenName, sn, mail, objectSid){
        this.nickname = nickname;
        this.cn = cn;
        this.givenName = givenName;
        this.sn = sn;
        this.mail = mail;
        this.objectSid = objectSid;
    }
}

const pool  = mysql.createPool({
    connectionLimit : 10,
    host            : process.env.DB_HOST,
    user            : process.env.DB_USER,
    password        : process.env.DB_PW,
    database        : process.env.DB_NAME
  });

const promisePool = pool.promise();

async function getActivModules(){

    var q2 =" SELECT app_name FROM quartz_apps WHERE app_activ = 1;"
    const [rows2, fields2] = await promisePool.query(q2).catch(console.log("ERROR getAcitvModules"));

    if(isEmpty(rows2)){
        return null;
    } else {
        return rows2
    }
}

async function activeModule(name){

    var q = "UPDATE quartz_apps Set app_activ WHERE app_name=\""+ name+"\";"
    const [rows2, fields2] = await promisePool.query(q).catch(console.log("Error activeModules"));
}

async function addModule(name, status, admin_group){

    var q = "INSERT INTO quartz_apps VALUES (\""+name+"\"," +status + ", \""+admin_group+"\");"
    const [rows2, fields2] = await promisePool.query(q).catch(console.log("add Module"));

}
   
async function getUser(sid) {
    
    var q1 = "SELECT * FROM quartz_user WHERE sid = "+ "\""+ sid + "\";"
     return await promisePool.query(q1).then ( async ([result, fields]) => {

        if(isEmpty(result)){
            var aduser = ad.getUserById(sid);

            if(aduser){
                
                await createUser(sid)
                return await getUser(sid)
                
            } else {
                return null
             }
        } else {
            //user in app gefunden
            var aduser = (await ad.getUserById(sid))[0];
            user = new User(aduser.sAMAccountName, aduser.cn, aduser.givenName, aduser.sn, aduser.mail, aduser.objectSid);
            return user;
        }
        
    })
    .catch(console.log);
    
}

async function createUser(sid) {

    var values1 = "(\"" + sid + "\");";
    var q1 = "INSERT INTO quartz_user (sid) VALUES "
    await promisePool.query(q1  + values1);

    return true;
  }

  async function createChannel(name){

    var sid = (await userMod.getUserByNickname(name)).objectSid

    const test = uuid.v4();
     fs.mkdir(__dirname +"/media/live/"+test+ "/", (err)=>{
         
     })

    var values = "(\"" + sid + "\", \"TITLE\", \"DESCIPTION\", \"" + test + "\", 0, 1,1,1);"
    var q2 ="INSERT INTO app_livestream_channel VALUES "
    const [rows2, fields2] = await promisePool.query(q2 + values);



}

async function renewStreamKey(name){
    
    const newUUID = uuid.v4();

    var sid = (await userMod.getUserByNickname(name)).objectSid
    var values = "chan_key=\""+newUUID+ "\""
    var q = "UPDATE app_livestream_channel SET " + values + " WHERE sid=\""+sid + "\";"

    await promisePool.query(q);

}

async function updateChannel(name, title, descrip, onlyUser, chat){

    var sid = (await userMod.getUserByNickname(name)).objectSid
    var values = "chan_title=\""+title+ "\", chan_descrip=\""+descrip+"\" ,chan_log_on_only=\""+ onlyUser + "\", chan_chat="+ chat
    var q = "UPDATE app_livestream_channel SET " + values + " WHERE sid=\""+sid + "\";"

    await promisePool.query(q);
}

async function updateThumbnails(name, offline, online){

    var sid = (await userMod.getUserByNickname(name)).objectSid
    var values = "chan_thumb_online="+ online + ", chan_thumb_offline=" +offline
    var q = "UPDATE app_livestream_channel SET " + values + " WHERE sid=\""+sid + "\";"

    await promisePool.query(q);
}

async function getChannel(name){

    var sid = (await userMod.getUserByNickname(name)).objectSid

    var q2 ="SELECT chan_title, chan_descrip, chan_log_on_only, chan_thumb_offline, chan_thumb_online, chan_chat FROM app_livestream_channel WHERE sid = \"" + sid + "\";"
    const [rows2, fields2] = await promisePool.query(q2);

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
    const [rows2, fields2] = await promisePool.query(q2);

    return rows2[0].chan_key
}

  function isEmpty(obj) {
    return Object.keys(obj).length === 0;
  }

  module.exports.getUser = getUser;
  module.exports.createUser = createUser;
  module.exports.getActivModules = getActivModules;
  module.exports.addModule = addModule;
  module.exports.renewStreamKey = renewStreamKey;
  module.exports.createChannel = createChannel;
  module.exports.updateChannel = updateChannel;
  module.exports.updateThumbnails = updateThumbnails;
  module.exports.getChannel = getChannel;
  module.exports.getStreamKey = getStreamKey;
