 const mongoose = require('mongoose');
// set the global Promise to Mongoose.
mongoose.Promise = global.Promise;
const connect = process.env.MONGODB_URI || "mongodb://admin:admin@ds117625.mlab.com:17625/telos";;
mongoose.connect(connect);
const Schema = mongoose.Schema;
//const bcrypt = require('bcrypt');

//RESIDENTS
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

//ESTATE
const estateSchema = new Schema({
    estateName: String,
    username: String,
    password: String,
    emailAddress: String,
    chairmanName: String,
    inviteCode: String,
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

//POLL
const pollSchema = new Schema({
    projectName: String,
    projectNameChn: String,
    pollName: String,
    pollNameChn: String,
    summary: String,
    summaryChn: String,
    fileLinks: Array,
    estateName: String,
    options: Array,
    endTime: Date,
    active: Boolean,
    voted: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Resident'
        }
    ],
    finalResult: String,
    results: [{choice: String, name: String}],
    votes: Array
});

//NOTICE
const noticeSchema = new Schema({
    title: String,
    titleChn: String,
    endTime: String,
    postDate: String,
    fileLinks: Array,
    active: Boolean,
    targetAudience: [{block: String, floors: Array}],
})

//SURVEY
const surveySchema = new Schema({
    title: String,
    titleChn: String,
    effectiveTo: Date,
    postDate: {type: Date, default: new Date()},
    targetAudience: [{block: String, floors: Array}],
})

const questionSchema = new Schema({
    questionEn: String,
    questionChn: String,
    optionIds: [{ type: Schema.ObjectId, ref: 'Options' }],
    surveyId: { type: Schema.ObjectId, ref: 'Survey' },
})

const optionSchema = new Schema({
    questionId: { type: Schema.ObjectId, ref: 'Question' },
    optionNameEn: String,
    optionNameChn: String,
    optionsEn: [],
    optionsChn: []
})

const userAnswersSchema = new Schema({
    questionId: { type: Schema.ObjectId, ref: 'Question' },
    surveyId: { type: Schema.ObjectId, ref: 'Survey' },
    optionId: { type: Schema.ObjectId, ref: 'Option' },
    userId: { type: Schema.ObjectId, ref: 'User' },
})


//MEETING SCHEMA
const meetingSchema = new Schema({
    title: String,
    titleChn: String,
    startTime: Date,
    endTime: Date,
    createdAt: {type: Date, default: new Date()},
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


const Resident = mongoose.model('Resident', residentSchema);
const Estate =   mongoose.model('Estate', estateSchema);
const Poll = mongoose.model('Poll', pollSchema);
const Notice = mongoose.model('Notice', noticeSchema);
const Survey = mongoose.model('Survey', surveySchema);
const Question = mongoose.model('Question', questionSchema);
const UserAnswers = mongoose.model('UserAnswers', userAnswersSchema)
const Options = mongoose.model('Options', optionSchema);
const Meeting = mongoose.model('Meeting', meetingSchema);

module.exports = {
    Resident,
    Estate,
    Poll,
    Notice,
    Survey,
    Question,
    UserAnswers,
    Options,
    Meeting
}
