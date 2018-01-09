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

//Data models
const Question = models.Question;
const Options = models.Options;
const Resident = models.Resident;
const Post = models.Post;
const Comment = models.Comment;
const PostReport = models.PostReport;
const CommentReport = models.CommentReport;

router.use(busboyBodyParser({multi: true}));

router.get('/getForum', (req, res) => {
    Post.find({
        estateName: req.user.estateName
    }).populate('comments').lean().sort({lastCommentedTime: -1})
    .then(function(posts,err){
         forEach(posts, function(post, key){
            var today = new Date();
            var posttime = new Date(post.lastCommentedTime);
            var diffMs = (posttime - today); // milliseconds between now & Christmas
            var hours = Math.abs(posttime - today) / 36e5;
            if(hours > 24){
                const time = moment(new Date(posttime))
                post.timeLeft =  time.format("DD/MM hh:mm ")
                post.timeLeftChinese = moment(new Date(posttime)).locale("de").format('DD/MM hh:mm ');
            }
            else{
               post.timeLeft = Math.round(hours) + " hours ago"
               if(post.timeLeft == 'NaN hours ago'){post.timeLeft = '0 hours ago'}
               post.timeLeftChinese = Math.round(hours) + " 几小时前"
                if(post.timeLeftChinese == 'NaN 几小时前'){post.timeLeftChinese = '0 几小时前'}
            }
            post.postTime = moment(new Date(post.postTime)).format("DD/MM/YY hh:mm ")
            const numberOfLikes = post.likedBy.length;
            post.numberOfLikes = numberOfLikes;
            post.numberOfComments = post.comments.length;

            if(post.comments){
                post.comments.sort(compareDate)
            }
            forEach(post.comments, function(comment, key){
                    var today = new Date();
                    var comTime = new Date(comment.commentedTime);
                    var hoursComment = Math.abs(comTime - today) / 36e5;
                    if(hoursComment > 24){
                        //post.timeLeftChinese = moment.lang("de").format('LLL');
                        const timeComment = moment(new Date(comTime))
                        comment.timeLeft =  timeComment.format("DD/MM hh:mm ")
                        comment.timeLeftChinese = moment(new Date(comTime)).locale("de").format('DD/MM hh:mm ');
                    }
                    else{
                       comment.timeLeft = Math.round(hoursComment) + " hours ago"
                       if(comment.timeLeft == 'NaN hours ago'){post.timeLeft = '0 hours ago'}
                       comment.timeLeftChinese = Math.round(hoursComment) + " 几小时前"
                       if(comment.timeLeftChinese == 'NaN 几小时前'){post.timeLeftChinese = '0 几小时前'}
                    }
                })
             posts.sort(sortPost)
            })
    
        req.app.io.on('connection', function(socket){
            var data = posts.length
           socket.broadcast.emit('post', {data: data})
           socket.on('post', function(data1) {
            socket.broadcast.emit('post', {data: data})
        })
        })


        /*res.io.emit("socketToMe", "users");*/
    res.render('forum', {
        forum: posts, 
        numberOfPosts: posts.length, 
        user: req.user._id, 
        layout: "layout_forum", 
        estateNameDisplay: req.user.estateNameDisplay, 
        estateNameChn: req.user.estateNameChn});
    }) 
         
})
//Sort function
function compareDate(commentA,commentB){
    if (new Date(commentA.commentedTime) > new Date(commentB.commentedTime))
        return -1;
    if (new Date(commentA.commentedTime) < new Date(commentB.commentedTime))
        return 1;
    return 0;
  }

function sortPost(postA, postB){
    if (new Date(postA.lastCommentedTime) > new Date(postB.lastCommentedTime))
        return -1;
    if (new Date(postA.lastCommentedTime) < new Date(postB.lastCommentedTime))
        return 1;
    return 0;
  }
router.get('/postsComments', function(req,res){
    const postId = req.query.postId;
    Post.find({
        estateName: req.user.estateName,
        id: postId
    })
    .populate('Comment')
    .populate('Resident')
    .then(function(err, post){
        const comments = post.comments;
            var sorted_comments = [];
            forEach(comments, function(comment){
                var newComment = {
                    id: comment.id,
                    cotent: comment.cotent,
                    commentedTime: comment.commentedTime,
                    commentedBy: comment.commentedBy.account, //get the account name
                    numberOfLikes: comment.likedBy.length,
                };
                sorted_posts.push(post);
            })
            sorted_comments.sort(compareDate);

            res.send({comments: sorted_comments});     
    })
})



router.post('/likeComment', (req,res) => {
    const commentId = req.body.commentId;
    Comment.update({_id: commentId
             }, {
               $push: { 
                  likedBy: req.user._id,
               }
             },{ 
               new: true 
             })
    .then(function(comm, err){
        res.redirect("/getForum")
        //YOUR WORK HERE
    })
})

router.post('/likePost', (req,res) => {
    const postId = req.body.postId;
    Post.update({_id: postId
             }, {
               $push: { 
                  likedBy: req.user._id,
               }
             },{ 
               new: true 
             })
    .then(function(comm, err){
        res.redirect("/getForum")
        //YOUR WORK HERE
    })
})

router.post('/newPost', (req,res)=>{
    Resident.findOne({
        estateName: req.user.estateName,
        account: "admin"
    },function(err, user){
        var userContent = req.body.content.trim()
        userContent = userContent.replace(/'/g,'');
        var post = new Post({
            content: userContent,
            account: "admin",
            postedBy: user._id,
            estateName: req.user.estateName,
            //postTime: new Date()
        });
        post.save(function(err, post){
            if(err) res.send(err);
          res.redirect("/getForum") 

        })
    })
})

router.post('/newComment', (req,res)=>{ 
    const postId = req.body.postid;
    Resident.findOne({
        estateName: req.user.estateName,
        account: "admin"
    },function(err, user){
        var userComment = req.body.comment.trim()
        userComment = userComment.replace(/'/g,'');
        new Comment({
            content: userComment,
            commentedTime: new Date(),
            commentedBy: user._id,
            account: "admin",
            estateName: req.user.estateName
        }).save(function(err, comment){
            Post.update({_id: req.body.postId
             }, {
                $set: {
                lastCommentedTime: new Date()
                },
                $push:{
                comments: comment._id
               },
               $addToSet: { 
                  commentedBy: user._id
               }
             },{ 
               new: true 
             })
            .then(function(post,err){
                if(err) res.send(err);
                req.app.io.on('connection', function(socket){
            var data = 'comment'

           socket.on('comment', function(data1) {
            socket.broadcast.emit('comment', {data: data})
        })
        })
                res.redirect("/getForum")
            })
        })
    })
})
    

router.post('/reportPost', (req,res)=> {
    const postId = req.body.postId;
    Resident.findOne({
        account: 'admin'
    }, function(err, user){
            new PostReport({
                postReport: req.body.postReport,
                reportedPost: postId,
                reportedBy: user._id
            }).save(function(err, PostReport){
                if(err) res.send(err);
               res.redirect("/getForum")
            })
    })

})
router.post('/reportComment', (req,res)=> {
    const commentId = req.body.commentId;
    Resident.findOne({
        account: 'admin'
    }, function(err, user){
            new CommentReport({
                commentReport: req.body.commentReport,
                reportedComment: commentId,
                reportedBy: user._id
            }).save(function(err, PostReport){
                 if(err) res.send(err);
               res.redirect("/getForum")
            })
    })
  })

module.exports = router