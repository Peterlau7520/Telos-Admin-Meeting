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
router.get('/allMeetings', (req, res) => {
    var meetings = [
        {
           title: "Meeting 1",
           titleChn: "",
           startTime: "2017-03-18T13:00",
           endTime: "2017-03-10T13:00",
           venue:"venue 1",
           polls: [{
               pollName: "Poll 1",
               pollNameChn: "",
               summary: "Summary 1",
               summaryChn: "",
               endTime: "",
               options: "",
               documents: "",
            },{
               pollName: "Poll 2",
               pollNameChn: "",
               summary: "Summary 2",
               summaryChn: "",
               endTime: "",
               options: "",
               documents: ""
            }]           
        },
        {
           title: "Meeting 2",
           titleChn: "",
           startTime: "2017-03-17T13:00",
           endTime: "2018-03-11T13:00",
           venue:"venue 2",
           polls: [{
               pollName: "Poll 1",
               pollNameChn: "",
               summary: "Summary 1",
               summaryChn: "",
               endTime: "",
               options: "",
               documents: ""
            }]           
        }
    ]
    res.render('meeting',{meetingsData:meetings});
    //check whether it's a past meeting or upcoming meeting. 
})

router.post('/addPollsOfMeeting', (req, res) => {
    var MeetingPollData = JSON.parse(req.body.pollsofmetting);
    console.log(MeetingPollData)
    ///save to databse logic//
    res.json({ meetingsPollData: MeetingPollData })
    // res.render('polls_of_meetings', { meetingsPollData: MeetingPollData });
})


// 1. Milestonre 1 completed
// 2. To-do: add polls into meeting. + organise files on S3
router.post('/editMeeting', (req, res) => {
    var data = JSON.parse(req.body.metting);
    console.log(data);
})

router.get('/addMeeting',(req,res) => {
    res.render('add_meeting');
})

router.post('/saveMeeting',(req,res) =>{
    var data = req.body;
    if(data.poll_json){
        data.poll_json = JSON.parse(data.poll_json);
        models.Poll.create({
        	projectName: data.poll_json[0].project_name,
        	projectNameChn: data.poll_json[0].project_name_chinese,
        	summary: data.poll_json[0].summary,
        	summaryChn: data.poll_json[0].summary_chinese,
        	options: data.poll_json[0].option,
        	endTime: data.poll_json[0].project_name,
        }, function (err, Poll){
        	if (err) return handleError(err);
        	insertMeeting(Poll.id, data);
        	res.redirect('/addMeeting');
        });
    } else {
    	insertMeeting(null, data);
    	res.redirect('/addMeeting');
    }
    

});
function insertMeeting(poll_id, data, res) {

	models.Meeting.create({
		title     : data.meeting_title,
		titleChn  : data.meeting_title_chinese,
		startTime : data.stat_time,
		endTime   : data.end_time,
		venue     : data.venue,
		polls	  : poll_id
	}, function (err, meeting) {
		if (err) return handleError(err);
		//res.json(small);
	});
} 

module.exports = router;



// router.post('/addMeeting', (req, res) => {
//     console.log('req.body', req.body);
//     var startDay = req.body.startTime.substring(0, req.body.startTime.indexOf('T'));
//     var startHour = req.body.startTime.substring(req.body.startTime.indexOf('T') + 1, req.body.startTime.indexOf('T') + 9);
//     var startFinal = startDay + " " + startHour;
//     var endDay = req.body.endTime.substring(0, req.body.endTime.indexOf('T'));
//     var endHour = req.body.endTime.substring(req.body.endTime.indexOf('T') + 1, req.body.endTime.indexOf('T') + 9);
//     var endFinal = endDay + " " + endHour;

//     var meeting = new Meeting({
//         title: req.body.title,
//         titleChn: req.body.titleChn,
//         startTime: startFinal,
//         endTime: endFinal,
//         //polls
//     });
//     meeting.save(function (err, meeting) {
//         Estate.findOne({
//             "estateName": req.user.estateName
//         }, function (err, estate) {
//             if (err) {
//                 res.redirect('/error');
//             }
//             if (!estate) {
//                 res.redirect('/error');
//             } else {
//                 estate.currentMeetings.push(meeting);
//                 estate.save();
//                 var files = req.files && req.files.filefield ? req.files.filefield : false;
//                 if (files && files[0].size != 0) {
//                     for (var i = 0; i < files.length; i++) {
//                         var info = files[i].data;
//                         var name = files[i].name;
//                         meeting.fileLinks.push(name);
//                         var data = {
//                             Key: `${req.user.estateName}/${req.body.title}/${name}`,
//                             Body: info,
//                             ContentType: 'application/pdf',
//                             ContentDisposition: 'inline'
//                         }; // req.user.estateName
//                         s3Bucket.putObject(data, function (err, data) {
//                             if (err) {
//                                 console.log('Error uploading data: ', err);
//                             } else {
//                                 console.log('succesfully uploaded the pdf!');
//                             }
//                         });
//                     }
//                     meeting.save();
//                 }

//                 res.redirect('/allMeetings');
//             }
//         });
//     })
// })
