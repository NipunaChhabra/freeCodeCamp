// server.js
// where your node app starts

// init project
require('dotenv').config();
var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
// var bodyParser = require('body-parser');
var shortid = require('shortid');
var app = express();
var port = process.env.PORT || 3000;

// var database_uri = "mongodb+srv://nipuna:nipuna@cluster0.0dte1.mongodb.net/Cluster0?retryWrites=true&w=majority";
mongoose.connect(process.env.DB_URI);
// mongoose.connect(database_uri);

// enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
// so that your API is remotely testable by FCC 
var cors = require('cors');
app.use(cors({optionsSuccessStatus: 200}));  // some legacy browsers choke on 204

// http://expressjs.com/en/starter/static-files.html
// app.use(express.static('public'));
app.use('/public', express.static(`${process.cwd()}/public`));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (req, res) {
  res.sendFile(__dirname + '/views/index.html');
});

app.get("/timestamp", function (req, res) {
  res.sendFile(__dirname + '/views/timestamp.html');
});

app.get("/requestHeaderParser", function (req, res) {
  res.sendFile(__dirname + '/views/requestHeaderParser.html');
});

app.get("/urlShortener", function (req, res) {
  res.sendFile(__dirname + '/views/urlShortener.html');
});

// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
  console.log({greeting: 'hello API'});
});

app.get("/api/timestamp", function(req, res){
    var now = new Date();
    res.json({
      "unix":now.getTime(),
      "utc": now.toUTCString()
    });
});

app.get("/api/timestamp/:date_string", function(req, res){
  let dateString = req.params.date_string;

  if(parseInt(dateString)>10000){
    let unixTime = new Date(parseInt(dateString));
    res.json({
      "unix": unixTime.getTime(),
      "utc": unixTime.toUTCString()
    });
  }

  let passedInValue = new Date(dateString);

  if(passedInValue == "Invalid Date"){
    res.json({"error": "Invalid Date"});
  }else{
    res.json({
      "unix": passedInValue.getTime(),
      "utc":passedInValue.toUTCString()
    });
  }
  
});

app.get("/api/whoami", function(req, res){
  res.json({
    // "value" : Object.keys(req),
    "ipaddress" : req.ip,
    "language" : req.headers["accept-language"],
    "software" : req.headers["user-agent"],
  });
});

var urlModel = mongoose.model('urlModel', new mongoose.Schema({
  short_url: String,
  original_url: String,
  suffix: String
}));

app.use(express.urlencoded({ extended: false}))
app.use(express.json())

app.post("/api/shorturl", function(req, res){
  let client_requested_url = req.body.url
  let suffix = shortid.generate();

  let newURL = new urlModel({
    short_url: __dirname + "/api/shorturl/" + suffix,
    original_url: client_requested_url,
    suffix: suffix
  })
  newURL.save(function(err, doc) {
    if(err) return console.error(err);
    console.log("Document uploaded");
    res.json({
      // "saved" : true,
      // "short_url" : newURL.short_url,
      "original_url": newURL.original_url,
      "short_url": newURL.suffix
    });
  });
});

app.get("/api/shorturl/:suffix", (req, res) => {
  let userGenSuffix = req.params.suffix;
  urlModel.find({suffix:userGenSuffix})
  .then(foundUrls => {
      let urlForRedirect = foundUrls[0];
      res.redirect(urlForRedirect.original_url);
  });
});


// listen for requests :)
var listener = app.listen(port, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
