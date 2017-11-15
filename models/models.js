 const mongoose = require('mongoose');
// set the global Promise to Mongoose.
mongoose.Promise = global.Promise;
const connect = process.env.MONGODB_URI || "mongodb://upwork:upwork@ds117625.mlab.com:17625/telos";
mongoose.connect(connect,{ useMongoClient: true });

const Schema = mongoose.Schema;
const bcrypt = require('bcrypt');

const residentSchema = new Schema({
    name: String,
    email: String,
    account: String,
    password: String,
    polls: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Polls'
        }
    ],
    surveys: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Survey'
        }
    ],
    estateName: String,
    unit: String,
    block: String,
    floor: String,
    owner: Boolean
});

const estateSchema = new Schema({
    estateName: String,
    username: String,
    password: String,
    emailAddress: String,
    chairmanName: String,
    inviteCode: String,
    currentPolls: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Poll'
        }
    ],
    pastPolls: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Poll'
        }
    ],
    surveys: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Survey'
        }
    ],
    currentMeetings: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Meeting'
        }
    ],
    pastMeetings: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Meeting'
        }
    ],
    currentNotices: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Notice'
        }
    ],
    pastNotices: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Notice'
        }
    ]
});

const pollsSchema = new Schema({
    projectName: String,
    projectNameChn: String,
    pollName: String,
    pollNameChn: String,
    summary: String,
    summaryChn: String,
    fileLinks: Array,
    estateName: String,
    options: Array,
    endTime: String,
    active: Boolean,
    voted: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Resident'
        }
    ],
    results: [{choice: String, name: String}],
    votes: Array
});

const noticeSchema = new Schema({
    title: String,
    titleChn: String,
    endTime: String,
    postDate: String,
    fileLinks: Array,
    active: Boolean,
    targetAudience: [{block: String, floors: Array}],
})


const surveySchema = new Schema({
})

//Need to change the structure of Estate Schema REGARDING POLLS
const meetingSchema = new Schema({
    title: String,
    titleChn: String,
    startTime: String,
    endTime: String,
    venue: String,
    fileLinks: Array,
    polls: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Poll'
        }
    ],
    active: Boolean
})

residentSchema.pre('save', function (next) {

    var user = this;
    var SALT_FACTOR = 5;

    if (!user.isModified('password')) {
        return next();
    }

    bcrypt
        .genSalt(SALT_FACTOR, function (err, salt) {

            if (err) {
                return next(err);
            }

            bcrypt
                .hash(user.password, salt, null, function (err, hash) {

                    if (err) {
                        return next(err);
                    }

                    user.password = hash;
                    next();

                });

        });

});

residentSchema.methods.comparePassword = function (passwordAttempt, cb) {

    bcrypt
        .compare(passwordAttempt, this.password, function (err, isMatch) {

            if (err) {
                return cb(err);
            } else {
                cb(null, isMatch);
            }
        });

}


const Resident = mongoose.model('Resident', residentSchema);
const Estate = mongoose.model('Estate', estateSchema);
const Poll = mongoose.model('Poll', pollsSchema);
const Notice = mongoose.model('Notice', noticeSchema);
const Survey = mongoose.model('Survey', surveySchema);
const Meeting = mongoose.model('Meeting', meetingSchema);

module.exports = {
    Resident,
    Estate,
    Poll,
    Notice,
    Survey,
    Meeting
}
