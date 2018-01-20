/**
 * This file serves routes for notices
 */
const express = require('express');
const models = require('../models/models');
const Estate = models.Estate;
const Notice = models.Notice;
const Meeting = models.Meeting;
const Resident = models.Resident;
const Poll = models.Poll;
const forEach = require('async-foreach').forEach;
var Promise = require('bluebird');
const _ = require('lodash');
var Busboy = require('busboy');
var moment = require("moment");
const busboyBodyParser = require('busboy-body-parser');
var schedule = require('node-schedule');
const fs = require('fs');
const router = express.Router();
router.use(busboyBodyParser({multi: true}));
const dateFormat = require('dateformat');


var AWS = require('aws-sdk');
const async = require('async');
let docFileName,pathParams,dataFile;
const BucketName = 'telospdf';
AWS.config.update({
  accessKeyId: 'AKIAIMLMZLII2XCKU6UA',
  secretAccessKey: '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'
});
const bucket = new AWS.S3({params: {Bucket: BucketName}});


const appId = '72ae436c-554c-4364-bd3e-03af71505447';
const apiKey = 'YTU4NmE5OGItODM3NC00YTYwLWExNjUtMTEzOTE2YjUwOWJk';
const oneSignal = require('onesignal')(apiKey, appId, true);
function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}
var MeetingGUID , pollGUID;
MeetingGUID = guid()
let currDate = new Date(); 
let currentDate = currDate.getFullYear()+"-"+(currDate.getMonth()+1)+"-"+currDate.getDate()+" "+currDate.getHours()+":"+currDate.getMinutes()+":"+currDate.getSeconds();
router.get('/allMeetings', (req, res) => {
    Meeting.find({estate: req.user.estateName}).populate('polls').lean().then(function(meetings, err){
        const promiseArr = []
        var currentMeetings = []
        var pastMeetings = []
        var pollMeeting_title = '';
        if(meetings.length > 0) {
            promiseArr.push(new Promise(function(resolve, reject){
               forEach(meetings, function(item, key, a){
                if( item.fileLinks && item.fileLinks.length > 0) {
                      let fileLinks = [];
                      var titleLink = ''
                      var fileLinksLink = ''
                      if(item.title){
                      titleLink = item.title
                      titleLink = titleLink.replace(/[^A-Z0-9]/ig, "");
                      pollMeeting_title = titleLink
                  }
                  if(item.fileLinks[0]){
                      fileLinksLink = item.fileLinks[0]
                      fileLinksLink = fileLinksLink.replace(/[^A-Z0-9]/ig, "");
                  }
                        let Key = `${req.user.estateName}/${item.guid}/${fileLinksLink}`;
                        fileLinks.push({
                          name: item.fileLinks[0],
                          url: "https://"+BucketName+".s3.amazonaws.com/"+Key
                        })
                      item.fileLinks = fileLinks;
                }   
                if(item.polls){
                forEach(item.polls, function(poll, key, a){ 
                    var pollEndTime = moment(new Date(poll.endTime));
                    item.polls[key].endTime = pollEndTime.format("MM-DD-YYYY");
                let polefileLinks = []; 
                if(poll.fileLinks){ 
                    forEach(poll.fileLinks, function(name, key, a){ 
                        let fileLinks = [];
                      var titleLink = ''
                      var fileLinksLink = ''
                      if(poll.pollName){
                      titleLink = poll.pollName
                      titleLink = titleLink.replace(/[^A-Z0-9]/ig, "");
                  }
                  if(name){
                      fileLinksLink = name
                      fileLinksLink = fileLinksLink.replace(/[^A-Z0-9]/ig, "");
                  }
                        let Key = `${req.user.estateName}/${item.guid}/Poll/${fileLinksLink}`;
                        polefileLinks.push({
                          name: name,
                          url: "https://"+BucketName+".s3.amazonaws.com/"+Key
                        })
                      poll.fileLinks = polefileLinks;
                    })
                }
                })
            }
                    var startTime = moment(new Date(item.startTime));
                    item.startTime =  startTime.format("MM/DD/YYYY hh:mm a");
                    if(Date.parse(new Date(item.endTime)) > Date.parse(new Date)){
                      var endTime = moment(new Date(item.endTime));
                    item.endTime =  endTime.format("MM/DD/YYYY hh:mm a");
                    currentMeetings.push(item)
                   //start is less than End
                    }else{
                      var endTime = moment(new Date(item.endTime));
                    item.endTime =  endTime.format("MM/DD/YYYY hh:mm a");
                     pastMeetings.push(item)
                    //end is less than start
                    }
                    resolve({meetingsData: currentMeetings, pastMeetingsData: pastMeetings})
               })
           }))
            Promise.all(promiseArr)
            .then(function(data){
              Estate.findOneAndUpdate({_id: req.user._id},{
                $set: {
                  currentMeetings: data[0].meetingsData,
                  pastMeetings: data[0].pastMeetingsData,
                }
              })
              .then(function(estate){
                 data[0]["estateNameDisplay"] = req.user.estateNameDisplay;
                 data[0]["estateNameChn"] = req.user.estateNameChn;
                 res.render('meeting', data[0]);
               })
            })
        }
       else{
            res.render('meeting', {"estateNameDisplay": req.user.estateNameDisplay, "estateNameChn": req.user.estateNameChn})
        }
    })
})

