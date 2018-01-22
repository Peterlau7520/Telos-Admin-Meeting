var express = require('express');
var router = express.Router();
var models = require('../models/models');
var Estate = models.Estate;

module.exports = function(passport) {
  // main login routes
  router.post('/register', (req, res) => {
    console.log(req.body, "dataaaaaaaa") 
    var PassCode = "telos-admin"
    if(req.body.passcode == PassCode){
        //console.log("matched")
        const checkEstate = req.body.estateName.split(" ").join("").trim();
    Estate.findOne({"estateName" : checkEstate}, function(err, estate){
      if(estate){
        res.render('login', {
          flash : "Account for this estate already exists",
          layout: 'loginLayout.hbs'
        });
      }
      else{
        const estateName = req.body.estateName.split(" ").join("");
        let estate = new Estate({
          username : req.body.username.trim(),
          password : req.body.password.trim(),
          estateName: estateName.trim(),
          estateNameDisplay: req.body.estateName,
          estateNameChn: req.body.estateNameChn,
          emailAddress: req.body.emailAddress.trim(),
          chairmanName: req.body.chairmanName.trim(),
        });
        estate.save( (err, estate) => {
          if(err)res.redirect('/error');
          res.redirect('/login');
        })
      }
    })
    }
    else{
        console.log("not matched")
        res.render('login', {
          title: 'Register in',
          flash: "Passcode Does Not Match",
          layout: 'loginLayout.hbs'
        });
    }
    
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
    successRedirect : '/allMeetings',
    failureRedirect : '/login',
    failureFlash : true
  }));


  router.get('/logout', (req,res) => {
    req.logout();
    res.redirect('/login');
  })

  return router;
}
