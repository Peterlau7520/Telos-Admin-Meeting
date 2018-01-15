const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('homepage', {layout: 'homepageLayout.hbs'});
});

router.get('/homepagechn', (req, res) => {
  res.render('homepagechn', {layout: 'homepageLayout.hbs'});
});

router.get('/about', (req, res) => {
  res.render('about', {layout: 'homepageLayout.hbs'});
});

router.get('/aboutchn', (req, res) => {
  res.render('aboutchn', {layout: 'homepageLayout.hbs'});
});

/*router.get('/siteMap', (req, res) => {

router.get('/privacy', (req, res) => {
  res.render('privacy', {layout: 'privacyLayout.hbs'});
});

router.get('/privacychn', (req, res) => {
  res.render('privacychn', {layout: 'privacyLayout.hbs'});
});

router.get('/terms', (req, res) => {
  res.render('terms', {layout: 'termsLayout.hbs'});
});

router.get('/termschn', (req, res) => {
  res.render('termschn', {layout: 'termsLayout.hbs'});
});

router.get('/siteMap', (req, res) => {
  res.render('sitemap', {layout: 'sitemap.hbs'});
});

router.get('/sitemap.xml', (req, res) => {
  res.type('text/plain');
  res.render('sitemap', {layout: 'sitemap.xml'});
});

router.get('/robots.txt', function (req, res) {
    res.type('text/plain');
    //res.render('robots', {layout: 'robots.txt'})
    res.send("Sitemap: https://www.telos-technology.com/sitemap.xml" +
      "   User-agent: *" +
       "   Allow: /");
});

router.use(function (req, res, next) {
  if (!req.user) {
    res.redirect('/login');
  } else {
    next();
  }
});




module.exports = router;
