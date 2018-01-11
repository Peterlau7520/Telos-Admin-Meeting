
const express = require('express');
const models = require('../models/models');
const Estate = models.Estate;
const Survey = models.Survey;
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
function formatStartDate(startDate) {
    var d = new Date(startDate);
    var yy = d.getFullYear();
    var mm = d.getMonth();
    mm = mm + 1;
    var dd = d.getDate();    
    if(mm < 10){
      mm = "0"+mm;
    }
    if(dd < 10){
      dd = "0"+dd;
    }
    var start =  yy + "-" + mm + "-" + dd + "T00:00:00.000Z";
    return start
  }
  function formatEndDate(endDate) {
    var d = new Date(endDate);
    var yy = d.getFullYear();
    var mm = d.getMonth();
    mm = mm + 1;
    var dd = d.getDate();    
    if(mm < 10) {
      mm = "0"+mm;
    }
    if(dd < 10) {
      dd = "0"+dd;
    }
    var end =  yy + "-" + mm + "-" + dd + "T23:59:59.000Z";
    return end
  }
function sendNotification(message){
    Resident.find({}, function(err, residents){
        var oneSignalIds = [];
        var promiseArr = [];
        forEach(residents, function(item, index){
            if(item.deviceToken != undefined && item.deviceToken != '') {
                promiseArr.push(new Promise(function(resolve, reject){
                let type = item.deviceToken.length > 40 ? 'android':'ios';
                oneSignal.addDevice(item.deviceToken, type) 
                .then(function(id){
                    resolve(id)
                })
            }))
            Promise.all(promiseArr)
            .then(function(Ids, err){
                oneSignalIds = Ids
                var data = {small_icon: "ic_telos_grey_background"}
                if(oneSignalIds.length){
                oneSignal.createNotification(message , oneSignalIds)
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

function sendNotificationForProxy(message, meeting){
    Resident.find({proxyAppointed: { $nin: meeting }}, function(err, residents){
        var oneSignalIds = [];
        var promiseArr = [];
        forEach(residents, function(item, index){
            if(item.deviceToken != undefined && item.deviceToken != '') {
                promiseArr.push(new Promise(function(resolve, reject){
                let type = item.deviceToken.length > 40 ? 'android':'ios';
                oneSignal.addDevice(item.deviceToken, type) 
                .then(function(id){
                    resolve(id)
                })
            }))
            Promise.all(promiseArr)
            .then(function(Ids, err){
                oneSignalIds = Ids
                var data = {small_icon: "ic_telos_grey_background"}
                if(oneSignalIds.length){
                oneSignal.createNotification(message , oneSignalIds)
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
                console.log(firstDate, secondDate)
                var diff = firstDate - secondDate;  
                console.log(diff, "diff")
                var seconds = diff / 1000;
                var minutes = (diff / 1000) / 60;
                var hours = minutes / 60;
                 var one_day=1000*60*60*24;
                var days = (diff/one_day).toFixed();
                console.log(days, "days")
                if(days == 1){
                const message = '新會議已添加 | A Meeting is schedule tommorow!'
                sendNotification(message)
                  console.log("hello")
                      console.log('This job was supposed to run at ' + fireDate + ', but actually ran at ' + new Date());
                } 
              });
             }))
          }
        })
})

var k = schedule.scheduleJob("*/1 * * * *", function(fireDate){
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
                console.log(firstDate, secondDate)
                var hours = Math.abs(firstDate - secondDate) / 36e5;
                console.log(hours, "diff")
                if(hours < 1){
                const message = '新會議已添加 | A Meeting is schedule tommorow!'
                sendNotification(message)
                  console.log("hello")
                      console.log('This job was supposed to run at ' + fireDate + ', but actually ran at ' + new Date());
                  }
              });
             }))
          }
        })
})

var j = schedule.scheduleJob("*/1 * * * *", function(fireDate){
  Meeting.find().then(function(meetings, err){
        const promiseArr = []
        var currentMeetings = []
        var pastMeetings = []
        var pollMeeting_title = '';
        if(meetings.length > 0) {
               forEach(meetings, function(item, key, a){
                promiseArr.push(new Promise(function(resolve, reject){
                var firstDate = new Date(item.pollEndTime);
                var secondDate = new Date();
                console.log(firstDate, secondDate)
                var diff = firstDate - secondDate;  
                console.log(diff, "diff")
                var seconds = diff / 1000;
                var minutes = (diff / 1000) / 60;
                var hours = minutes / 60;
                 var one_day=1000*60*60*24;
                var days = (diff/one_day).toFixed();
                console.log(days, "days")
                if(days == 3){
                const message = '新會議已添加 | A Meeting is schedule tommorow!'
                sendNotificationForProxy(message, item._id)
                  console.log("hello")
                      console.log('This job was supposed to run at ' + fireDate + ', but actually ran at ' + new Date());
                } 
              }))
             })
          }
        })
})
var l = schedule.scheduleJob("*/1 * * * *", function(fireDate){
   var sdate = formatStartDate(new Date())
    var edate = formatEndDate(new Date())
  Survey.find({effectiveTo: { 
        "$gte" : sdate,
        "$lte": edate
      }}).lean().then(function(Surveys, err){
      console.log(Surveys, "surveys")
        const promiseArr = []
        var currentMeetings = []
        var pastMeetings = []
        var pollMeeting_title = '';
        forEach(Surveys, function(sur, index) {
          console.log(sur, "sur")
           //promiseArr.push(new Promise(function(resolve, reject){
              /*  var todayDate = new Date()
            var now1 = moment(new Date(sur.effectiveTo));
            if(!(todayDate > sur.effectiveTo && todayDate != sur.effectiveTo)){
              console.log("dtae not expired")
              var dateSurvey = new Date(sur.effectiveTo);
              var diffMs = (dateSurvey - todayDate); // milliseconds between now & Christmas
              var diffDays = Math.floor(diffMs / 86400000); // days
              var diffHrs = Math.floor((diffMs % 86400000) / 3600000); // hours
              var diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000); 
                console.log(diffMins, "diffMins")
                    Surveys[index].effectiveTo =   now1.format("D/MM/YYYY")
            }else{
                        Surveys[index].effectiveTo =  'expired'
            }   
            var now = moment(new Date(sur.postDate));
            Surveys[index].postDate =  now.format("D/MM/YYYY");*/
          //}))
        })
    })
})
module.exports = router;
