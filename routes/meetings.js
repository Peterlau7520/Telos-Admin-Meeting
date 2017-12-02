/**
 * This file serves routes for notices
 */
const express = require('express');
const models = require('../models/models');
const Estate = models.Estate;
const Notice = models.Notice;
const Meeting = models.Meeting;
const Poll = models.Poll;
const forEach = require('async-foreach').forEach;
var Promise = require('bluebird');
const _ = require('lodash');
var Busboy = require('busboy');
const busboyBodyParser = require('busboy-body-parser');

const fs = require('fs');
//router.use(busboyBodyParser({multi: true}));
const router = express.Router();
router.use(busboyBodyParser({multi: true}));
const dateFormat = require('dateformat');

// AWS.config.loadFromPath('./key.json');
var AWS = require('aws-sdk');
const async = require('async');
let docFileName,pathParams,dataFile;
const BucketName = 'telospdf';
AWS.config.update({
  accessKeyId: 'AKIAIMLMZLII2XCKU6UA',
  secretAccessKey: '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'
});
const bucket = new AWS.S3({params: {Bucket: BucketName}});


let currDate = new Date(); 
let currentDate = currDate.getFullYear()+"-"+(currDate.getMonth()+1)+"-"+currDate.getDate()+" "+currDate.getHours()+":"+currDate.getMinutes()+":"+currDate.getSeconds();
router.get('/allMeetings', (req, res) => {
    //res.render('meeting')
    Meeting.find().populate('polls').then(function(meetings, err){
        const promiseArr = []
        var currentMeetings = []
        var pastMeetings = []
        if(meetings.length > 0) {
            promiseArr.push(new Promise(function(resolve, reject){
               forEach(meetings, function(item, key, a){    
                if(item.fileLinks.length > 0) {
                      let fileLinks = [];
                        //let Key = `${req.user.estateName}/${item.title}/${item.fileLinks[0]}`;
                        fileLinks.push({
                          name: item.fileLinks[0],
                          //url: "https://"+BucketName+".s3.amazonaws.com/"+Key
                        })
                      item.fileLinks = fileLinks;
                }   
                if(item.polls){
                forEach(item.polls, function(poll, key, a){  
                if(poll.fileLinks){ 
                    forEach(poll.fileLinks, function(name, key, a){   
                        let polefileLinks = [];
                        //let Key = `${req.user.estateName}/${poll.title}/${name}`;
                        polefileLinks.push({
                          name: name,
                          //url: "https://"+BucketName+".s3.amazonaws.com/"+Key
                        })
                      poll.fileLinks = polefileLinks;
                    })
                }
                })
            }
                    if(item.endTime > currDate || item.endTime == currDate) {
                        currentMeetings.push(item)
                    }
                    else{
                        pastMeetings.push(item)
                    }
                    resolve({meetingsData: currentMeetings, pastMeetingsData: pastMeetings})
               })
           }))
            Promise.all(promiseArr)
            .then(function(data){
                 res.render('meeting', data[0]);
            })
        }
        if(err){
            console.log(err)
            res.render('meeting')
        }
    })
})

router.post('/addPollsOfMeeting', (req, res) => {
    if(req.body.meetingId){
        const data = req.body
        const filesArr = []
        var pollFileLinks = []
                    if(data.fileLinks.length != 0 ){
                        forEach(data.fileLinks, function(file){
                            filesArr.push(new Promise(function(resolve, reject){
                            
                                    var info = file.data;
                                    var name = file.name;
                                    //meeting.fileLinks.push(name);
                                    pollFileLinks.push(name)
                                    var data = {
                                        Bucket: BucketName,
                                        Key: `"Meetings"/${name}`,
                                        Body: info,
                                        ContentType: 'application/pdf',
                                        ContentDisposition: 'inline',
                                        ACL: "public-read"
                                    }; // req.user.estateName
                                    bucket.putObject(data, function (err, data) {
                                        if (err) {
                                            console.log('Error uploading data: ', err);
                                        } else {
                                            console.log('succesfully uploaded the pdf!');
                                            resolve(pollFileLinks)
                                        }
                                    });
                            }))
                        })
                        Promise.all(filesArr)
                        .then(function(files){
                            savePoll(req, res, files)
                        })
                    }
                    else{
                        savePoll(req, res, pollFileLinks)
                    }
    }
    else{
        console.log(req.body)
    res.json({ meetingsPollData: JSON.parse(req.body.pollsofmetting) })
    }

    function savePoll(req, res, files){
        const data = req.body
        var poll = new Poll({
                            projectName: data.project_name,
                            projectNameChn: data.project_name_chinese,
                            pollName: data.meetingStartFinal,
                            pollNameChn: data.title_chinese,
                            summary: data.summary,
                            summaryChn: data.summary_chinese,
                            fileLinks: files,
                            estateName: data.estateName,
                            options: data.options,
                            endTime: data.pollEndTime,
                            active: true,
                            voted: [],
                            finalResult: "",
                            results: [],
                            votes: []
                            });
                            poll.save()
                                .then(function(poll){
                                    Meeting.update(
                                        { _id: req.body.meetingId },
                                        { $push: { polls:  poll._id} } 
                                    )
                                    .then(function(result){
                                        res.json({ meetingsPollData: result, message: "Poll Added Successfully" })
                                    })
                                })
    }
})


