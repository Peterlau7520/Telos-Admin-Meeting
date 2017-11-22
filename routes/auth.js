var express = require('express');
var router = express.Router();
var models = require('../models/models');
var Estate = models.Estate;

module.exports = function(passport) {

  // main login routes


  router.post('/register', (req, res) => {
    Estate.findOne({"estateName" : req.body.estateName.trim()}, function(err, estate){
      if(estate){
        res.render('login', {
          flash : "account for this estate already exists",
          layout: 'loginLayout.hbs'
        });
      }
      else{
        let estate = new Estate({
          username : req.body.username.trim(),
          password : req.body.password.trim(),
          estateName: req.body.estateName,
          emailAddress: req.body.emailAddress.trim(),
          chairmanName: req.body.chairmanName.trim(),
        });
        estate.save( (err, estate) => {
          if(err)res.redirect('/error');
          res.redirect('/login');
        })
      }
    })
  })

  router.get('/login', (req,res) => {
    var mess = req.flash('error');
    res.render('login', {
      title: 'Log in',
      flash: mess,
      layout: 'loginLayout.hbs'
    });
  })


  router.post('/login', passport.authenticate('local', {
    successRedirect : '/noticeBoard',
    failureRedirect : '/login',
    failureFlash : true
  }));


  router.get('/logout', (req,res) => {
    req.logout();
    res.redirect('/login');
  })

  return router;
}
