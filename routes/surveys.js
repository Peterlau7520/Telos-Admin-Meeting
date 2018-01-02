/**
 * This file serves routes for notices
 */
const express = require('express');
const forEach = require('async-foreach').forEach;
const dateFormat = require('dateformat');
const router = express.Router();
const models = require('../models/models');
var Busboy = require('busboy');
const busboyBodyParser = require('busboy-body-parser');
const fs = require('fs');
const _ = require('lodash');
var moment = require("moment");
var Promise = require('bluebird');


const appId = '72ae436c-554c-4364-bd3e-03af71505447';
const apiKey = 'YTU4NmE5OGItODM3NC00YTYwLWExNjUtMTEzOTE2YjUwOWJk';
const oneSignal = require('onesignal')(apiKey, appId, true);


//Data models
const Estate = models.Estate;
const Survey = models.Survey;
const Question = models.Question;
const UserAnswers = models.UserAnswers;
const Options = models.Options;
const Resident = models.Resident;
router.use(busboyBodyParser({multi: true}));


router.post('/addSurvey', (req, res) => { 
    if(req.body.floor_info){
        floorInfo = JSON.parse(req.body.floor_info)
    }
    var targetAudience = []
    if(req.body.audience == 'allResidents'){
        saveSurvey(req, res, targetAudience);
        Resident.find({estateName: req.user.estateName}, function(err, residents){
            var oneSignalIds = [];
            var promiseArr = [];
            forEach(residents, function(item, index){
                if(item.deviceToken != undefined && item.deviceToken != '') {
                    promiseArr.push(new Promise(function(resolve, reject){
                    let type = item.deviceToken.length > 40 ? 'android':'ios';
                    console.log(item.deviceToken)
                    console.log(type+'========'+item.deviceToken.length)
                    oneSignal.addDevice(item.deviceToken, type) 
                    .then(function(id){
                        resolve(id)
                    })
                }))
                Promise.all(promiseArr)
                .then(function(data, err){
                    console.log(data, "data")
                    oneSignalIds = data
                    const messageBody = 'New survey! ' + req.body.title + ' | ' + req.body.titleChn
                    sendNotification(oneSignalIds, messageBody)
                })
                }
            })
    })

    }
    else{
        //CASE OF SELECTED RESIDENTS
        const audience = floorInfo.Blocks;
        
        for(var key in  audience){
            if(audience.hasOwnProperty(key)){
                const subAudience = { 'block': key, 'floors': audience[key]};
                targetAudience.push(subAudience);
            }
        }
        saveSurvey(req, res, targetAudience)
         //CASE OF SEGMENTED USERS USING ONESIGNAL AS AN EXAMPLE
         Resident.find({estateName: req.user.estateName}, function(err, residents){
            if(!residents){
                //wrong estatename
            }
            else{
                const blocks = Object.keys(audience)
                var promiseArr = [];
                 var  segmentedAudience= [];
                forEach(residents, function(item, index){
                    //MAKE AN ARRAY OF BLOCKS
                   if (blocks.includes(item.block)){
                        const selectedFloors = audience[item.block].toString().split(',');
                        if(selectedFloors.includes(item.floor)){
                             if(item.deviceToken != undefined && item.deviceToken != '') {
                                 promiseArr.push(new Promise(function(resolve, reject){
                                let type = item.deviceToken.length > 40 ? 'android':'ios';
                                    oneSignal.addDevice(item.deviceToken, type) 
                                    .then(function(id){
                                        resolve(id)
                                    })
                                 }))
                                Promise.all(promiseArr)
                                .then(function(data, err){
                                    segmentedAudience = data;
                                    const messageBody = 'New survey! ' + req.body.title + ' | ' + req.body.titleChn
                                    sendNotification(segmentedAudience, messageBody)
                                })
                            }
                        }
                    }
                })
            }

        })
    }

function saveSurvey(req, res, targetAudience){
    console.log(req.body.questions)
    const options = []
    var endDay = req.body.endTime.substring(0, req.body.endTime.indexOf('T'));
    var endHour = req.body.endTime.substring(req.body.endTime.indexOf('T') + 1, req.body.endTime.indexOf('T') + 9);
    var endFinal = dateFormat( endDay + " " + endHour , 'shortDate');
    var survey = new Survey({
            title: req.body.title,
            titleChn: req.body.titleChn,
            effectiveTo: endFinal,
            targetAudience: targetAudience,
            estate: req.user.estateName,
        });
    survey.save()
    .then(function(survey){
    if(survey){
        const questions = req.body.questions
        var order = 0
        if(questions.length >0){
             let j = -1
                var fetchquestion = function() {
                j++
                if(j < questions.length) {
            forEach(questions, function(question){
                console.log(question, "question", j)
            var que = new Question({
                questionEn: question.questionEng,
                questionChn: question.questionChn,
                surveyId: survey._id,
                order: order
            });
            order++;
            que.save()
            .then(function(q){
                console.log(q)
                if(question.options.length  > 0){
                    let i = -1
                    var fetch = function() {
                     i++
                        if(i < question.options.length) {
                            forEach(question.options, function(values){
                            var option = new Options({
                            questionId: q._id,
                            optionNameEn: values.optionNameEng,
                            optionNameChn: values.optionNameChn,
                            optionsEn: values.optionChn,
                            optionsChn: values.optionEng
                            })
                            option.save()
                                .then(function(option){
                                    if(option){
                                   Question.update(
                                    { _id:  q._id},
                                    { $push: { optionIds:  option._id } }
                                    )
                                    .then(function(ques, err) {
                                        if(err){
                                        res.send(err);
                                        }
                                        res.redirect('/getSurveys')
                                    })
                                }
                                else{
                                    res.redirect('/getSurveys')
                                }
                                })
                            })
                        }
                    }
                }
                fetch()           
                 })
        })
        }
        }  
    }
    fetchquestion()
    }
        else{
         res.redirect('/login')
        }
    })
    }
});

