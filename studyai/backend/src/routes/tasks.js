// tasks.js
const express = require('express');
const { authenticate } = require('../middleware/auth');
const { taskController: tc } = require('../controllers/otherControllers');
const r = express.Router();
r.use(authenticate);
r.get('/', tc.getAll); r.post('/', tc.create);
r.patch('/:id', tc.update); r.delete('/:id', tc.delete);
module.exports = r;
