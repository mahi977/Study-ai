const jwt = require('jsonwebtoken');
const User = require('../models/User');

const demoUser = {
  _id: 'demo-user-id',
  name: 'Demo User',
  email: 'demo@studyai.com',
  avatar: '',
  preferences: { theme: 'dark', notifications: true }
};

const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'demo-secret');
    
    try {
      const user = await User.findById(decoded.id);
      if (!user) return res.status(401).json({ success: false, message: 'User not found' });
      req.user = user;
    } catch (dbError) {
      // Fallback for demo mode
      if (decoded.id === 'demo-user-id') {
        req.user = demoUser;
      } else {
        return res.status(401).json({ success: false, message: 'User not found' });
      }
    }
    
    next();
  } catch (err) {
    const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
    res.status(401).json({ success: false, message: err.message, code });
  }
};

module.exports = { authenticate };
