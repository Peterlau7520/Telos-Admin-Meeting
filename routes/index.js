const express = require('express');
const router = express.Router();

router.get('/app', (req, res) => {
  res.render('app', {layout: 'homepageLayout.hbs'});
});

router.get('/appchn', (req, res) => {
  res.render('appchn', {layout: 'homepageLayout.hbs'});
});

router.get('/about', (req, res) => {
  res.render('about', {layout: 'homepageLayout.hbs'});
});

router.get('/aboutchn', (req, res) => {
  res.render('aboutchn', {layout: 'homepageLayout.hbs'});
});

router.get('/404', (req, res) => {
  res.render('error', {layout: 'errorLayout.hbs'});
});

router.get('/privacy', (req, res) => {
  res.render('privacy', {layout: 'privacyLayout.hbs'});
});

router.get('/test', (req, res) => {
  res.render('contractor', {layout: 'privacyLayout.hbs'});
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

router.get('/', (req, res) => {
  res.render('appchn', {layout: 'homepageLayout.hbs'});
});
//sourcechn

router.get('/source', (req, res) => {
  res.render('source', {layout: 'homepageLayout.hbs'});
});

router.get('/contractor', (req, res) => {
  res.render('contractor', {layout: 'contractorLayout.hbs'});
});

router.get('/contractorchn', (req, res) => {
  res.render('contractorchn', {layout: 'contractorLayout.hbs'});
});

router.get('/contact', (req, res) => {
  res.render('contact', {layout: 'homepageLayout.hbs'});
});

router.get('/contactchn', (req, res) => {
  res.render('contactchn', {layout: 'homepageLayout.hbs'});
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
