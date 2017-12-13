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
var moment = require("moment");
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
  secretAccessKey: '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',
  region: 'ap-southeast-1'
});
const bucket = new AWS.S3({params: {Bucket: BucketName}});


let currDate = new Date(); 
let currentDate = currDate.getFullYear()+"-"+(currDate.getMonth()+1)+"-"+currDate.getDate()+" "+currDate.getHours()+":"+currDate.getMinutes()+":"+currDate.getSeconds();
router.get('/allMeetings', (req, res) => {
    //res.render('meeting')
    Meeting.find().populate('polls').lean().then(function(meetings, err){
        const promiseArr = []
        var currentMeetings = []
        var pastMeetings = []
        if(meetings.length > 0) {
            promiseArr.push(new Promise(function(resolve, reject){
               forEach(meetings, function(item, key, a){
                if( item.fileLinks && item.fileLinks.length > 0) {
                      let fileLinks = [];
                      var titleLink = ''
                      var fileLinksLink = ''
                      if(item.title){
                      titleLink = item.title
                      titleLink = titleLink.replace(/ /g,'');
                  }
                  if(item.fileLinks[0]){
                      fileLinksLink = item.fileLinks[0]
                      fileLinksLink = fileLinksLink.replace(/ /g,'');
                  }
                       
                        let Key = `${req.user.estateName}/${titleLink}/${fileLinksLink}`;
                        fileLinks.push({
                          name: item.fileLinks[0],
                          url: "https://"+BucketName+".s3.amazonaws.com/"+Key
                        })
                      item.fileLinks = fileLinks;
                }   
                if(item.polls){
                forEach(item.polls, function(poll, key, a){ 
                    var pollEndTime = moment(new Date(poll.endTime));
                    item.polls[key].endTime = pollEndTime.format("D-MM-YYYY");
                let polefileLinks = []; 
                if(poll.fileLinks){ 
                    forEach(poll.fileLinks, function(name, key, a){ 
                        let fileLinks = [];
                      var titleLink = ''
                      var fileLinksLink = ''
                      if(poll.title){
                      titleLink = poll.title
                      titleLink = titleLink.replace(/ /g,'');
                  }
                  if(name){
                      fileLinksLink = name
                      fileLinksLink = fileLinksLink.replace(/ /g,'');
                  }

                        let Key = `${req.user.estateName}/${titleLink}/${fileLinksLink}`;
                        polefileLinks.push({
                          name: name,
                          url: "https://"+BucketName+".s3.amazonaws.com/"+Key
                        })
                      poll.fileLinks = polefileLinks;
                    })
                }
                })
            }
                    console.log(item.endTime)
                     var startTime = moment.utc(new Date(item.startTime));
                    item.startTime =  startTime.format("DD/MM/YYYY hh:mm a");
                    if(Date.parse(new Date(item.endTime)) > Date.parse(new Date)){
                      var endTime = moment.utc(new Date(item.endTime));
                    item.endTime =  endTime.format("DD/MM/YYYY hh:mm a");
                    currentMeetings.push(item)
                   //start is less than End
                    }else{
                      var endTime = moment.utc(new Date(item.endTime));
                    item.endTime =  endTime.format("DD/MM/YYYY hh:mm a");
                     pastMeetings.push(item)
                    //end is less than start
                    }
                   // console.log(currentMeetings, pastMeetings, "current")
                    resolve({meetingsData: currentMeetings, pastMeetingsData: pastMeetings})
               })
           }))
            Promise.all(promiseArr)
            .then(function(data){
                 res.render('meeting', data[0]);
            })
        }
       else{
            res.render('meeting')
        }
    })
})

