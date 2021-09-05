// server.js
// where your node app starts

// init project
require('dotenv').config();
var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
// var bodyParser = require('body-parser');
const dns = require('dns');
var shortid = require('shortid');

var app = express();
const urlParser = require('url');
var port = process.env.PORT || 3000;

var database_uri = "mongodb+srv://nipuna:nipuna@cluster0.0dte1.mongodb.net/Cluster0?retryWrites=true&w=majority";
// mongoose.connect(process.env.DB_URI);
mongoose.connect(database_uri);

// enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
// so that your API is remotely testable by FCC 
var cors = require('cors');
const { response } = require('express');
app.use(cors({optionsSuccessStatus: 200}));  // some legacy browsers choke on 204

// http://expressjs.com/en/starter/static-files.html
// app.use(express.static('public'));
app.use('/public', express.static(`${process.cwd()}/public`));

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

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

app.get("/exerciseTracker", function (req, res) {
  res.sendFile(__dirname + '/views/exercise.html');
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

app.post("/api/shorturl", (req, res) => {
  let client_requested_url = req.body.url
  let suffix = shortid.generate();

  const something = dns.lookup(urlParser.parse(client_requested_url).hostname, (err, address)=>{
    if(!address){
      res.json({error: "Invalid URL"})
    }else{
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
    }
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

//Exercise Tracker
const exerciseSchema = new mongoose.Schema({description: {type:String, required:true}, duration: {type: Number, required: true},  date: { type: Date, default: Date.now}});
const Exercise = mongoose.model("Exercise", exerciseSchema)

const userSchema = new mongoose.Schema({username: {type:String, unique: true}, log: [exerciseSchema]});
const User = mongoose.model('Person', userSchema);


app.post("/api/users", (req, res, next) =>{
  const { username } = req.body;
  User.findOne({ username }).then(user => {
      if (user) throw new Error('username already taken');
      return User.create({ username })
  })
      .then(user => res.status(200).send({
          username: user.username,
          _id: user._id
      }))
      .catch(err => {
          console.log(err);
          res.status(500).send(err.message);
      })
});

app.get('/api/users', (req,res) => {
  User.find({}, (error, arrayOfUsers) => {
    if(!error){
      res.json(arrayOfUsers)
    }else{
      res.json({"error": error})
    }
  })
})


app.post("/api/users/:_id/exercises", (req, res, next) => {
  let { userId, description, duration, date } = req.body;
  User.findOne({ _id: userId }).then(user => {
      if (!user) throw new Error('Unknown user with _id');
      date = date || Date.now();
      return Exercise.create({
          description, duration, date, userId
      })
          .then(ex => res.status(200).send({
              username: user.username,
              description, duration,
              _id: user._id,
              date: moment(ex.date).format('ddd MMMM DD YYYY')
          }))
  })
      .catch(err => {
          console.log(err);
          res.status(500).send(err.message);
      })
})

app.get("/api/users/:_id/logs", (req, res, next)=>{
  let { userId, from, to, limit } = req.query;
  from = moment(from, 'YYYY-MM-DD').isValid() ? moment(from, 'YYYY-MM-DD') : 0;
  to = moment(to, 'YYYY-MM-DD').isValid() ? moment(to, 'YYYY-MM-DD') : moment().add(1000000000000);
  User.findById(userId).then(user => {
      if (!user) throw new Error('Unknown user with _id');
      Exercise.find({ userId })
          .where('date').gte(from).lte(to)
          .limit(+limit).exec()
          .then(log => res.status(200).send({
              _id: userId,
              username: user.username,
              count: log.length,
              log: log.map(o => ({
                  description: o.description,
                  duration: o.duration,
                  date: moment(o).format('ddd MMMM DD YYYY')
              }))
          }))
  })
      .catch(err => {
          console.log(err);
          res.status(500).send(err.message);
      })
})


// listen for requests :)
var listener = app.listen(port, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
