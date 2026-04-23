// ─── routes/auth.js ──────────────────────────────────────────
const express = require('express');
const { body } = require('express-validator');
const auth = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const r1 = express.Router();
r1.post('/register', [body('name').trim().notEmpty(), body('email').isEmail(), body('password').isLength({ min: 6 })], auth.register);
r1.post('/login', [body('email').isEmail(), body('password').notEmpty()], auth.login);
r1.post('/refresh', auth.refresh);
r1.get('/me', authenticate, auth.getMe);
r1.patch('/profile', authenticate, auth.updateProfile);
module.exports = r1;