function sendNotification(oneSignalIds, messageBody){
    var message =  messageBody;
    var data = {}
    if(oneSignalIds.length){
    oneSignal.createNotification(message , data, oneSignalIds)
    .then(function(data){
     if(data){
        console.log('sent out successfully')
        return true
     }
     else{
        console.log('sent out unsuccessful')
            return false
     }
    })
}
}

router.get('/getSurveys', (req, res) => {
    const promiseArr =[]
    const promiseArr2 = []
  var blocksFloors = req.user.blockArray[0]
  Survey.find({estate: req.user.estateName}).lean()
  .then(function(survey, err) {
    if(survey.length){
        var todayDate = new Date()
        promiseArr.push(new Promise(function(resolve, reject){
        _.forEach(survey, function(surv, index) {
            var finalQuestions = []
        Question.find({surveyId: surv._id}).populate('optionIds').lean().sort( { order: 1 } )
            .then(function(que, err){
            surv.question = que
            _.forEach(que, function(q, index1) {
                UserAnswers.find({surveyId : surv._id, questionId: q._id })
                .then(function(user, err){
                    console.log("queque", q)
                    Question.update(
                        { _id:  q._id},
                        { $set: { userAnswered:  user.length} }
                        )
                        .then(function(ques, err) {
                         if(err){
                         res.send(err);
                        }
                        if(q.optionIds.length  > 0){
                            let i = -1
                    var fetch = function() {
                     i++
                      if(i < q.optionIds.length) {
                 _.forEach(q.optionIds, function(option, index2) {
                UserAnswers.find({surveyId : surv._id, optionId: option._id ,questionId: option.questionId })
                .then(function(data, err) {
                    Options.update(
                        { _id:  option._id},
                        { $set: { totalUsersAnswered:  data.length} }
                        )
                        .then(function(option, err) {
                         if(err){
                         res.send(err);
                        }
                        if(option){
                             console.log("option", option)
                    resolve(survey)
                }
                })
                })
                })
             }
            }
            }
            fetch()   
            })     
        });
        })
        })
        })
        }))
        var list = ''
        Promise.all(promiseArr)
        .then(function(data, err){
            console.log("*************************************")
            list = data[0]
        
            _.forEach(data[0], function(sur, index) {
            var currentDate = moment(new Date());
            currentDate = currentDate.format("D/MM/YYYY");
            var now1 = moment(new Date(sur.effectiveTo));
            if(!(todayDate > sur.effectiveTo && todayDate != sur.effectiveTo)){
                    list[index].effectiveTo =   now1.format("D/MM/YYYY")
         }else{
                        list[index].effectiveTo =  'expired'
         }   
            var now = moment(new Date(sur.postDate));
            list[index].postDate =  now.format("D/MM/YYYY");
        })
        var uniqueList = _.filter(survey, function(item, key, a){ 
         Question
        .find({surveyId: item._id}).populate('optionIds')
            .then(function(que, err){
            item.question = que
        })  
            return (todayDate != item.effectiveTo && todayDate > item.effectiveTo) ? item._id : ''
        });
        var result = _.map(uniqueList, '_id');
        Estate.findOneAndUpdate({_id: req.user._id}, {$set: {surveys: result }})
        .then(function(est) {
            res.render('survey', {"data": blocksFloors, 'surveys': list, "estateNameDisplay": req.user.estateNameDisplay, "estateNameChn": req.user.estateNameChn});
        })
    })
    }
    else{
        res.render('survey', {"data": blocksFloors, 'surveys': list, "estateNameDisplay": req.user.estateNameDisplay, "estateNameChn": req.user.estateNameChn});
    }
    })
    })

module.exports = router;