router.post('/addPollsOfMeeting', (req, res) => {
    if(req.body.meeting_id){
        const fileLinks = []
        var pollFileLinks = []
                    if(req.files && !(_.isEmpty(req.files))){
                       for (var key in req.files) {
            var info = req.files[key][0].data;
            var name = req.files[key][0].name;
            //meeting.fileLinks.push(name);
            //Let key = `${req.user.estateName}/${req.body.title}/${name}`
            fileLinks.push(name)
            var titleLink = ''
                      var fileLinksLink = ''
                      if(req.body.title){
                      titleLink = req.body.title
                      titleLink = titleLink.replace(/ /g,'');
                  }
                  if(name){
                      fileLinksLink = name
                      fileLinksLink = fileLinksLink.replace(/ /g,'');
                  }
            var data = {
                Bucket: BucketName,
                Key: `${req.user.estateName}/${titleLink}/${fileLinksLink}`,
                Body: info,
                ContentType: 'application/pdf',
                ContentDisposition: 'inline',
                ACL: "public-read"
            }; // req.user.estateName
            bucket.putObject(data, function (err, data) {
                if (err) {
                    console.log('Error uploading data: ', err);
                } else {
                    savePoll(req,res, fileLinks)
                    console.log('succesfully uploaded the pdf!');
                }
            });
        }    
    }
    else{
        savePoll(req,res, fileLinks)
    }
}
    else{
          let formData = req.body;
        for (var key in req.files) {
            var info = req.files[key][0].data;
            var name = req.files[key][0].name;
            //meeting.fileLinks.push(name);
            //Let key = `${req.user.estateName}/${req.body.title}/${name}`
            //fileLinks.push(name)
            var titleLink = ''
                      var fileLinksLink = ''
                      if(req.body.title){
                      titleLink = req.body.title
                      titleLink = titleLink.replace(/ /g,'');
                  }
                  if(name){
                      fileLinksLink = name
                      fileLinksLink = fileLinksLink.replace(/ /g,'');
                  }
            var data = {
                Bucket: BucketName,
                Key: `${req.user.estateName}/${titleLink}/${fileLinksLink}`,
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
                }
            });
        }       
    //res.json({ meetingsPollData: JSON.parse(req.body) })
    }

    function savePoll(req, res, files){
        if(req.body.options){
        var options = req.body.options
         array = options.split(',')
    }
    else{
        array = req.body.option
    }
    Meeting.findOne(
            { _id: req.body.meeting_id })
    .then(function(m, err){
        console.log(m)
        var poll = new Poll({
                            pollName: req.body.title,
                            pollNameChn: req.body.title_chinese,
                            summary: req.body.summary,
                            summaryChn: req.body.summary_chinese,
                            fileLinks: files,
                            estateName: req.user.estateName,
                            options: array,
                            endTime: m.pollEndTime,
                            active: true,
                            voted: [],
                            finalResult: "",
                            results: [],
                            votes: []
                            });
                            poll.save()
                                .then(function(poll){
                                    console.log(poll)
                                    Meeting.update(
                                        { _id: req.body.meeting_id },
                                        { $push: { polls:  poll._id} } 
                                    )
                                    .then(function(result){
                                        res.redirect('/allMeetings')
                                        //res.json({ meetingsPollData: result, message: "Poll Added Successfully" })
                                    })
                                })
            })
    }
})


router.post('/editMeeting', (req, res) => {
    console.log(req.body, "rrrr")
    var fileLinks = []
    if(req.files && req.files.fileField) {
        var files = req.files.fileField
        for (var i = 0; i < files.length; i++) {
            var info = files[i].data;
            var name = files[i].name;
            //meeting.fileLinks.push(name);
            fileLinks.push(name)
             var titleLink = ''
                      var fileLinksLink = ''
                      if(req.body.title){
                      titleLink = req.body.title
                      titleLink = titleLink.replace(/ /g,'');
                  }
                  if(name){
                      fileLinksLink = name
                      fileLinksLink = fileLinksLink.replace(/ /g,'');
                  }
                var data = {
                Bucket: BucketName,
                Key: `${req.user.estateName}/${req.body.fileLinksLink}/${fileLinksLink}`,
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
                      /*bucket.deleteObject({
                      Bucket: BucketName,
                      Key: req.body.fileLinks[0].url
                    }, function(err, filed){
                        console.log(filed)
                    })*/
                }
            });
        }
    }
    else{
        fileLinks.push(req.body.fileLinks)
          save(req, res, fileLinks)
    }
    function save(req, res, file){
        const data = req.body
        var id = data.meeting_id
         console.log('removedfile', req.body)
    Meeting.findOneAndUpdate({
      _id: id
    }, {
      $set: { 
        title: data.title,
        titleChn: data.titleChn,
        startTime: data.start_time, 
        endTime: data.end_time, 
        venue:data.venue,
        fileLinks: fileLinks
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
            if(data.removedfiles){
                console.log('removedfile')
                 Meeting.findOneAndUpdate({_id: id
                }, {
                  $pull: { 
                     fileLinks: data.removedfiles,
                  }
                })
                 .then(function(r, err){
                    res.redirect('/allMeetings')
                 })
            }
            else{
                res.redirect('/allMeetings')
            }
    
        }
    })
}
})

