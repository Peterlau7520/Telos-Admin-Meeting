const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
var path = require('path');
const exphbs = require('express-handlebars');
var hbs = require('hbs');
const models = require('./models/models');
const noticeRoutes = require('./routes/notices');
const surveysRoutes = require('./routes/surveys');
const meetingsRoutes = require('./routes/meetings');
// middlewares

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

hbs.registerHelper('stringify', function (context) {
    return JSON.stringify(context);
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));


app.use('/', noticeRoutes);
app.use('/', meetingsRoutes);
app.use('/', surveysRoutes);


app.listen(process.env.PORT || 3000, function () {
    console.log('server successfully started');
})

  