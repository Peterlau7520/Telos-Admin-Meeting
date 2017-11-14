/**
 * This file serves routes for notices
 */
const express = require('express');
const router = express.Router();
const models = require('../models/models');
const Estate = models.Estate;
const Notice = models.Notice;
var Busboy = require('busboy');
const busboyBodyParser = require('busboy-body-parser');
const fs = require('fs');
router.use(busboyBodyParser({multi: true}));

// AWS.config.loadFromPath('./key.json');
var AWS = require('aws-sdk');
var s3 = new AWS.S3();
var s3Bucket = new AWS.S3({
    params: {
        Bucket: 'telospdf'
    },
    accessKeyId: process.env.S3_KEY,
    secretAccessKey: process.env.secretAccessKey
});
router.get('/allMeetings',(req,res)=>{

    res.render('meeting')
    //check whether it's a past meeting or upcoming meeting. 

})

// 1. Milestonre 1 completed
// 2. To-do: add polls into meeting. + organise files on S3
router.post('/addMeeting',(req,res)=>{
    console.log('req.body', req.body);
    var startDay = req.body.startTime.substring(0, req.body.startTime.indexOf('T'));
    var startHour = req.body.startTime.substring(req.body.startTime.indexOf('T') + 1, req.body.startTime.indexOf('T') + 9);
    var startFinal = startDay + " " + startHour;

    var endDay = req.body.endTime.substring(0, req.body.endTime.indexOf('T'));
    var endHour = req.body.endTime.substring(req.body.endTime.indexOf('T') + 1, req.body.endTime.indexOf('T') + 9);
    var endFinal = endDay + " " + endHour;


    var meeting = new Meeting({
        title: req.body.title,
        titleChn: req.body.titleChn,
        startTime:startFinal,
        endTime: endFinal,    
        //polls
    });
    meeting.save(function(err, meeting){
        Estate.findOne({
            "estateName": req.user.estateName
        }, function (err, estate) {
            if (err) {
                res.redirect('/error');
            }
            if (!estate) {
                res.redirect('/error');
            } else {
                estate.currentMeetings.push(meeting);
                estate.save();
                var files = req.files && req.files.filefield ? req.files.filefield : false;
                if (files && files[0].size != 0) {
                    for (var i = 0; i < files.length; i++) {
                        var info = files[i].data;
                        var name = files[i].name;
                        meeting.fileLinks.push(name);
                        var data = {
                            Key: `${req.user.estateName}/${req.body.title}/${name}`,
                            Body: info,
                            ContentType: 'application/pdf',
                            ContentDisposition: 'inline'
                        }; // req.user.estateName
                        s3Bucket.putObject(data, function (err, data) {
                            if (err) {
                                console.log('Error uploading data: ', err);
                            } else {
                                console.log('succesfully uploaded the pdf!');
                            }
                        });
                    }
                    meeting.save();
                }

                res.redirect('/allMeetings');
            }
        });
    })    
})

router.post('/editMeeting',(req,res)=>{
    

    
})
module.exports = router;