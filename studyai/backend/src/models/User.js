const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, select: false },
  avatar: { type: String, default: '' },
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  preferences: {
    theme: { type: String, default: 'dark' },
    notifications: { type: Boolean, default: true },
    pomodoroLength: { type: Number, default: 25 },
    breakLength: { type: Number, default: 5 },
    dailyGoalMins: { type: Number, default: 120 },
    weeklyGoalHours: { type: Number, default: 20 },
    subjects: [String]
  },
  streak: {
    current: { type: Number, default: 0 },
    longest: { type: Number, default: 0 },
    lastActiveDate: Date,
    freezesLeft: { type: Number, default: 2 }
  },
  gamification: {
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    totalStudyHours: { type: Number, default: 0 },
    badges: [{
      id: String,
      name: String,
      description: String,
      icon: String,
      earnedAt: Date
    }]
  },
  refreshToken: { type: String, select: false }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash') || !this.passwordHash) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

userSchema.methods.comparePassword = function(p) { return bcrypt.compare(p, this.passwordHash); };
userSchema.methods.toJSON = function() {
  const o = this.toObject();
  delete o.passwordHash; delete o.refreshToken;
  return o;
};

module.exports = mongoose.model('User', userSchema);
