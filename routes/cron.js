
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
var apn = require('apn');
var options = {
    token: {
      key: process.env.apnKey ,//"apns/AuthKey_4M22X8PPJQ.p8",
      keyId: process.env.apnKeyId ,//"4M22X8PPJQ",
      teamId: process.env.apnTeamId //"8BP9RPB8ZB"
    },
    production: true
  };
var apnProvider = new apn.Provider(options);

var AWS = require('aws-sdk');
const async = require('async');
let docFileName,pathParams,dataFile;
const BucketName = 'telospdf';
AWS.config.update({
  accessKeyId: process.env.AWS_accessKeyId ,
  secretAccessKey: process.env.AWS_secretAccessKey
});
const bucket = new AWS.S3({params: {Bucket: BucketName}});


const appId = process.env.ONESIGNAL_APPID;
const apiKey = process.env.ONESIGNAL_APIKEY;
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
                var note = new apn.Notification();
                note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
                note.badge = 1;
                note.sound = "ping.aiff";
                note.alert = message;
                note.payload = {};
                note.topic = "com.telostechnology.telos";
                apnProvider.send(note, item.deviceToken).then( (result) => {
                console.log(result, "result");
                //resolve(result)
                });
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
                .then(function(notifiy, err){
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
                var note = new apn.Notification();
                note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
                note.badge = 1;
                note.sound = "ping.aiff";
                note.alert = message;
                note.payload = {};
                note.topic = "com.telostechnology.telos";
                apnProvider.send(note, item.deviceToken).then( (result) => {
                console.log(result, "result");
                //resolve(result)
                });
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
                oneSignal.createNotification(message , options,oneSignalIds)
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
var j = schedule.scheduleJob("00 15 6 * * *", function(fireDate){
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
                if(days == 1){
                const message = ` 大會將於明天 ` + item.startTime+  `進行 | Our `+ item.title +` will start at tomorrow `+ item.startTime+ `.`
                sendNotification(message)
                //console.log('This job was supposed to run at ' + fireDate + ', but actually ran at ' + new Date());
                } 
              });
             }))
          }
        })
})

var k = schedule.scheduleJob("*/1 * * * *", function(fireDate){
  console.log("working")
  Meeting.find({NotificationStatus: false}).then(function(meetings, err){
        const promiseArr = []
        var currentMeetings = []
        var pastMeetings = []
        var pollMeeting_title = '';
        console.log("meetings", meetings)
        if(meetings.length > 0) {
               forEach(meetings, function(item, key, a){
                promiseArr.push(new Promise(function(resolve, reject){
                console.log(item, "item")
                var firstDate = new Date(item.startTime);
                var secondDate = new Date();
                var hours = Math.abs(firstDate - secondDate) / 36e5;
                console.log(hours, "hours")
                if(hours < 1){
                  Meeting.findOneAndUpdate({_id: item._id},{
                  $set: {
                    NotificationStatus: true
                  }
                }).then(function(mee, err){
                  console.log(mee, "mee")
                const message = ` 大會將於一小時後進行 | `+ item.title+ ` will start one hour later.`
                sendNotification(message)
                      console.log('This job was supposed to run at ' + fireDate + ', but actually ran at ' + new Date());
                    })
                  }
             }))
           });

          }
        })
})

var l = schedule.scheduleJob("00 15 6 * * *", function(fireDate){
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
                var diff = firstDate - secondDate;  
                var seconds = diff / 1000;
                var minutes = (diff / 1000) / 60;
                var hours = minutes / 60;
                 var one_day=1000*60*60*24;
                var days = (diff/one_day).toFixed();
                if(days == 3){
                const message = `有關 “ ` + item.title+ ` ” 將於 3 日后截止，請記得投票 | The poll deadline of ` +  item.title + `is 3 days after, please remember to vote, Thanks! `
                sendNotificationForProxy(message, item._id)
                      //console.log('This job was supposed to run at ' + fireDate + ', but actually ran at ' + new Date());
                } 
              }))
             })
          }
        })
})
var m = schedule.scheduleJob("*/1 * * * *", function(fireDate){
   var sdate = formatStartDate(new Date())
    var edate = formatEndDate(new Date())
  Survey.find({effectiveTo: { 
        "$gte" : sdate,
        "$lte": edate
      }}).lean().then(function(Surveys, err){
        const promiseArr = []
        var currentMeetings = []
        var pastMeetings = []
        var pollMeeting_title = '';
        if(Surveys.length !=0){
        forEach(Surveys, function(sur, index) {
          const message = ` `+ sur.title+ `的問卷結果已公佈，請查看 | `+sur.title+ `'s results are available, please check ! `
          sendNotification(message)
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
    }
    })
})
module.exports = router;