router.post('/editPoll', (req, res) => {
    var data = req.body
    var id = req.body.id
    var fileLinks = []
    var pollFileLinks = []
    if(req.files && !(_.isEmpty(req.files))){
         for (var key in req.files) {
            var info = req.files[key][0].data;
            var name = req.files[key][0].name;
            //meeting.fileLinks.push(name);
            //Let key = `${req.user.estateName}/${req.body.title}/${name}`
                      var titleLink = ''
                      var fileLinksLink = ''
                      if(req.body.title){
                      titleLink = req.body.title
                      titleLink = titleLink.replace(/ /g,'');
                  }
                  if(name){
                      fileLinksLink = name
                      fileLinksLink = fileLinksLink.replace(/ /g,'');
                  }
            fileLinks.push(name)
            var data = {
                Bucket: BucketName,
                Key: `${req.user.estateName}/${titleLink}/${fileLinksLink}`,
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
                     Poll.findOneAndUpdate({_id: id
                        }, {
                          $push: { 
                             fileLinks: name,
                          }
                        },{ 
                          new: true 
                        })
                        .then(function (data, err) {
                            console.log(data, "data")
                            updatePoll(req, res, fileLinks)
                        })
                }
            });
        }     
    }
    else{
        updatePoll(req, res, fileLinks)
    }
    function updatePoll(req, res, files){
        var array = []
        var promiseArr = [] 
        var filearray = []
        if(req.body.options){
        var options = req.body.options
         array = options.split(',')
    }
    else{
        array = req.body.option
    }
    
     if(req.body.removedfile){
        var file = req.body.removedfile
         filearray = file.split(',')
    promiseArr.push(new Promise(function(resolve, reject){
    forEach(filearray, function(item){
         Poll.findOneAndUpdate({_id: req.body.id
    }, {
      $pull: { 
         fileLinks: item,
      }
    })
         .then(function(d, err){
            resolve(d)
    })
        })
        })) 
     Promise.all(promiseArr)
    .then(function(dd){
     update(req, res)
    })
    }else{
        update(req, res)
}  
    function update(req, res){
         const data = req.body
        Poll.findOneAndUpdate({_id: id
    }, {
      $set: { 
         pollName: data.pollName,
         pollNameChn: data.pollNameChn,
         summary: data.summary,
         summaryChn: data.summaryChn,
         options: array,
         active: true,
      }
    },{ 
      new: true 
    })
    .then(function(poll){
        if(!poll){
            res.json({message: 'Could Not Update'})
        }
        else{
            res.redirect('/allMeetings')
            //res.json({message: 'Updated Successfully'})
        }
    })    
    }
}
})

