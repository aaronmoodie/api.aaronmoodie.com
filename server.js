var express = require('express'),
  request = require('request'),
  BufferList = require('bufferlist').BufferList,
  Q = require('q'),
  http = require('http'),
  sys = require('sys'),
  lastfm = require('./lastfm.js').params;

var port = process.env.PORT || 5000;

var lastfmURL = "http://ws.audioscrobbler.com/2.0/?method=user.gettopalbums" + 
  "&user="    + lastfm.user + 
  "&api_key=" + lastfm.api_key +
  "&format="  + lastfm.format +
  "&period="  + lastfm.period + 
  "&limit="   + lastfm.limit;
 
var app = express(express.logger(), express.bodyParser());

// take image url
// return base64 image
var urlToBase64 = function(url) {
  var deferred = Q.defer();
  request({
    uri: url,
    encoding: 'binary'
  }, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var data_uri_prefix = "data:" + response.headers["content-type"] + ";base64,";
      var image = new Buffer(body.toString(), "binary").toString("base64");
      deferred.resolve(data_uri_prefix + image);
    }
  });
  return deferred.promise;
};

// take array of objects with img url 
// return array of base64 images
var convertImages = function(albums) {
  var results = [];
  for (var i = 0, l = albums.length; i < l; i++) {
    results.push(urlToBase64(albums[i].albumImage));
  }
  return results;
};

// take raw last.fm JSON
// return formatted JSON
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
};

// take url with params
// return JSON
var getJSON = function(url, parser) {
  var deferred = Q.defer();
  request({
    uri: url,
    encoding: 'binary'
  }, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      deferred.resolve(parser(body));
    }
  });
  return deferred.promise;
};



app.get("/", function(req, res) {
  if (req.param("url")) {
    urlToBase64(req.param("url")).
    then(function(image){
      return res.send("<img src=\"" + image + "\"/>");
    });
  } else {
    return res.send(":)");
  }
});

app.get("/lastfm/gettopalbums", function(req, res) {
  var albums;
  getJSON(lastfmURL, parseJSON).
  then(function(albums) {
    Q.allSettled(convertImages(albums))
    .then(function(results) {
      for (var i = 0, l = results.length; i < l; i++) {
        albums[i].albumImage = results[i].value;
      }
      // Render the final output
      res.send(albums);
    });
  })
});

app.listen(port, function() {
  console.log("Listening on " + port);
});
