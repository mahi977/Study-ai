// sessions.js
const express = require('express');
const { authenticate } = require('../middleware/auth');
const c = require('../controllers/sessionController');
const r = express.Router();
r.use(authenticate);
r.get('/', c.getSessions);
r.post('/', c.createSession);
r.delete('/:id', c.deleteSession);
module.exports = r;
