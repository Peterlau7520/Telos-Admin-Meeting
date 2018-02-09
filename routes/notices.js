/**
 * This file serves routes for notices
 */
const express = require('express');
const forEach = require('async-foreach').forEach;
const dateFormat = require('dateformat');
const router = express.Router();
const models = require('../models/models');
var Busboy = require('busboy');
const _ = require('lodash');
const busboyBodyParser = require('busboy-body-parser');
const fs = require('fs');
var AWS = require('aws-sdk');
var Promise = require('bluebird');
var json = require('hbs-json');
var hbs = require('hbs');


hbs.registerHelper('json', json);
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
const BucketName = 'telospdf';
AWS.config.update({
  accessKeyId: process.env.AWS_accessKeyId ,
  secretAccessKey: process.env.AWS_secretAccessKey
});
const appId = "72ae436c-554c-4364-bd3e-03af71505447" //||process.env.ONESIGNAL_APPID ;
const apiKey = "YTU4NmE5OGItODM3NC00YTYwLWExNjUtMTEzOTE2YjUwOWJk" // ||process.env.ONESIGNAL_APIKEY;
const oneSignal = require('onesignal')(apiKey, appId, true);
const bucket = new AWS.S3({params: {Bucket: BucketName}});
 
//Data models
const Estate = models.Estate;
const Notice = models.Notice;
const Resident = models.Resident;
router.use(busboyBodyParser({multi: true}));


//Sort function
function compareDate(noticeA,noticeB){
    if (noticeA.postDate > noticeB.postDate)
        return -1;
    if (noticeA.postDate < noticeB.postDate)
        return 1;
    return 0;
  }

router.post('/addNotice', (req, res) => {
    if(req.body.floor_info){
        floorInfo = JSON.parse(req.body.floor_info)
    }
    const targetAudience = [];
    if(req.body.audience == 'allResidents'){
        var oneSignalIds = [];
        var deviceToken = []
            var promiseArr = [];
        //exports.uploadPdf(req, res, targetAudience);
        exports.saveNotice(req,res,targetAudience);
        //CASE OF ALL RESIDENTS USING ONESIGNAL AS AN EXAMPLE
        Resident.find({estateName: req.user.estateName}, function(err, residents){
            forEach(residents, function(item, index){
                if(item.deviceToken != undefined && item.deviceToken != '') {
                    promiseArr.push(new Promise(function(resolve, reject){
                    let type = item.deviceType;
                    console.log(type, "typetypetypetype")
                        oneSignal.addDevice(item.deviceToken, type) 
                        .then(function(id){
                        oneSignalIds.push(id)
                        deviceToken.push(item.deviceToken)
                        resolve({OnesignalId:oneSignalIds, deviceId:deviceToken})
                        })
                   }))
                }
            })
            Promise.all(promiseArr)
                .then(function(aud, err){
                    console.log(aud, "aud")
                    oneSignalIds = aud[0].OnesignalId
                    deviceToken = aud[0].deviceId
                    const noticeBody = ` ${req.user.estateNameChn} 新通告 | ${req.user.estateNameDisplay} New notice ! ` + req.body.title + ' | ' + req.body.titleChn + "\uD83D\uDC4B"
                    var message =  noticeBody;
                    sendNotification(oneSignalIds, noticeBody,deviceToken)
                })
        })

    } else {
        //CASE OF SELECTED RESIDENTS
        const audience = floorInfo.Blocks;
        for(var key in  audience){
            if(audience.hasOwnProperty(key)){
                const subAudience = { 'block': key, 'floors': audience[key]};
                targetAudience.push(subAudience);
            }
        }
        exports.saveNotice(req,res,targetAudience);

        //CASE OF SEGMENTED USERS USING ONESIGNAL AS AN EXAMPLE
        Resident.find({estateName: req.user.estateName}, function(err, residents){
            if(!residents){
                //wrong estatename
            }
            else{
                const blocks = Object.keys(audience)
                var promiseArr = [];
                var deviceToken2 = []
                 var  segmentedAudience= [];
                 console.log(residents, "residents")
                forEach(residents, function(item, index){
                    //MAKE AN ARRAY OF BLOCKS
                   if (blocks.includes(item.block)){
                    console.log("hello,")
                        const selectedFloors = audience[item.block].toString().split(',');
                        if(selectedFloors.includes(item.floor)){
                             console.log("hello,", item)
                             if(item.deviceToken != undefined && item.deviceToken != '') {
                                 console.log("hello,", item)
                                 promiseArr.push(new Promise(function(resolve, reject){
                                    console.log(item.deviceType, "device")
                                    let type = item.deviceType;
                                        oneSignal.addDevice(item.deviceToken, type) 
                                        .then(function(id){
                                            console.log('id', id)
                                        segmentedAudience.push(id)
                                        deviceToken2.push(item.deviceToken)
                                        resolve({OnesignalId:segmentedAudience, deviceId:deviceToken2})
                                        })
                                 }))
                            }
                        }
                    }
                })
                Promise.all(promiseArr)
                    .then(function(aud, err){
                        console.log(aud, "audience")
                    deviceToken2 = aud[0].deviceId
                    segmentedAudience = aud[0].OnesignalId;
                     const noticeBody = `${req.user.estateNameChn} 新通告 | ${req.user.estateNameDisplay} New notice ! ` + req.body.title + ' | ' + req.body.titleChn + "\uD83D\uDC4B"
                    sendNotification(segmentedAudience, noticeBody,deviceToken2)
                })
            }

        })
    }

});

