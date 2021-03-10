var ActiveDirectory2 = require('activedirectory2');

var config = {
    url: process.env.DOMAIN_LDAP_URL,
    baseDN: process.env.DOMAIN_BASEDN,
    username: process.env.DOMAIN_LDAP_USER + process.env.DOMAIN,
    password: process.env.DOMAIN_LDAP_PASSWORD,
    attributes: {
      user: [ 'sAMAccountName', 'cn', 'givenName' , 'sn', 'mail', 'objectSid' ]
    }
  }

  class User {
    constructor(id, nickname, mail, firstName, lastName, displayName){
        this.id = id;
        this.nickname = nickname;
        this.mail = mail;
        this.firstName = firstName;
        this.lastName = lastName;
        this.displayName = displayName;
    }
}

  exports.authUser = async function(username, password){
    var ad = new ActiveDirectory2(config);
  
    return new Promise((resolve, reject) =>{
      ad.authenticate(username, password, function(err, auth) {
        if (err) {
          console.log(err);
          resolve(false)
        }
        
        if (auth) {
          console.log('Authenticated!');
          resolve(true)
        }
        else {
          resolve(false)
        }
      });
  
    }); 
  }

  exports.getUserById = async function (id){
    var ad = new ActiveDirectory2(config);
    var query = 'objectSid=' + id
  
    return new Promise((resolve, reject) =>{
      ad.find(query, function(err, user) {
        if (err) {
          resolve(new User())
        }
          
        if (! user){
          resolve(new User());
        } else {

          var userobj = new User(user.users.objectSid, user.users.sAMAccountName, user.users.mail, user.users.givenName, user.users.sn, user.users.cn)
          resolve(userobj);
        }
      });
    }); 
  }

  exports.getUserByUname = async function (username){ 
    var ad = new ActiveDirectory2(config);
    
    return new Promise((resolve, reject) =>{
      ad.findUser(username, function(err, user) {
        if (err) {
          resolve(new User())
        }
          
        if (! user){
          resolve(new User());
        } else {
          var userobj = new User(user.objectSid, user.sAMAccountName, user.mail, user.givenName, user.sn, user.cn)
          resolve(userobj);
        }
      });
    }); 
          
  }


