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

const appId = '72ae436c-554c-4364-bd3e-03af71505447';
const apiKey = 'YTU4NmE5OGItODM3NC00YTYwLWExNjUtMTEzOTE2YjUwOWJk';
const oneSignal = require('onesignal')(apiKey, appId, true);

const BucketName = 'telospdf';
AWS.config.update({
  accessKeyId: 'AKIAIMLMZLII2XCKU6UA',
  secretAccessKey: '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',
});

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
        exports.uploadPdf(req, res, targetAudience);
        //CASE OF ALL RESIDENTS USING ONESIGNAL AS AN EXAMPLE
        console.log(req.user.estateName, 'estateName')
        Resident.find({estateName: req.user.estateName}, function(err, residents){
            var oneSignalIds = [];
            var promiseArr = [];
            forEach(residents, function(item, index){
                console.log(item)
                if(item.deviceToken != undefined && item.deviceToken != '') {
                    promiseArr.push(new Promise(function(resolve, reject){
                    let type = item.deviceToken.length > 16 ? 'android':'ios';
                    console.log(item.deviceToken)
                    console.log(type+'========'+item.deviceToken.length)
                    oneSignal.addDevice(item.deviceToken, type) 
                    .then(function(id){
                        resolve(id)
                    })
                }))
                Promise.all(promiseArr)
                .then(function(data, err){
                    console.log(data, "datttttttttt")
                    oneSignalIds = data
                    sendNotification(oneSignalIds)
                })
                }
            })

            /*var msg = "Hello ! new notice"
            var message =  "hellllo"
            var data = {}
            var sendData = ''
            console.log("Onesignal ids", oneSignalIds); //the array is empty. It's an issue related to promise. 
            if(oneSignalIds.length){
            oneSignal.createNotification(message,data , oneSignalIds)
            .then(function(data){
             if(data){
                console.log('sent out successfully')
                res.json({
                    message: 'Data saved succesfully'
                })
             }
             else{
                console.log('sent out unsuccessful')
                res.render('error', {layout: 'errorLayout.hbs'})
                res.json({
                        message: 'Unsuccessful'
                    })
             }
            })
        }*/
    })

    } else {
        console.log('elseeeeeeeeeeeeeeeeeeeeeeeeeeee')
        //CASE OF SELECTED RESIDENTS
        const audience = floorInfo.Blocks;
        for(var key in  audience){
            if(audience.hasOwnProperty(key)){
                const subAudience = { 'block': key, 'floors': audience[key]};
                targetAudience.push(subAudience);
            }
        }
        exports.uploadPdf(req, res, targetAudience);

        //CASE OF SEGMENTED USERS USING ONESIGNAL AS AN EXAMPLE
        Resident.find({estateName: req.user.estateName}, function(err, residents){
            console.log(residents)
            if(!residents){
                //wrong estatename
            }
            else{
                const blocks = Object.keys(audience)
                var promiseArr = [];
                 var  segmentedAudience= [];
                forEach(residents, function(item, index){
                    //MAKE AN ARRAY OF BLOCKS
                    console.log(item, "item")
                   // if (blocks.includes(item.block)){
                        //if(audience[item.block].includes(item.floor)){
                             if(item.deviceToken != undefined && item.deviceToken != '') {
                                console.log("residents", item)
                                 promiseArr.push(new Promise(function(resolve, reject){
                                let type = item.deviceToken.length > 40 ? 'android':'ios';
                                    oneSignal.addDevice(item.deviceToken, type) 
                                    .then(function(id){
                                        console.log("id", id)
                                        resolve(id)
                                    })
                                 }))
                                 Promise.all(promiseArr)
                                .then(function(data, err){
                                    console.log(data, "datttttttttt111111")
                                    segmentedAudience = data
                                })
                            }
                        //}
                    //}
                })
                    var message = "New Notice! ";
                    var data = {}
                if(segmentedAudience.length){
                    oneSignal.createNotification(message, data,segmentedAudience)
                    .then(function(data){
                    })
                }
                else{
                    res.json({
                    message: 'Unsuccessfull'
                })
                }

            }

        })
    }

});

function sendNotification(oneSignalIds){
    var msg = "Hello ! new notice"
            var message =  "hellllo"
            var data = {}
            var sendData = ''
            console.log("Onesignal ids", oneSignalIds); //the array is empty. It's an issue related to promise. 
            if(oneSignalIds.length){
            oneSignal.createNotification(message,data , oneSignalIds)
            .then(function(data){
             if(data){
                console.log(data)
                console.log('sent out successfully')
                /*res.json({
                    message: 'Data saved succesfully'
                })*/

                return true
             }
             else{
                console.log('sent out unsuccessful')
                // res.render('error', {layout: 'errorLayout.hbs'})
                /*res.json({
                        message: 'Unsuccessful'
                    })*/
                    return false
             }
            })
        }
}

exports.uploadPdf = function(req, res, targetAudience){
    var files = req.files && req.files.filefield ? req.files.filefield : false;
    var fileLinks = []
    if (files && files[0].size != 0) {
        for (var i = 0; i < files.length; i++) {
            var info = files[i].data;
            var name = files[i].name.replace(/ /g,'');
            var title = req.body.title.replace(/ /g,'');
            fileLinks.push(name)
            const estatePath = req.user.estateName.split(" ").join("");
            var data = {
                Bucket: BucketName,
                Key: `${estatePath}/Notices/${title}/${name}`,
                Body: info,
                ContentType: 'application/pdf',
                ContentDisposition: 'inline',
                ACL: "public-read"
            }; 
            bucket.putObject(data, function (err, data) {
                if (err) {
                    console.log('Error uploading data: ', err);
                } else {
                    console.log('succesfully uploaded the pdf!!!!!!!!!!!!!!');
                    exports.saveNotice(req, res, fileLinks, targetAudience);

                }
            });
        }
    } else {
        exports.saveNotice(req, res, fileLinks, targetAudience);
    }
}


exports.saveNotice = function(req, res, fileLinks, targetAudience){
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
            //Redirecting routes.
            console.log('redirect--------------')
            res.redirect('/noticeBoard');
        })
    })
}

router.get('/noticeBoard', (req, res) => {
  var blocksFloors = {
                'Blocks': {
                    'A': ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16'],
                    'B': ['K', 'L', 'M'],
                    'C': ['1', '2', '3', '4'],
                    'D': ['1', '2', '3', '4', '5'],
                    'E': ['1', '2', '3', '4', '5']
                },
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
              const estatePath = req.user.estateName.split(" ").join("");
                let Key = `${req.user.estateName}/Notices/${item.title.replace(/ /g,'')}/${item.fileLinks[0]}`;
                fileLinks.push({
                  name: item.fileLinks[0],
                  url: "https://"+BucketName+".s3.amazonaws.com/"+Key
                })
              item.fileLinks = fileLinks;
            }
    return (!(todayDate != new Date(item.endTime) && todayDate > new Date(item.endTime))) ? item._id : ''
       });
      uniqueList.sort(compareDate);
      uniqueList2.sort(compareDate);
      Estate.findOneAndUpdate({_id: req.user._id},
             { $push: {pastNotices: result } }
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
module.exports = router;
