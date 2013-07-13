var express = require('express'),
  request = require('request'),
  BufferList = require('bufferlist').BufferList,
  sys = require('sys'),
  Q = require('q');

var lastfm = {
  "api_key":"02959597ad6f8c9cded40346193df3c3",
  "user":"aaronmoodie",
  "format":"json",
  "period":"7day",
  "limit":10
};

var lastfmURL = "http://ws.audioscrobbler.com/2.0/?method=user.gettopalbums" + 
  "&user="    + lastfm.user + 
  "&api_key=" + lastfm.api_key +
  "&format="  + lastfm.format +
  "&period="  + lastfm.period + 
  "&limit="   + lastfm.limit;
 
var app = express(express.logger(), express.bodyParser());


var to64 = function(url) {
  var deferred = Q.defer();
  return request({
    uri: url,
    encoding: 'binary'
  }, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var data_uri_prefix = "data:" + response.headers["content-type"] + ";base64,";
      var image = new Buffer(body.toString(), "binary").toString("base64");
      image = data_uri_prefix + image;
      deferred.resolve(image);
      return deferred.promise;
    }
  });
}

var parseJSON = function(data) {
  var json = JSON.parse(data),
    albums = [],
    len = json.topalbums.album.length;

  var album, new_album;
  for (var i = 0; i < len; i++) {
    album = json.topalbums.album[i];
    new_album = {
      albumArtistName: album.artist.name,
      albumArtistURL: album.artist.url,
      albumName: album.name,
      albumImage: album.image[3]["#text"]
    };

    albums.push(new_album);
  }

  return albums;
}

app.get("/", function(req, res) {
  if (req.param("url")) {
    var image = to64(req.param("url"));
    return res.send("<img src=\"" + image + "\"/>");
  } else {
    return res.send(":)");
  }
});

app.get("/json", function(req, res) {
  return request({
    uri: lastfmURL,
    encoding: 'binary'
  }, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var albums,
        promises = [];

      albums = parseJSON(body);

      // for (var i = 0; i < albums.length; i++) {
      //   promise = to64(albums[i].albumImage, i);
      //   promise.then(function(data) {
      //       albums[data.index].albumImage = data.image;
      //   });
      //   promises.push(promise);
      // }
      // Q.all(promises).then(res.send(albums));


      Q.all([
          to64(albums[0].albumImage)
      ]).then(function(data) {
          res.send(data);
      });


      // to64(albums[0].albumImage, 0).then(function(result) {
      //     console.log(result);
      // });

    }
  });
});

app.listen(3333);