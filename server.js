var express = require('express'),
  request = require('request'),
  BufferList = require('bufferlist').BufferList,
  Q = require('q'),
  http = require('http'),
  sys = require('sys');

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

var httpGet = function (opts) {
  var deferred = Q.defer();
  http.get(opts, deferred.resolve);
  return deferred.promise;
};

var loadBody = function (res) {
  var deferred = Q.defer();
  var body = "";
  res.on("data", function (chunk) {
    body += chunk;
  });
  res.on("end", function () {
    deferred.resolve(body);
  });
  return deferred.promise;
};

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
}

var collectBase64Promises = function(albums) {
  var arr = [];
  for (var i = 0, l = albums.length; i < l; i++) {
    arr.push(urlToBase64(albums[i].albumImage));
  }
  return arr;
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
  var albums;
  httpGet(lastfmURL).then(loadBody)
  .then(function(body) {
    albums = parseJSON(body);
    Q.allSettled(collectBase64Promises(albums))
    .then(function(results) {
      for (var i = 0, l = results.length; i < l; i++) {
        albums[i].albumImage = results[i].value;
      }
      // Render the final output
      res.send(albums);
    });
  });
});

app.listen(3333);