router.get('/addMeeting',(req,res) => {
      Meeting.find().populate('polls').lean().then(function(meetings, err){
        const promiseArr = []
        var currentMeetings = []
        var pastMeetings = []
        if(meetings.length > 0) {
            promiseArr.push(new Promise(function(resolve, reject){
               forEach(meetings, function(item, key, a){
                if( item.fileLinks && item.fileLinks.length > 0) {
                      let fileLinks = [];
                        let Key = `${req.user.estateName}/${item.title}/${item.fileLinks[0]}`;
                        fileLinks.push({
                          name: item.fileLinks[0],
                          url: "https://"+BucketName+".s3.amazonaws.com/"+Key
                        })
                      item.fileLinks = fileLinks;
                }   
                if(item.polls){
                forEach(item.polls, function(poll, key, a){ 
                    var pollEndTime = moment(new Date(poll.endTime));
                    item.polls[key].endTime = pollEndTime.format("D-MM-YYYY");
                let polefileLinks = []; 
                if(poll.fileLinks){ 
                    forEach(poll.fileLinks, function(name, key, a){ 
                        let Key = `${req.user.estateName}/${poll.title}/${name}`;
                        polefileLinks.push({
                          name: name,
                          url: "https://"+BucketName+".s3.amazonaws.com/"+Key
                        })
                      poll.fileLinks = polefileLinks;
                    })
                }
                })
            }
                    var startTime = moment.utc(new Date(item.startTime));
                    item.startTime =  startTime.format("DD/MM/YYYY hh:mm a");
                    if(Date.parse(new Date(item.endTime)) > Date.parse(new Date)){
                      var endTime = moment.utc(new Date(item.endTime));
                    item.endTime =  endTime.format("DD/MM/YYYY hh:mm a");
                    currentMeetings.push(item)
                   //start is less than End
                    }else{
                      var endTime = moment.utc(new Date(item.endTime));
                    item.endTime =  endTime.format("DD/MM/YYYY hh:mm a");
                     pastMeetings.push(item)
                    //end is less than start
                    }
                    resolve({meetingsData: currentMeetings, pastMeetingsData: pastMeetings})
               })
           }))
            Promise.all(promiseArr)
            .then(function(data){
                res.render('add_meeting', data[0]);
            })
        }
        else{
            res.render('add_meeting');
        }
    
})
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
            var titleLink = ''
                      var fileLinksLink = ''
                      if(req.body.title){
                      titleLink = req.body.title
                      titleLink = titleLink.replace(/ /g,'');
                  }
                  if(name){
                      fileLinksLink = name
                      fileLinksLink = fileLinksLink.replace(/ /g,'');
                  }
            var data = {
                Bucket: BucketName,
                Key:  `${req.user.estateName}/${titleLink}/${fileLinksLink}`,
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
    console.log(req.body)
    console.log(req.body)
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
                     summaryChn: values.summary_chinese,
                     fileLinks: values.filesName,
                     estateName: req.user.estateName,
                     options: values.option,
                     endTime: pollEndFinal,
                     active: true,
                     voted: [],
                     finalResult: "",
                     results: [],
                     votes: []
                    });
                poll.save()
                .then(function(poll){
                    resolve(poll._id)
                    })
                }))
            })
        Promise.all(promiseArr)
        .then(function(d){ 
            console.log(d)
            //saveMeeting(req, res, fileLinks, polls)
        var meeting = new Meeting({
                title: req.body.meeting_title,
                titleChn: req.body.meeting_title_chinese,
                startTime: req.body.startTime ,//meetingStartFinal,
                endTime: req.body.endTime, //meetingEndFinal,
                pollEndTime: pollEndFinal,
                venue: req.body.venue,
                estateName: req.user.estateName,
                fileLinks: fileLinks,
                polls: d,
                active: true
            });
            meeting.save(function(err, meeting){
                console.log(meeting)
                res.redirect('/allMeetings')
    })
})
}
}
});

router.post('/deleteMeeting',(req,res) => {
    console.log(req.body)
    Meeting.deleteOne({_id: req.body.meeting_id}, function (err, todo) {
        if (err) res.send(err);
        res.redirect('/allMeetings');
    });
});

router.post('/deletePoll',(req,res) => {
    console.log(req.body)
     Poll.deleteOne({_id: req.body.pollId}, function (err, todo) {
        if (err) { res.redirect('/allMeetings')}
        Meeting.update(
            { _id: req.body.meetingId },
            { $pull: { polls:  req.body.pollId} } 
        )
        .then(function(err, result){
            if (err) res.send(err);
           res.redirect('/allMeetings');
        })
    });
});


module.exports = router;

