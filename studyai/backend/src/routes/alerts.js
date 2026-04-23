// alerts.js
const express = require('express');
const { authenticate } = require('../middleware/auth');
const { alertController: ac } = require('../controllers/otherControllers');
const r = express.Router();
r.use(authenticate);
r.get('/', ac.getAll);
r.patch('/read-all', ac.markAllRead);
r.delete('/:id', ac.delete);
module.exports = r;
