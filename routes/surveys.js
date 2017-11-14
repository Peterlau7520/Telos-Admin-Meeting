/**
 * This file serves routes for surveys
 */
const express = require('express');
const router = express.Router();
const models = require('../models/models');
const Estate = models.Estate;
const Poll = models.Poll;
const Survey = models.Survey;
var Busboy = require('busboy');
const busboyBodyParser = require('busboy-body-parser');
const fs = require('fs');
router.use(busboyBodyParser({multi: true}));



module.exports = router;