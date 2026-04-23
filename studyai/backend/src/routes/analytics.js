// analytics.js
const express = require('express');
const { authenticate } = require('../middleware/auth');
const c = require('../controllers/analyticsController');
const r = express.Router();
r.use(authenticate);
r.get('/summary', c.getSummary); r.get('/heatmap', c.getHeatmap);
r.get('/trends', c.getTrends); r.get('/subject-breakdown', c.getSubjectBreakdown);
r.get('/optimal-time', c.getOptimalTime);
module.exports = r;
