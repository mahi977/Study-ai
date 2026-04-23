const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

// Demo user for when DB is not available
const demoUser = {
  _id: 'demo-user-id',
  name: 'Demo User',
  email: 'demo@studyai.com',
  avatar: '',
  preferences: { theme: 'dark', notifications: true }
};

const sign = (id) => ({
  accessToken: jwt.sign({ id }, process.env.JWT_SECRET || 'demo-secret', { expiresIn: process.env.JWT_EXPIRE || '15m' }),
  refreshToken: jwt.sign({ id }, process.env.JWT_REFRESH_SECRET || 'demo-refresh-secret', { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' })
});

exports.register = async (req, res) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) return res.status(400).json({ success: false, errors: errs.array() });
  const { name, email, password } = req.body;
  
  try {
    if (await User.findOne({ email })) return res.status(409).json({ success: false, message: 'Email already registered' });
    const user = await User.create({ name, email, passwordHash: password });
    const tokens = sign(user._id);
    await User.findByIdAndUpdate(user._id, { refreshToken: tokens.refreshToken });
    res.status(201).json({ success: true, ...tokens, user });
  } catch (dbError) {
    // Fallback for demo mode when DB is not available
    if (email === 'demo@studyai.com' && password === 'demo123') {
      const tokens = sign(demoUser._id);
      res.status(201).json({ success: true, ...tokens, user: demoUser });
    } else {
      res.status(500).json({ success: false, message: 'Database not available. Use demo@studyai.com / demo123' });
    }
  }
};

exports.login = async (req, res) => {
  const errs = validationResult(req);
  if (!errs.isEmpty()) return res.status(400).json({ success: false, errors: errs.array() });
  const { email, password } = req.body;
  
  try {
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const tokens = sign(user._id);
    await User.findByIdAndUpdate(user._id, { refreshToken: tokens.refreshToken });
    res.json({ success: true, ...tokens, user });
  } catch (dbError) {
    // Fallback for demo mode when DB is not available
    if (email === 'demo@studyai.com' && password === 'demo123') {
      const tokens = sign(demoUser._id);
      res.json({ success: true, ...tokens, user: demoUser });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials. Use demo@studyai.com / demo123' });
    }
  }
};

exports.refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh token required' });
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken)
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    const tokens = sign(user._id);
    await User.findByIdAndUpdate(user._id, { refreshToken: tokens.refreshToken });
    res.json({ success: true, ...tokens });
  } catch { res.status(401).json({ success: false, message: 'Expired, please login again' }); }
};

exports.getMe = (req, res) => res.json({ success: true, user: req.user });

exports.updateProfile = async (req, res) => {
  const allowed = ['name', 'preferences', 'avatar'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true });
  res.json({ success: true, user });
};
