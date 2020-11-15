var express = require('express');
var router = express.Router();


router.get('/', function(req, res) {
  res.send('placeholder');
});


module.exports = router;




/*
  var stream_key = getStreamKeyFromStreamPath(StreamPath);
  var test = await database.privateSK2publicSK(stream_key)

  if(test){
    console.log("JAJAJAJAJA" + test.publicstreamkey)
  } else {
      let session = nms.getSession(id);
       session.reject();
  }


const getStreamKeyFromStreamPath = (path) => {
  let parts = path.split('/');
  return parts[parts.length - 1];
};
*/

