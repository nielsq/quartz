
var mysql = require('mysql2');
var ad = require('./ad')
const uuid = require('uuid');



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
    const [rows1, fields1] = await promisePool.query(q1  + values1).catch(console.log("ERROR CREATE USER"));

    return true;
  }

  function isEmpty(obj) {
    return Object.keys(obj).length === 0;
  }

  module.exports.getUser = getUser;
  module.exports.createUser = createUser;
  module.exports.getActivModules = getActivModules;
  module.exports.addModule = addModule;
  module.exports.promisePool = promisePool;
