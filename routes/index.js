const express = require('express');
const router = express.Router();

// router.get('/', (req, res) => {
//   res.render('homepage', {layout: 'homepageLayout.hbs'});
// });

// router.get('/homepagechn', (req, res) => {
//   res.render('homepagechn', {layout: 'homepageLayout.hbs'});
// });

// router.get('/about', (req, res) => {
//   res.render('about', {layout: 'homepageLayout.hbs'});
// });

// router.get('/aboutchn', (req, res) => {
//   res.render('aboutchn', {layout: 'homepageLayout.hbs'});
// });

router.use(function (req, res, next) {
  if (!req.user) {
    res.redirect('/login');
  } else {
    next();
  }
});




module.exports = router;