router.post('/addPollsOfMeeting', (req, res) => {
    if(req.body.meeting_id){
      var meeting_title = ''
      Meeting.findOne({_id: req.body.meeting_id}).then(function(meetings, err){
        meeting_title = meetings.title;
              const fileLinks = []
        var pollFileLinks = []
                    if(req.files && !(_.isEmpty(req.files))){
                       for (var key in req.files) {
            var info = req.files[key][0].data;
            var name = req.files[key][0].name.replace(/[^A-Z0-9]/ig, "");
            fileLinks.push(name)
            var titleLink = ''
                      var fileLinksLink = ''
                      if(req.body.title){
                      titleLink = req.body.title
                      titleLink = titleLink.replace(/[^A-Z0-9]/ig, "");
                  }
                  if(name){
                      fileLinksLink = name
                      fileLinksLink = fileLinksLink.replace(/[^A-Z0-9]/ig, "");
                  }
                  if(meeting_title){

                      meeting_title = meeting_title.replace(/[^A-Z0-9]/ig, "");
                  }
            var data = {
                Bucket: BucketName,
                Key: `${req.user.estateName}/${meetings.guid}/Poll/${fileLinksLink}`,
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
                }
            });
        } 

    }
    else{
        savePoll(req,res, fileLinks)
    }
      })   
}
    else{
      //MeetingGUID = guid()
          let formData = req.body;
        for (var key in req.files) {
            var info = req.files[key][0].data;
            var name = req.files[key][0].name.replace(/[^A-Z0-9]/ig, "");
            var meeting_title = req.body.pollMeeting_title;
            var titleLink = ''
                      var fileLinksLink = ''
                      if(req.body.title){
                      titleLink = req.body.title
                      titleLink = titleLink.replace(/[^A-Z0-9]/ig, "");
                  }
                  if(name){
                      fileLinksLink = name
                      fileLinksLink = fileLinksLink.replace(/[^A-Z0-9]/ig, "");
                  }
                  meeting_title = meeting_title.replace(/[^A-Z0-9]/ig, "");
            var data = {
                Bucket: BucketName,
                Key: `${req.user.estateName}/${MeetingGUID}/Poll/${fileLinksLink}`,
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
                      //res.redirect('/addMeeting');
                }
            });
        }       
        res.json({})
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
    var GUID = '' ;
    var fileLinks = []
    if(req.files && req.files.fileField) {
      Meeting.findOne({_id: req.body.meeting_id})
      .then(function(meeting, err){
        console.log(meeting, "mmmmmmmmmmmmm")
           GUID = meeting.guid
        var files = req.files.fileField
        for (var i = 0; i < files.length; i++) {
            var info = files[i].data;
            var name = files[i].name.replace(/[^A-Z0-9]/ig, "");
            //meeting.fileLinks.push(name);
            fileLinks.push(name)
             var titleLink = ''
                      var fileLinksLink = ''
                      if(req.body.title){
                      titleLink = req.body.title
                      titleLink = titleLink.replace(/[^A-Z0-9]/ig, "");
                  }
                  if(name){
                      fileLinksLink = name
                      fileLinksLink = fileLinksLink.replace(/[^A-Z0-9]/ig, "");
                  }
                var data = {
                Bucket: BucketName,
                Key: `${req.user.estateName}/${GUID}/${fileLinksLink}`,
                Body: info,
                ContentType: 'application/pdf',
                ContentDisposition: 'inline',
                ACL: "public-read"
            }; // req.user.estateName
            bucket.putObject(data, function (err, data) {
                if (err) {
                    console.log('Error uploading data: ', err);
                } else {
                    removeFiles(req, res, GUID )
                }
            });
        }
      })
    }
    else{
        fileLinks.push(req.body.fileLinks)
          removeFiles(req, res, GUID)
    }
    function removeFiles(req, res, GUID){
      const data = req.body
      var id = data.meeting_id
      if(data.removedfiles){
                 Meeting.findOneAndUpdate({_id: id
                }, {
                  $pull: { 
                     fileLinks: data.removedfiles,
                  }
                })
                 .then(function(r, err){
                  var titleLink = ''
                  var fileLinksLink = ''
                  if(data.title){
                    titleLink = data.title.replace(/[^A-Z0-9]/ig, "");
                  }
                  if(data.removedfiles){
                    fileLinksLink = data.removedfiles.replace(/[^A-Z0-9]/ig, "");
                  }
                  let Key = `${req.user.estateName}/${GUID}/${fileLinksLink}`
                  bucket.deleteObject({
                      Bucket: BucketName,
                      Key: Key
                    }, function(err, filed){
                      if(err){
                        console.log(err, 'err remove')
                      }else{
                        console.log(filed, 'success remove')
                      }
                    })
                   save(req,res)
                    
                 })
            }
            else{
                save(req,res)
            }
    }
    function save(req, res, file){
        const data = req.body
        var id = data.meeting_id
    Meeting.findOneAndUpdate({
      _id: id
    }, {
      $set: { 
        title: data.title,
        titleChn: data.titleChn,
        meetingSummary: data.meetingSummary,
        meetingSummaryChn: data.meetingSummaryChn,
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
            const message = data.title + ' has been edited'+ ' | ' + data.titleChn + ' 内容有所更改'
                    sendNotification(message, req.user.estateName)
                    res.redirect('/allMeetings')
    
        }
    })
}
})

