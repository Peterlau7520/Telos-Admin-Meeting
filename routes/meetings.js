/**
 * This file serves routes for notices
 */
const express = require('express');
const models = require('../models/models');
const Estate = models.Estate;
const Notice = models.Notice;
//var Busboy = require('busboy');
//const busboyBodyParser = require('busboy-body-parser');
const fs = require('fs');
//router.use(busboyBodyParser({multi: true}));

var multer  = require('multer');
var uploaded = multer({dest: './uploads'});
const router = express.Router();

// AWS.config.loadFromPath('./key.json');
var AWS = require('aws-sdk');
const async = require('async');
const bucketName = "telospdf";
let docFileName,pathParams,dataFile;

/** Load Config File */
AWS.config.loadFromPath('./models/config.json');
/** After config file load, create object for s3*/
var s3 = new AWS.S3({ region: 'us-east-1' });
var createMainBucket = (callback) => {
    // Create the parameters for calling createBucket
    var bucketParams = {
       Bucket : bucketName
    };
    s3.headBucket(bucketParams, function (err, data) {
        if (err) {
            console.log("ErrorHeadBucket", err)
            s3.createBucket(bucketParams, function (err, data) {
                if (err) {
                    console.log("Error", err)
                    callback(err, null)
                } else {
                    callback(null, data)
                }
            });
        } else {
            callback(null, data)
        }
    });
}

const createItemObject = (callback) => {
    const params = {
          Bucket: bucketName,
          Key: `${docFileName}`,
          ACL: 'public-read',
          Body:dataFile
      };
      s3.putObject(params, function (err, data) {
          if (err) {
              console.log("Error uploading image: ", err);
              callback(err, null)
          } else {
              console.log("Successfully uploaded image on S3", data);
              callback(null, data)
          }
      })
  }



let currDate = new Date(); 
let currentDate = currDate.getFullYear()+"-"+(currDate.getMonth()+1)+"-"+currDate.getDate()+" "+currDate.getHours()+":"+currDate.getMinutes()+":"+currDate.getSeconds();



router.get('/allMeetings', (req, res) => {
    console.log('process', process.env.MONGODB_URI);

    //get data from meeting schema
    models.Meeting.find(function (err, meetings) {
        if (err) { res.send(err); }
        var currentMeetings = new Array();
        var pastMeetings = new Array();
        if(meetings.length > 0) {
            //get data from poll schema
            meetings.forEach(function(item) {
                //for current meeting
                if(item.endTime > currentDate) {
                    if(item.polls != null) {
                        models.Poll.findById(item.polls[0],function(err,poll){
                            if(err) return next(err);
                            currentMeetings.push({
                                id          : item.id,
                                title       : item.title,
                                titleChn    : item.titleChn,
                                startTime   : item.startTime,
                                endTime     : item.endTime,
                                venue       : item.venue,
                                created_at  : item.created_at,
                                document    : item.fileLinks[0],
                                polls       : [{
                                    pollId      : poll._id,
                                    pollName    : poll.projectName,
                                    pollNameChn : poll.projectNameChn,
                                    summary     : poll.summary,
                                    summaryChn  : poll.summaryChn,
                                    endTime     : poll.endTime,
                                    options     : poll.options
                                }]  
                            });
                        });
                    } else {
                        currentMeetings.push({
                            id          : item.id,
                            title       : item.title,
                            titleChn    : item.titleChn,
                            startTime   : item.startTime,
                            endTime     : item.endTime,
                            venue       : item.venue,
                            created_at  : item.created_at,
                            document    : item.fileLinks[0],
                        });
                    }
                } else {  
                    //for past meeting
                    if(item.polls != null) {
                        models.Poll.findById(item.polls[0],function(err,poll){
                            if(err) return next(err);
                            pastMeetings.push({
                                id          : item.id,
                                title       : item.title,
                                titleChn    : item.titleChn,
                                startTime   : item.startTime,
                                endTime     : item.endTime,
                                venue       : item.venue,
                                created_at  : item.created_at,
                                document    : item.fileLinks[0],
                                polls       : [{
                                    pollId      : poll._id,
                                    pollName    : poll.projectName,
                                    pollNameChn : poll.projectNameChn,
                                    summary     : poll.summary,
                                    summaryChn  : poll.summaryChn,
                                    endTime     : poll.endTime,
                                    options     : poll.options
                                }]  
                            });
                        });
                    } else {
                        pastMeetings.push({
                            id          : item.id,
                            title       : item.title,
                            titleChn    : item.titleChn,
                            startTime   : item.startTime,
                            endTime     : item.endTime,
                            venue       : item.venue,
                            created_at  : item.created_at,
                            document    : item.fileLinks[0],
                        });
                    }
                }
                
            });
            setTimeout(function () {
                //console.log('pastMeetings',pastMeetings, 'currentMeetings', currentMeetings);
                res.render('meeting',{meetingsData:currentMeetings,pastMeetingsData:pastMeetings,now: new Date() });
            },1500);
        } else {
            res.render('meeting',{meetingsData:currentMeetings});
        }
        
    });
    //check whether it's a past meeting or upcoming meeting. 
})

/*router.get('/allMeetings', (req, res) => {
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
})*/

router.post('/addPollsOfMeeting', (req, res) => {
    var MeetingPollData = JSON.parse(req.body.pollsofmetting);
    console.log('MeetingPollData',MeetingPollData)
    ///save to databse logic//
    res.json({ meetingsPollData: MeetingPollData })
    // res.render('polls_of_meetings', { meetingsPollData: MeetingPollData });
})


router.post('/editMeeting', (req, res) => {
    console.log('editmeeting');
    var data = JSON.parse(req.body.metting);
    var myquery = { _id:data.meeting_id };
    var newvalues = { title: data.title, startTime: data.start_time, endTime: data.end_time, venue:data.venue };
    models.Meeting.updateOne(myquery,newvalues,function(err,meeting){
        console.log();
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

router.post('/saveMeeting',uploaded.any('doc'),(req,res) =>{
    var data = req.body;
    //if any file uploaded 
    if(req.files.length > 0) {
        docFileName = req.files[0].originalname;
        dataFile = req.files[0].path;

        async.series([
            createMainBucket,
            createItemObject
            ], (err, result) => {
                if (err) {
                    return res.send(err);
                }
                else {
                    console.log('Successfully Uploaded');
                }
            });
    }
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
            projectName     : data.poll_json[0].project_name,
            projectNameChn  : data.poll_json[0].project_name_chinese,
            summary         : data.poll_json[0].summary,
            summaryChn      : data.poll_json[0].summary_chinese,
            options         : data.poll_json[0].option,
            created_at      : currentDate,
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
        startTime : data.startTime,
        endTime   : data.endTime,
        venue     : data.venue,
        polls     : poll_id,
        fileLinks : docFileName,
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
