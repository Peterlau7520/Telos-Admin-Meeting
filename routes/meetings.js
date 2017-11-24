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

let currDate = new Date(); 
let currentDate = currDate.getFullYear()+"-"+(currDate.getMonth()+1)+"-"+currDate.getDate()+" "+currDate.getHours()+":"+currDate.getMinutes()+":"+currDate.getSeconds();


router.get('/allMeetings', (req, res) => {
	//get data from meeting schema
	models.Meeting.find(function (err, meeting) {
        if (err) { res.send(err); }
        var myArray = new Array();
        if(meeting.length > 0) {
        	//get data from poll schema
        	meeting.forEach(function(item) {
        		if(item.polls != null) {
        			models.Poll.findById(item.polls[0],function(err,poll){
        				if(err) return next(err);
        				myArray.push({
        					id  		: item.id,
        					title 		: item.title,
        					titleChn 	: item.titleChn,
        					startTime 	: item.startTime,
        					endTime 	: item.endTime,
        					venue 		: item.venue,
        					created_at  : item.created_at,
        					polls 		: [{
        						pollId 		: poll._id,
        						pollName  	: poll.projectName,
        						pollNameChn : poll.projectNameChn,
        						summary 	: poll.summary,
        						summaryChn 	: poll.summaryChn,
        						endTime 	: poll.endTime,
        						options 	: poll.options
        					}]  
        				});
        			});
        		} else {
        			myArray.push({
        				id  		: item.id,
        				title 		: item.title,
        				titleChn 	: item.titleChn,
        				startTime 	: item.startTime,
        				endTime 	: item.endTime,
        				venue 		: item.venue,
        				created_at  : item.created_at,
        			});
        		}
        		setTimeout(function () {
        			res.render('meeting',{meetingsData:myArray});
        		},1500)
        	});
        } else {
        	res.render('meeting',{meetingsData:myArray});
        }
        
    });
    //check whether it's a past meeting or upcoming meeting. 
})

router.post('/addPollsOfMeeting', (req, res) => {
    var MeetingPollData = JSON.parse(req.body.pollsofmetting);
    console.log(MeetingPollData)
    ///save to databse logic//
    res.json({ meetingsPollData: MeetingPollData })
    // res.render('polls_of_meetings', { meetingsPollData: MeetingPollData });
})


router.post('/editMeeting', (req, res) => {
    var data = JSON.parse(req.body.metting);
    var myquery = { _id:data.meeting_id };
    var newvalues = { title: data.title, startTime: data.start_time, endTime: data.end_time, venue:data.venue };
    models.Meeting.updateOne(myquery,newvalues,function(err,meeting){
    	if(err) return next(err);
    	
    	if(data.polls) {
    		var myquery = { _id:data.polls[0].poll_id };
    		var newvalues = {summary:data.polls[0].summary};
    		models.Poll.updateOne(myquery,newvalues,function(err,Poll){
    			if(err) return next(err);
    			console.log('update succesfully');
    		});
    	} else {
    		console.log('update succesfully');
    	}
    });
    return 1;
})

router.post('/delete_meeting',(req,res) => {
	models.Meeting.remove({_id: req.body.meeting_id}, function (err, todo) {
		if (err) res.send(err);
		res.redirect('/allMeetings');
	});
});

router.get('/addMeeting',(req,res) => {
    res.render('add_meeting');
})

router.post('/saveMeeting',(req,res) =>{
    var data = req.body;
    console.log(data);
    //meeting start time
    /*if(req.body.startTime) {
    	var meetingStartDay = req.body.startTime.substring(0, req.body.startTime.indexOf('T'));
    	var meetingStartHour = req.body.startTime.substring(req.body.startTime.indexOf('T') + 1, req.body.startTime.indexOf('T') + 9);
    	var meetingStartFinal = startDay + " " + startHour;
    }

    //meeting end time
    if(req.body.endTime) {
    	var meetingEndDay = req.body.endTime.substring(0, req.body.endTime.indexOf('T'));
    	var meetingEndHour = req.body.endTime.substring(req.body.endTime.indexOf('T') + 1, req.body.endTime.indexOf('T') + 9);
    	var meetingEndFinal = endDay + " " + endHour;
    }
    //poll end time
    if(req.body.pollEndTime) {
    	var pollEndDay = req.body.pollEndTime.substring(0, req.body.pollEndTime.indexOf('T'));
    	var pollEndHour = req.body.pollEndTime.substring(req.body.pollEndTime.indexOf('T') + 1, req.body.pollEndTime.indexOf('T') + 9);
    	var pollEndFinal = pollEndDay + " " + pollEndHour;
    }*/

    if(data.poll_json){
        data.poll_json = JSON.parse(data.poll_json);
        //insert into database in poll schema
        models.Poll.create({
        	projectName 	: data.poll_json[0].project_name,
        	projectNameChn 	: data.poll_json[0].project_name_chinese,
        	summary 		: data.poll_json[0].summary,
        	summaryChn 		: data.poll_json[0].summary_chinese,
        	options 		: data.poll_json[0].option,
        	created_at 		: currentDate,
        }, function (err, Poll){
        	if (err) return handleError(err);
        	//insert into database in meeting schema
        	insertMeeting(Poll.id, data);
        	res.redirect('/addMeeting');
        });
    } else {
    	//insert into database in meeting schema
    	insertMeeting(null, data);  //if poll id not exist then poll id is null
    	res.redirect('/addMeeting');
    }
    

});
function insertMeeting(poll_id, data, res) {
	models.Meeting.create({
		title     : data.meeting_title,
		titleChn  : data.meeting_title_chinese,
		startTime : data.start_time,
		endTime   : data.end_time,
		venue     : data.venue,
		polls	  : poll_id,
		created_at: currentDate
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
