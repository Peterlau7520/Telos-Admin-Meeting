/**
 * This file serves routes for notices
 */
const express = require('express');
const forEach = require('async-foreach').forEach;
const dateFormat = require('dateformat');
const router = express.Router();
const models = require('../models/models');
const Estate = models.Estate;
const Poll = models.Poll;
const Notice = models.Notice;
var Busboy = require('busboy');
const busboyBodyParser = require('busboy-body-parser');
const fs = require('fs');
router.use(busboyBodyParser({multi: true}));

//OneSignal
var oneSignal = require('onesignal')('NDVhODQwNTAtMDRiYy00N2FiLTg3MTYtMzVhZmRiNWRmNjZk', 'b10eb5eb-ae5d-497c-943e-9314a90bda1f', true);
router.post('/noticeBoard', (req, res) => {

    console.log(req.body);
    if(req.body.floor_info){
        floorInfo = JSON.parse(req.body.floor_info)
    }
    var postDate = dateFormat(new Date(), 'shortdate');
    var endDay = req.body.endTime.substring(0, req.body.endTime.indexOf('T'));
    var endHour = req.body.endTime.substring(req.body.endTime.indexOf('T') + 1, req.body.endTime.indexOf('T') + 9);
    var endFinal = dateFormat( endDay + " " + endHour , 'shortdate');

    // console.log('Floor',floor_info);
    console.log('Post Date',postDate);
    // console.log('End Hour',endHour);
    // console.log('End Final',endFinal);
   
  
    if(req.body.audience == 'allResidents'){
        //case of all residents
        // Residents.find(function(err, residents){
        //     var  oneSignalIds= [];
        //     forEach(residents, function(item, index){
        //         oneSignalIds.push(item.deviceToken);
        //     })
        //     console.log(oneSignalIds);
        //     var message = "New Notice! ";
        //     oneSignal.createNotification(message, oneSignalIds)
        //     .then(function(data){
        //       console.log(data);
        //     })
        // })
    }else{
        //case of selected residents
        const audience = floorInfo.Blocks;
        console.log("Audience,", audience);
        const targetAudience = [];
        for(var key in  audience)
        {
                if(audience.hasOwnProperty(key))
                {
                    const subAudience = { 'block': key, 'floors': audience[key]};
                    targetAudience.push(subAudience);
                }
        }
        // Residents.find({estateName: req.user.estate}, function(err, residents){
        //     if(!residents){
        //         //wrong estatename

        //     }
            // else{
                //const blocks = Object.keys(audience)
                // forEach(residents, function(item, index){
                //     //make an array of the blocks
                //     var  segmentedAudience= [];
                //     if (blocks.includes(item.block)){
                //         if(audience[item.block].includes(item.floor)){
                //             segmentedAudience.push(item.deviceToken)
                //         }
                //     }
                // })
                //     console.log(segmentedAudience);
                //     var message = "New Notice! ";
                //     oneSignal.createNotification(message, segmentedAudience)
                //     .then(function(data){
                //     console.log(data);
                //     })

        //     }

        // })
    }

    // console.log('TargetAudience',targetAudience)
});
router.get('/noticeBoard', (req, res) => {

    var data = {
        'Blocks': {
            'A': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
            'B': ['K', 'L', 'M'],
            'C': [1, 2, 3, 4],
            'D': [1, 2, 3, 4, 5],
            'E': [1, 2, 3, 4, 5]
        },
    }
    // Estate.findOne({
    //     estateName: req.user.estateName
    // })
    // .populate({
    //     path: 'currentNotices',
    //     options: {
    //         sort: {
    //             _id: -1
    //         }
    //     }
    // })
    // .exec(function(err, estate){
    //     if (err || !estate) {
    //         res.render('error');
    //     }
    //     const notices = estate.currentNotices;
    //     const currentNotices = []
    //     const now = dateFormat(new Date(), 'shortdate');
    //     for(var i=0; i<notices.length; i++){
    //         if (notices[i].endTime > now){
    //             estate.pastNotices.push(notices[i]);
    //         }
    //     }
    //     res.render('notice', {"data": data, notices: estate.currentNotices});
    // })
    res.render('notice', {"data": data, test: "hello"});
})
module.exports = router;


        // var files = req.files && req.files.filefield ? req.files.filefield : false;
        // if (files && files[0].size != 0) {
        //     for (var i = 0; i < files.length; i++) {
        //         var info = files[i].data;
        //         var name = files[i].name;
        //         meeting.fileLinks.push(name);
        //         var data = {
        //             Key: `${req.user.estateName}/${req.body.title}/${name}`,
        //             Body: info,
        //             ContentType: 'application/pdf',
        //             ContentDisposition: 'inline'
        //         }; // req.user.estateName
        //         s3Bucket.putObject(data, function (err, data) {
        //             if (err) {
        //                 console.log('Error uploading data: ', err);
        //             } else {
        //                 console.log('succesfully uploaded the pdf!');
        //             }
        //         });
        //     }
        // var notice = new Notice({
        //     title: req.body.title,
        //     titleChn: req.body.titleChn,
        //     endTime: endFinal,
        //     targetAudience: targetAudience
        //     postDate: postDate
        // });
        //     notice.save(function(err, notice){
        //     Estate.findOne({
        //         estateName: req.user.estateName
        //     }, function(err, estate){
        //         if(err){
        //             res.render('error')
        //         }
        //         estate.currentNotices.push(notice)
        //     })
    
        // })
        // }