function sendNotification(oneSignalIds, noticeBody, deviceToken){
    var promiseArr = [];
    forEach(deviceToken, function(item, index){
        if(item != undefined && item != '') {
            promiseArr.push(new Promise(function(resolve, reject){
                var note = new apn.Notification();
                note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
                note.badge = 1;
                note.sound = "ping.aiff";
                note.alert = noticeBody;
                note.payload = {};
                note.topic = "com.telostechnology.telos";
                apnProvider.send(note, item).then( (result) => {
                console.log(result, "result");
                resolve(result)
                });
            }))
        }
    })
    Promise.all(promiseArr)
        .then(function(data, err){
            if(err) return false
            var message =  noticeBody;
            var options = {android_accent_color: 'FF00FF00'} /*{message_icon: 'ic_stat_onesignal_default'}*/ //
            if(oneSignalIds.length){
            oneSignal.createNotification(message, options, oneSignalIds)
            .then(function(notify, err){
                console.log(notify, "notify", err)
             if(notify){
                return true
             }
             else{
                    return false
             }
            })

        }
            //return true
        })
}

exports.uploadPdf = function(req, res, noticeId, targetAudience){
    var files = req.files && req.files.filefield ? req.files.filefield : false;
    var fileLinks = []
    if (files && files[0].size != 0) {
        for (var i = 0; i < files.length; i++) {
            var info = files[i].data;
            const estatePath = req.user.estateName;
            var data = {
                Bucket: BucketName,
                Key: `${estatePath}/Notices/${noticeId}`,
                Body: info,
                ContentType: 'application/pdf',
                ContentDisposition: 'inline',
                ACL: "public-read"
            }; 
            bucket.putObject(data, function (err, data) {
                if (err) {
                    console.log('Error uploading data: ', err);
                } else {
                    res.redirect('/noticeBoard')

                }
            });
        }
    } else {
        res.redirect('/noticeBoard')

    }
}


exports.saveNotice = function(req, res, targetAudience){
    var files = req.files && req.files.filefield ? req.files.filefield : false;
    var fileLinks = []
    var name = files[0].name;
    fileLinks.push(name);
    var postDate = dateFormat(new Date(), 'yyyy-mm-dd HH:MM');
    var endDay = req.body.endTime.substring(0, req.body.endTime.indexOf('T'));
    var endHour = req.body.endTime.substring(req.body.endTime.indexOf('T') + 1, req.body.endTime.indexOf('T') + 9);
    var endFinal = dateFormat( endDay + " " + endHour , 'yyyy-mm-dd HH:MM');
    var notice = new Notice({
            title: req.body.title,
            titleChn: req.body.titleChn,
            endTime: endFinal,
            estate: req.user.estateName,
            targetAudience: targetAudience,
            postDate: postDate,
            fileLinks:fileLinks
        });
        notice.save(function(err, notice){
        Estate.findOne({
            _id: req.user._id
        }, function(err, estate){
            if(err){
                res.render('error')
            }
            estate.currentNotices.push(notice)
            //upload pdf
            exports.uploadPdf(req,res, notice._id, targetAudience);
        })
    })
}

router.get('/noticeBoard', (req, res) => {

  var blocksFloors = req.user.blockArray[0]
  if(!blocksFloors){
    blocksFloors = {};
  }
  Notice
  .find({estate: req.user.estateName})
  .lean()
  .then(function(notices, err) {
    if(notices.length){
    var todayDate = new Date()
    var uniqueList = _.filter(notices, function(item, key, a){   
    //CHECKING PAST NOTICES. RETURN PAST NOTICES' ID
    return (new Date(todayDate) != new Date(item.endTime) && new Date(todayDate) > new Date(item.endTime)) ? item._id : ''
       });
    var result = _.map(uniqueList, '_id');
    var uniqueList2 = _.filter(notices, function(item, key, a){   
        if(item.fileLinks.length > 0) {
              let fileLinks = [];
                let Key = `${req.user.estateName}/Notices/${item._id}`
                fileLinks.push({
                  name: item.fileLinks[0],
                  url: "https://"+BucketName+".s3.amazonaws.com/"+Key
                })
              item.fileLinks = fileLinks;
            }
    return (!(todayDate != new Date(item.endTime) && todayDate > new Date(item.endTime))) ? item._id : ''
       });
    console.log(result, "result")
      uniqueList.sort(compareDate);
      uniqueList2.sort(compareDate);
      Estate.findOneAndUpdate({_id: req.user._id},
             { $addToSet: {pastNotices: { $each: result }}}
            )
            .then(function(est) {
            res.render('notice', {
            "data": blocksFloors, 
            "notices": uniqueList2, 
            "estateNameDisplay": req.user.estateNameDisplay, "estateNameChn": req.user.estateNameChn});
            })

    }else{
            res.render('notice', {
            "data": blocksFloors, 
            "notices": uniqueList2, 
            "estateNameDisplay": req.user.estateNameDisplay,"estateNameChn": req.user.estateNameChn});
    }
  })
})

router.get('/deleteNotice', (req,res)=> {
    Notice.deleteOne({_id: req.query.id}, function (err, todo) {
          if (err) res.send(err);
          res.redirect('/noticeBoard');
      });
})
module.exports = router;