router.post('/editPoll', (req, res) => {
  var GUID = '' ;
    var data = req.body
    var id = req.body.id
    var fileLinks = []
    var pollFileLinks = []
    var promiseArr = []
    var promiseArr2 = []
    if(req.body.removedfiles){
        var file = req.body.removedfiles
         filearray = file.split(',')
          promiseArr.push(new Promise(function(resolve, reject){
          forEach(filearray, function(item){
            var titleLink =''
            var fileLinksLink =''
            var meeting_title = ''
                  if(req.body.meeting_title){
                    meeting_title = req.body.meeting_title.replace(/[^A-Z0-9]/ig, "");
                  }
                  if(req.body.pollName){
                    titleLink = req.body.pollName.replace(/[^A-Z0-9]/ig, "");
                  }
                  if(item){
                    fileLinksLink = item.replace(/[^A-Z0-9]/ig, "");
                   }
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
             upload(req, res)
            })
    }else{
        upload(req, res)
}  
function upload(req, res){
    if(req.files && !(_.isEmpty(req.files))){
      console.log(req.body, "req.body")
      Meeting.findOne({_id: req.body.meeting_title})
      .then(function(meeting, err){
        console.log(meeting)
           GUID = meeting.guid
          promiseArr2.push(new Promise(function(resolve, reject){
         for (var key in req.files) {
            var info = req.files[key][0].data;
            var name = req.files[key][0].name.replace(/[^A-Z0-9]/ig, "");
                      var titleLink = ''
                      var fileLinksLink = ''
                      var meeting_title =''
                      if(req.body.pollName){
                      titleLink = req.body.pollName
                      titleLink = titleLink.replace(/[^A-Z0-9]/ig, "");
                  }
                  if(req.body.meeting_title){
                    meeting_title = req.body.meeting_title.replace(/[^A-Z0-9]/ig, "");
                  }

                  if(name){
                      fileLinksLink = name
                      fileLinksLink = fileLinksLink.replace(/[^A-Z0-9]/ig, "");
                  }
            fileLinks.push(name)
            Poll.findOneAndUpdate({_id: id
                        }, {
                          $push: { 
                             fileLinks: name,
                          }
                        },{ 
                          new: true 
                        })
                        .then(function (data1, err) {
                            
            var data = {
                Bucket: BucketName,
                Key: `${req.user.estateName}/${GUID}/Poll/${fileLinksLink}`,
                Body: info,
                ContentType: 'application/pdf',
                ContentDisposition: 'inline',
                ACL: "public-read"
            }; // req.user.estateName
            bucket.putObject(data, function (err, data) {
                if (err) {
                    console.log('Error uploading data: ', err);
                } else {
                    resolve(data)
                }
            });
          })
        }     
      }))
          Promise.all(promiseArr2)
          .then(function(fi, err){
            updatePoll(req, res, fileLinks)
          })
        })
    }
    else{
        updatePoll(req, res, fileLinks)
    }
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
            const message = data.pollName + ' has been edited'+ ' | ' + data.pollNameChn + ' 投票内容有所更改'
            sendNotification(message,  req.user.estateName)
            res.redirect('/allMeetings')
            //res.json({message: 'Updated Successfully'})
        }
    })    
    }
})

