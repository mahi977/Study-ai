const express = require('express');
const { authenticate } = require('../middleware/auth');
const { gamificationController: gmc } = require('../controllers/otherControllers');
const r = express.Router();
r.use(authenticate);
r.get('/status', gmc.getStatus);
module.exports = r;
