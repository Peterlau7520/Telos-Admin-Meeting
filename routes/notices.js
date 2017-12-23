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

const appId = 'ed588636-4302-4f1c-b250-ea7d9713d706';
const apiKey = 'ZTE5MDk1OWYtNGQzOS00OWE5LWFkNjctNDgwZDU2YjBkMDZi';
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


router.post('/addNotice', (req, res) => {
    console.log(req.body)
    if(req.body.floor_info){
        floorInfo = JSON.parse(req.body.floor_info)
    }
    const targetAudience = [];
    if(req.body.audience == 'allResidents'){
        exports.uploadPdf(req, res, targetAudience);
        //CASE OF ALL RESIDENTS USING ONESIGNAL AS AN EXAMPLE
        Resident.find(function(err, residents){
            var oneSignalIds = [];
            forEach(residents, function(item, index){
                if(item.deviceToken != undefined && item.deviceToken != '') {
                let type = item.deviceToken.length > 40 ? 'android':'ios';
                oneSignal.addDevice(item.deviceToken, type) 
                .then(function(id){
                oneSignalIds.push(id);
                })
            }
            })
            var msg = "Hello ! new notice"
            var message =  "hellllo"
            var data = {}
            var sendData = ''
            if(oneSignalIds.length){
            oneSignal.createNotification(message,data , oneSignalIds)
            .then(function(data){
             if(data){
                res.json({
                    message: 'Data saved succesfully'
                })
             }
             else{
                res.render('error', {layout: 'errorLayout.hbs'})
                res.json({
                        message: 'Unsuccessfull'
                    })
             }
            })
        }
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
        exports.uploadPdf(req, res, targetAudience);

        //CASE OF SEGMENTED USERS USING ONESIGNAL AS AN EXAMPLE
        Residents.find({estateName: req.user.estate}, function(err, residents){
            if(!residents){
                //wrong estatename
            }
            else{
                const blocks = Object.keys(audience)
                forEach(residents, function(item, index){
                    //MAKE AN ARRAY OF BLOCKS
                    var  segmentedAudience= [];
                    if (blocks.includes(item.block)){
                        if(audience[item.block].includes(item.floor)){
                             if(item.deviceToken != undefined && item.deviceToken != '') {
                                let type = item.deviceToken.length > 40 ? 'android':'ios';
                                oneSignal.addDevice(item.deviceToken, type) 
                                .then(function(id){
                                segmentedAudience.push(id);
                                })
                            }
                        }
                    }
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
                    console.log('succesfully uploaded the pdf!');
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
    console.log(endFinal);
    console.log(endTest);
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
            console.log(notice)
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
    return (todayDate != new Date(item.endTime) && todayDate > new Date(item.endTime)) ? item._id : ''
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

      Estate.findOneAndUpdate({_id: req.user._id},
             { $push: {pastNotices: result } }
            )
            .then(function(est) {
                console.log("esttt", est);
                console.log("user", req.user)
            res.render('notice', {"data": blocksFloors, "notices": uniqueList2, "estateNameDisplay": req.user.estateNameDisplay, "estateNameChn": req.user.estateNameChn});
            })

    }else{
            res.render('notice', {"data": blocksFloors, "notices": uniqueList2, "estateNameDisplay": req.user.estateNameDisplay,"estateNameChn": req.user.estateNameChn});
    }
  })
})
module.exports = router;