router.get('/addMeeting',(req,res) => {
      Meeting.find({estate: req.user.estateName}).populate('polls').lean().then(function(meetings, err){
        const promiseArr = []
        var currentMeetings = []
        var pastMeetings = []
        if(meetings.length > 0) {
            promiseArr.push(new Promise(function(resolve, reject){
               forEach(meetings, function(item, key, a){
                if( item.fileLinks && item.fileLinks.length > 0) {
                      let fileLinks = [];
                        let Key = `${req.user.estateName.replace(/[^A-Z0-9]/ig, "")}/${item.guid}/${item.fileLinks[0].replace(/[^A-Z0-9]/ig, "")}`;
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
                        let Key = `${req.user.estateName.replace(/[^A-Z0-9]/ig, "")}/Poll/${name.replace(/[^A-Z0-9]/ig, "")}`;
                        polefileLinks.push({
                          name: name.replace(/[^A-Z0-9]/ig, ""),
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
                data[0]["estateNameDisplay"] = req.user.estateNameDisplay;
                data[0]["estateNameChn"] = req.user.estateNameChn;
                res.render('add_meeting', data[0]);
            })
        }
        else{
            res.render('add_meeting', {"estateNameDisplay": req.user.estateNameDisplay, "estateNameChn": req.user.estateNameChn});
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
            var name = files[i].name.replace(/[^A-Z0-9]/ig, "");
            //meeting.fileLinks.push(name);
            fileLinks.push(name)
            var titleLink = ''
                      var fileLinksLink = ''
                  if(req.body.meeting_title){
                      titleLink = req.body.meeting_title
                      titleLink = titleLink.replace(/[^A-Z0-9]/ig, "");
                  }
                  if(name){
                      fileLinksLink = name
                      fileLinksLink = fileLinksLink.replace(/[^A-Z0-9]/ig, "");
                  }
            var data = {
                Bucket: BucketName,
                Key:  `${req.user.estateName}/${MeetingGUID}/${fileLinksLink}`,// `${req.user.estateName}/${titleLink}/${fileLinksLink}`,
                Body: info,
                ContentType: 'application/pdf',
                ContentDisposition: 'inline',
                ACL: "public-read"
            }; // req.user.estateName
            bucket.putObject(data, function (err, data) {
                if (err) {
                    console.log('Error uploading data: ', err);
                } else {
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
    const startDate = new Date(req.body.startTime)
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
                     endTime: req.body.pollEndTime,
                     active: true,
                     voted: [],
                     finalResult: "",
                     results: [],
                     votes: [],
                    });
                poll.save()
                .then(function(poll){
                    resolve(poll._id)
                    })
                }))
            })
        Promise.all(promiseArr)
        .then(function(d){ 
            //saveMeeting(req, res, fileLinks, polls)
        var meeting = new Meeting({
                title: req.body.meeting_title,
                titleChn: req.body.meeting_title_chinese,
                meetingSummary: req.body.meetingSummary,
                meetingSummaryChn: req.body.meetingSummaryChn,
                startTime: req.body.startTime ,//meetingStartFinal,
                endTime: req.body.endTime, //meetingEndFinal,
                pollEndTime: req.body.pollEndTime,
                venue: req.body.venue,
                estate: req.user.estateName,
                fileLinks: fileLinks,
                polls: d,
                guid: MeetingGUID, 
                active: true
            });
            meeting.save(function(err, meeting){
              MeetingGUID = ''
                const message = '新會議已添加 | A New Meeting has just been added!'
                sendNotification(message,  req.user.estateName)
                res.redirect('/allMeetings')
    })
})
}
}
});
router.post('/deleteMeeting',(req,res) => {
    Meeting.deleteOne({_id: req.body.meetingId}, function (err, todo) {
        if (err) res.send(err);
        res.redirect('/allMeetings');
    });
});

router.post('/deletePoll',(req,res) => {
  
     Poll.deleteOne({_id: req.body.pollId}, function (err, todo) {
        if (err) { res.redirect('/allMeetings')}
        Meeting.findOneAndUpdate(
            { _id: req.body.meetingId },
            { $pull: { polls:  req.body.pollId} } 
        )
        .then(function(err, result){
            if (err) res.send(err);
           res.redirect('/allMeetings');
        })
    });
});


function sendNotification(message, estateName){
    Resident.find({estateName: estateName}, function(err, residents){
        var oneSignalIds = [];
        var promiseArr = [];
        forEach(residents, function(item, index){
            if(item.deviceToken != undefined && item.deviceToken != '') {
                promiseArr.push(new Promise(function(resolve, reject){
                let type = item.deviceType
                oneSignal.addDevice(item.deviceToken, type) 
                .then(function(id){
                    resolve(id)
                })
            }))
            Promise.all(promiseArr)
            .then(function(Ids, err){
                oneSignalIds = Ids
                var data = {small_icon: "ic_telos_grey_background"}
                var options = {}
                if(oneSignalIds.length){
                oneSignal.createNotification(message ,options, oneSignalIds)
                .then(function(notifiy){
                 if(notifiy){
                    return true
                 }
                 else{
                        return false
                 }
                })
            }
            })
            }
        })
})
}

router.get('/cronJob',(req,res) => {
var j = schedule.scheduleJob("*/1 * * * *", function(fireDate){
  Meeting.find().then(function(meetings, err){
        const promiseArr = []
        var currentMeetings = []
        var pastMeetings = []
        var pollMeeting_title = '';
        if(meetings.length > 0) {
            promiseArr.push(new Promise(function(resolve, reject){
               forEach(meetings, function(item, key, a){
                var firstDate = new Date(item.startTime);
                var secondDate = new Date();
                var diff = firstDate - secondDate;  
                var seconds = diff / 1000;
                var minutes = (diff / 1000) / 60;
                var hours = minutes / 60;
                 var one_day=1000*60*60*24;
                var days = (diff/one_day).toFixed();
                console.log(days, "days")
                if(days == 1){
                const message = '新會議已添加 | A Meeting is schedule tommorow!'
                sendNotification(message,  req.user.estateName)
                      console.log('This job was supposed to run at ' + fireDate + ', but actually ran at ' + new Date());
                } 
              });
             }))
          }
        })
})
})
module.exports = router;

