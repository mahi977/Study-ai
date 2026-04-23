const express = require('express');
const { authenticate } = require('../middleware/auth');
const { taskController: tc, goalController: gc, alertController: ac, gamificationController: gmc } = require('../controllers/otherControllers');
const analytics = require('../controllers/analyticsController');
const ai = require('../controllers/aiController');

// Tasks
const tasks = express.Router();
tasks.use(authenticate);
tasks.get('/', tc.getAll); tasks.post('/', tc.create);
tasks.patch('/:id', tc.update); tasks.delete('/:id', tc.delete);

// Goals
const goals = express.Router();
goals.use(authenticate);
goals.get('/', gc.getAll); goals.post('/', gc.create);
goals.patch('/:id', gc.update); goals.delete('/:id', gc.delete);
goals.patch('/:id/milestones/:milestoneId', gc.toggleMilestone);

// Analytics
const analyticsRouter = express.Router();
analyticsRouter.use(authenticate);
analyticsRouter.get('/summary', analytics.getSummary);
analyticsRouter.get('/heatmap', analytics.getHeatmap);
analyticsRouter.get('/trends', analytics.getTrends);
analyticsRouter.get('/subject-breakdown', analytics.getSubjectBreakdown);
analyticsRouter.get('/optimal-time', analytics.getOptimalTime);

// Alerts
const alerts = express.Router();
alerts.use(authenticate);
alerts.get('/', ac.getAll); alerts.patch('/read-all', ac.markAllRead); alerts.delete('/:id', ac.delete);

// AI
const aiRouter = express.Router();
aiRouter.use(authenticate);
aiRouter.get('/insights', ai.getInsights);
aiRouter.post('/chat', ai.chat);
aiRouter.get('/weekly-report', ai.weeklyReport);
aiRouter.post('/timetable', ai.generateTimetable);
aiRouter.get('/chat-history', ai.getChatHistory);

// Gamification
const gamification = express.Router();
gamification.use(authenticate);
gamification.get('/status', gmc.getStatus);

module.exports = { tasks, goals, analyticsRouter, alerts, aiRouter, gamification };
