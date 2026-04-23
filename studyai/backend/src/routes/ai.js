// ai.js
const express = require('express');
const { authenticate } = require('../middleware/auth');
const ai = require('../controllers/aiController');
const r = express.Router();
r.use(authenticate);
r.get('/insights', ai.getInsights);
r.post('/chat', ai.chat);
r.get('/weekly-report', ai.weeklyReport);
r.post('/timetable', ai.generateTimetable);
r.get('/chat-history', ai.getChatHistory);
module.exports = r;
