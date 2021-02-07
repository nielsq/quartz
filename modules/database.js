
var mysql = require('mysql2');
var ad = require('./ad')
const uuid = require('uuid');
var mysql = require('mysql2');
const fs = require('fs')

class User {
    constructor(id, nickname, mail, firstName, lastName, displayName){
        this.id = id;
        this.nickname = nickname;
        this.mail = mail;
        this.firstName = firstName; //quanz, niels
        this.lastName = lastName; //niels
        this.displayName = displayName; //quanz
    }
}

class Channel {
    constructor(id, title, description, user_only, thumb_online, thumb_offline, chat, feedback, users, skey){
        this.id = id
        this.title = title;
        this.description = description;
        this.user_only = user_only;
        this.thumb_online = thumb_online;
        this.thumb_offline = thumb_offline;
        this.chat = chat;
        this.feedback = feedback;
        this.users = users;
        this.skey = skey;
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

   
async function getUser(id) {
    
    var q1 = "SELECT * FROM quartz_user WHERE id = "+ "\""+ id + "\";"
     return await promisePool.query(q1).then ( async ([result, fields]) => {

        if(isEmpty(result)){
            var aduser = await ad.getUserById(id);
            if(aduser.nickname){
                
                await createUser(aduser.id, aduser.nickname ,aduser.mail, aduser.firstName, aduser.lastName, aduser.displayName)
                return await getUser(id)
                
            } else {
                return null
             }
        } else {
            //user in app gefunden
            var user = new User(result[0].id, result[0].nickname , result[0].mail, result[0].firstName, result[0].lastName, result[0].displayName);
            return user;
        }
        
    })
    .catch(console.log);
    
}

async function getUserByNickname(nickname) {
    
    var q1 = "SELECT * FROM quartz_user WHERE nickname = "+ "\""+ nickname + "\";"
    return await promisePool.query(q1).then ( async ([result, fields]) => {

        if(isEmpty(result)){

            var aduser = await ad.getUserByUname(nickname);

            if(aduser){
                
                await createUser(aduser.id, aduser.nickname ,aduser.mail, aduser.firstName, aduser.lastName, aduser.displayName)
                return await getUser(aduser.id)
                
            } else {
                return null
             }

        } else {
            
            var user = new User(result[0].id, result[0].nickname , result[0].mail, result[0].firstName, result[0].lastName, result[0].displayName);
            return user;
        }
        
    })
    .catch(console.log);
    
}

async function createUser(id, nickname, mail, firstName, lastName, displayName) {

    var values1 = "(\"" + id + "\", \"" + nickname + "\" , \"" + mail + "\", \"" + firstName + "\", \"" + lastName + "\", \"" + displayName + "\");";
    var q1 = "INSERT INTO quartz_user VALUES "
    
    await promisePool.query(q1  + values1);
    await createChannel(id)
    return true;
}

async function createChannel(id){

    const key = uuid.v4();
     fs.mkdir(__dirname +"/media/live/"+key+ "/", (err)=>{
         
     })

    var values = "(\"" + id + "\", \"TITLE\", \"DESCIPTION\", \"" + key + "\", 0, 1,1,1,1,1);"
    var q2 ="INSERT INTO quartz_channel VALUES "
    const [rows2, fields2] = await promisePool.query(q2 + values);

}

async function renewStreamKey(id){
    
    const newUUID = uuid.v4();

    var values = "skey=\""+newUUID+ "\""
    var q = "UPDATE quartz_channel SET " + values + " WHERE id=\""+id + "\";"
    console.log(q)
    await promisePool.query(q);

}

async function updateChannel(id, title, descrip, only_user, chat, feedback, users){

    var values = "title=\""+title+ "\", description=\""+descrip+"\" , user_only="+ only_user + ", chat="+ chat + ", feedback="+ feedback + ", users=\""+ users + "\""
    var q = "UPDATE quartz_channel SET " + values + " WHERE id=\""+id + "\";"

    await promisePool.query(q);
}

async function updateThumbnails(id, offline, online){


    var values = "thumb_online="+ online + ", thumb_offline=" +offline
    var q = "UPDATE quartz_channel SET " + values + " WHERE id=\""+id + "\";"

    await promisePool.query(q);
}

async function getChannel(id){

    var q2 ="SELECT * FROM quartz_channel WHERE id = \"" + id + "\";"
    const [rows2, fields2] = await promisePool.query(q2);

    if(isEmpty(rows2)){

        console.log(id)
        var user = await  ad.getUserById(id)

        if(isEmpty(user)){
            return false;
        } else {
            await createUser(user.id,user.nickname,user.mail, user.firstName, user.lastName, user.displayName)
            return (await getChannel(id))
        }

    } else {
        var channel = new Channel(rows2[0].id, rows2[0].title, rows2[0].description, rows2[0].user_only,
            rows2[0].thumb_online, rows2[0].thumb_online, rows2[0].chat, rows2[0].feedback, rows2[0].users, rows2[0].skey)
        return channel
    }

}

async function getChannelByName(name){

    var q2 ="SELECT quartz_channel.id ,title, description, user_only, thumb_offline, thumb_online, chat, skey, feedback, users FROM quartz_channel JOIN quartz_user ON quartz_user.id=quartz_channel.id WHERE quartz_user.nickname = \"" + name + "\";"
    const [rows2, fields2] = await promisePool.query(q2);
    if(isEmpty(rows2)){

        var user = await  ad.getUserByUname(name)

        if(isEmpty(user.nickname)){
            return false;
        } else {
            await createUser(user.id,user.nickname,user.mail, user.firstName, user.lastName, user.displayName)
            return (await getChannelByName(name))
        }

    } else {
        var channel = new Channel(rows2[0].id, rows2[0].title, rows2[0].description, rows2[0].user_only,
            rows2[0].thumb_online, rows2[0].thumb_online, rows2[0].chat, rows2[0].feedback, rows2[0].users, rows2[0].skey)
        return channel
    }

}

async function getChannelBySKey(skey){

    var q2 ="SELECT * FROM quartz_channel WHERE skey=\"" + skey + "\";"
    const [rows2, fields2] = await promisePool.query(q2);


    var channel = new Channel(rows2[0].id, rows2[0].title, rows2[0].description, rows2[0].user_only,
        rows2[0].thumb_online, rows2[0].thumb_online, rows2[0].chat, rows2[0].feedback, rows2[0].users, rows2[0].skey)


    return channel


}

async function getStreamKey(id){

    var q2 ="SELECT * from quartz_channel WHERE id = \""+  id + "\";"
    const [rows2, fields2] = await promisePool.query(q2);

    if(rows2[0]){
        return rows2[0].skey
    } else {
        return null
    }
    
}

function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

  module.exports.getUser = getUser;
  module.exports.createUser = createUser;
  module.exports.renewStreamKey = renewStreamKey;
  module.exports.createChannel = createChannel;
  module.exports.updateChannel = updateChannel;
  module.exports.updateThumbnails = updateThumbnails;
  module.exports.getChannel = getChannel;
  module.exports.getStreamKey = getStreamKey;
  module.exports.getChannelBySKey = getChannelBySKey;
  module.exports.getUserByNickname = getUserByNickname;
  module.exports.getChannelByName = getChannelByName;
