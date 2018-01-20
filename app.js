//----------------PACKAGES----------------
require('newrelic');
const express = require('express');
const app = express();

var path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const exphbs = require('express-handlebars');
var hbs = require('hbs');
const flash = require('connect-flash');
const http = require('http');
var server = require('http').createServer(app);
var socket = require('socket.io');
//----------------MODELS----------------
const models = require('./models/models');
//----------------ROUTES----------------
const forumRoutes = require('./routes/forum');
const meetingRoutes = require('./routes/meetings');
const surveyRoutes = require('./routes/surveys');
const noticeRoutes = require('./routes/notices');
const index = require('./routes/index');
const auth = require('./routes/auth');
const cronRoutes = require('./routes/cron');
const Estate = models.Estate;

//----------------MIDDLEWARES----------------
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
hbs.registerHelper('stringify', function (context) {
    return JSON.stringify(context);
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

//----------------AUTH----------------
const passport = require('passport');
const session = require('express-session');
const LocalStrategy = require('passport-local').Strategy
app.use(session({ secret: 'telos production' }));
passport.serializeUser(function(user, done) {
  done(null, user._id);
});

passport.deserializeUser(function(id, done) {
  Estate.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new LocalStrategy(
  function(username, password, done) {
    // Find the user with the given username
    Estate.findOne({ 'username': username }, function (err, estate) {
      // if there's an error, finish trying to authenticate (auth failed)
      if (err) {
        console.error(err);
        return done(err);
      }
      // if no user present, auth failed
      if (!estate) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      // if passwords do not match, auth failed
      if (estate.password !== password) {
        return done(null, false, { message: 'Incorrect password.' });
      }
      // auth has has succeeded
      return done(null, estate);
    });
  }
));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());



//----------------ROUTING----------------
app.use('/', auth(passport));
app.use('/', index);
app.use('/', meetingRoutes);
app.use('/', noticeRoutes);
app.use('/', surveyRoutes);
app.use('/', forumRoutes);
app.use('/', cronRoutes);
//----------------ERRORS----------------
app.use(function(err, req, res, next) {
    //console.log(typeof req.render);
    // set locals, only providing error in development
    //res.locals.message = err.message;
    //res.locals.error = req.app.get('env') === 'development' ? err : {};
  
    // render the error page
    //res.status(500).send('Something broke!')
    if(err){
      console.log(err, "err")
    res.render('error', {layout: 'errorLayout.hbs'});
  }
  });
  

//----------------START----------------
var server = app.listen(process.env.PORT || 4000, function () {
  console.log('server successfully started on Port 4000');
})
var io = socket("https://13.250.121.116:443");
app.io = io;


  