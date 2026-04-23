const express = require('express');
const { authenticate } = require('../middleware/auth');
const { goalController: gc } = require('../controllers/otherControllers');
const r = express.Router();
r.use(authenticate);
r.get('/', gc.getAll); r.post('/', gc.create);
r.patch('/:id', gc.update); r.delete('/:id', gc.delete);
r.patch('/:id/milestones/:milestoneId', gc.toggleMilestone);
module.exports = r;