router.post('/editMeeting', (req, res) => {
    var data = req.body.meeting
    var fileLinks = []
    if(req.files) {
        var files = req.files && req.files.filefield ? req.files.filefield : false;
        for (var i = 0; i < files.length; i++) {
            var info = files[i].data;
            var name = files[i].name;
            //meeting.fileLinks.push(name);
            fileLinks.push(name)
            var data = {
                Bucket: BucketName,
                Key: `${req.user.estateName}/${req.body.title}/${name}`,
                Body: info,
                ContentType: 'application/pdf',
                ContentDisposition: 'inline',
                ACL: "public-read"
            }; // req.user.estateName
            bucket.putObject(data, function (err, data) {
                if (err) {
                    console.log('Error uploading data: ', err);
                } else {
                    console.log('succesfully uploaded the pdf!');
                    save(req, res, fileLinks)
                      bucket.deleteObject({
                      Bucket: BucketName,
                      Key: req.body.fileLinks[0].url
                    }, function(err, filed){
                        console.log(filed)
                    })
                }
            });
        }
    }
    else{
        fileLinks = req.body.fileLinks
          save(req, res, '')
    }
    function save(req, res, file){
        const data = JSON.parse(req.body.meeting)

        var id = data.meeting_id
    Meeting.findOneAndUpdate({
      _id: id
    }, {
      $set: { 
        title: data.title,
        titleChn: data.titleChn,
        startTime: data.start_time, 
        endTime: data.end_time, 
        venue:data.venue,
        //fileLinks: fileLinks
      }
    },{ 
      new: true 
    })
    .then((meeting) => {
        if(!meeting){
         res.json({
          success: false,
          message: "Got some issue"
        }); 
        }
        else{ 
         res.json({
          success: true,
          message: "Meeting updated Successfully"
        });
    }
    })
}
})

router.post('/editPoll', (req, res) => {
    var data = req.body
    var id = req.body._id
    var fileLinks = []
    var pollFileLinks = []
    if(req.body.addedFiles) {
        forEach(data.fileLinks, function(file){
            filesArr.push(new Promise(function(resolve, reject){        
                var info = file.data;
                var name = file.name;
                pollFileLinks.push(name)
                var data = {
                    Bucket: BucketName,
                    Key: `${req.user.estateName}/${req.body.meetingName}/${req.body.pollName}/${name}`,
                    Body: info,
                    ContentType: 'application/pdf',
                    ContentDisposition: 'inline',
                    ACL: "public-read"
                    }; // req.user.estateName
                    bucket.putObject(data, function (err, data) {
                    if (err) {
                    console.log('Error uploading data: ', err);
                    } else {
                    console.log('succesfully uploaded the pdf!');
                    resolve(pollFileLinks)
                    }
                    });
            }))
        })
        Promise.all(filesArr)
        .then(function(files){
        updatePoll(req, res, files)
        })

    }
    else{
        updatePoll(req, res, pollFileLinks)
    }
    
    function updatePoll(req, res, files){
        const data = req.body
        Poll.findOneAndUpdate({_id: id
    }, {
      $set: { 
         projectName: data.projectName,
         projectNameChn: data.projectNameChn,
         pollName: data.pollName,
         pollNameChn: data.pollNameChn,
         summary: data.summary,
         summaryChn: data.summaryChn,
        // fileLinks: files,
       //  estateName: data.estateName,
         options: data.options,
         //endTime: data.pollEndTime,
         active: true,
         //voted: [],
        // finalResult: "",
         //results: [],
        // votes: []
      }
    },{ 
      new: true 
    })
    .then(function(poll){
        if(!poll){
            res.json({message: 'Could Not Update'})
        }
        else{
            res.json({message: 'Updated Successfully'})
        }
    })                         
}
})

router.get('/addMeeting',(req,res) => {
    res.render('add_meeting');
})

router.post('/saveMeeting',(req,res) =>{
    var data = req.body;
    var body = {
    fields: {},
    files: []
  };
    if(req.files.length !=0 ){
        uploadFile(req,res)
    }
    else{
        savePoll(req, res, "")
    }
function uploadFile(req, res){
    var files = req.files && req.files.filefield ? req.files.filefield : false;
    var fileLinks = []
    if (files && files[0].size != 0) {
        for (var i = 0; i < files.length; i++) {
            var info = files[i].data;
            var name = files[i].name;
            //meeting.fileLinks.push(name);
            fileLinks.push(name)
            var data = {
                Bucket: BucketName,
                Key:  `Meetings/${name}`,
                //Key: `${req.user.estateName}/Meetings/${req.body.title}/${name}`,
                Body: info,
                ContentType: 'application/pdf',
                ContentDisposition: 'inline',
                ACL: "public-read"
            }; // req.user.estateName
            bucket.putObject(data, function (err, data) {
                if (err) {
                    console.log('Error uploading data: ', err);
                } else {
                    console.log('succesfully uploaded the pdf!', data);
                    savePoll(req, res, fileLinks);

                }
            });
        }
    } else {
        savePoll(req, res, fileLinks);
    }
        }

function savePoll(req, res, fileLinks){
    const promiseArr = []
    if(req.body.startTime) {
        var meetingStartDay = req.body.startTime.substring(0, req.body.startTime.indexOf('T'));
        var meetingStartHour = req.body.startTime.substring(req.body.startTime.indexOf('T') + 1, req.body.startTime.indexOf('T') + 9);
        var meetingStartFinal = dateFormat(meetingStartDay + " " + meetingStartHour, 'shortDate');
    }
    //meeting end time
    if(req.body.endTime) {
        var meetingEndDay = req.body.endTime.substring(0, req.body.endTime.indexOf('T'));
        var meetingEndHour = req.body.endTime.substring(req.body.endTime.indexOf('T') + 1, req.body.endTime.indexOf('T') + 9);
        var meetingEndFinal = dateFormat(meetingEndDay + " " + meetingEndHour, 'shortDate');
    }
    //poll end time
    if(req.body.pollEndTime) {
        var pollEndDay = req.body.pollEndTime.substring(0, req.body.pollEndTime.indexOf('T'));
        var pollEndHour = req.body.pollEndTime.substring(req.body.pollEndTime.indexOf('T') + 1, req.body.pollEndTime.indexOf('T') + 9);
        var pollEndFinal = dateFormat(pollEndDay + " " + pollEndHour, 'shortDate');
    }
     const Polls = JSON.parse(req.body.poll_json)
      if(Polls.length  > 0){
            forEach(Polls, function(values){
             promiseArr.push(new Promise(function(resolve, reject) {
                var pollIds = []
                var poll = new Poll({
                     pollName: values.title,
                     pollNameChn: values.title_chinese,
                     summary: values.summary,
                     summaryChn: values.summaryChn,
                     fileLinks: values.filesName,
                     estateName: "HKU",
                     options: values.option,
                     endTime: '',
                     active: true,
                     voted: [],
                     finalResult: "",
                     results: [],
                     votes: []
                    });
                poll.save()
                .then(function(poll){
                    pollIds.push(poll._id)
                    resolve(pollIds)
                    })
                }))
            })
        Promise.all(promiseArr)
        .then(function(d){ 
            //saveMeeting(req, res, fileLinks, polls)
        var meeting = new Meeting({
                title: req.body.meeting_title,
                titleChn: req.body.meeting_title_chinese,
                startTime: meetingStartFinal,
                endTime: meetingEndFinal,
                venue: req.body.venue,
                fileLinks: fileLinks,
                polls: d[0],
                active: true
            });
            meeting.save(function(err, meeting){
                console.log(meeting, "meeting")
                uploadPollFiles(req, res)
                res.json({message: "succesfully saved"})
    })
})
}
}

function uploadPollFiles(req, res){
      const Polls = JSON.parse(req.body.poll_json)
      console.log(Polls, "polls")
}

});

router.post('/delete_meeting',(req,res) => {
    Meeting.deleteOne({_id: req.body.meeting_id}, function (err, todo) {
        if (err) res.send(err);
        res.redirect('/allMeetings');
    });
});

router.post('/delete_poll',(req,res) => {
     Poll.deleteOne({_id: req.body.pollId}, function (err, todo) {
        if (err) res.send(err);
        Meeting.update(
            { _id: req.body.meetingId },
            { $pop: { polls:  req.body.pollId} } 
        )
        .then(function(err, result){
            if (err) res.send(err);
           res.redirect('/allMeetings');
        })
    });
});


module.exports = router;

