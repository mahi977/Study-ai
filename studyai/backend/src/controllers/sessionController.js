// ─── sessionController.js ────────────────────────────────────
const { StudySession, Analytics, Alert } = require('../models/index');
const User = require('../models/User');

const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };

async function updateAnalytics(userId, date) {
  const d = startOfDay(date);
  const end = new Date(d.getTime() + 86400000);
  const sessions = await StudySession.find({ userId, startTime: { $gte: d, $lt: end } });
  if (!sessions.length) return;
  const totalMins = sessions.reduce((s, x) => s + x.durationMins, 0);
  const avgFocusScore = sessions.reduce((s, x) => s + x.focusScore, 0) / sessions.length;
  const sub = {};
  sessions.forEach(s => {
    if (!sub[s.subject]) sub[s.subject] = { mins: 0, sessions: 0, totalFocus: 0 };
    sub[s.subject].mins += s.durationMins;
    sub[s.subject].sessions++;
    sub[s.subject].totalFocus += s.focusScore;
  });
  Object.keys(sub).forEach(k => { sub[k].avgFocus = +(sub[k].totalFocus / sub[k].sessions).toFixed(2); delete sub[k].totalFocus; });
  const prodScore = Math.min(100, Math.round((totalMins / 120) * 40 + (avgFocusScore / 10) * 60));
  await Analytics.findOneAndUpdate({ userId, date: d }, { $set: { totalMins, sessionsCount: sessions.length, avgFocusScore: +avgFocusScore.toFixed(2), subjectBreakdown: sub, productivityScore: prodScore } }, { upsert: true, new: true });
}

async function updateStreak(userId) {
  const user = await User.findById(userId);
  if (!user) return;
  const today = startOfDay(new Date());
  const yesterday = new Date(today.getTime() - 86400000);
  const last = user.streak.lastActiveDate ? startOfDay(user.streak.lastActiveDate) : null;
  if (last && last.getTime() === today.getTime()) return;
  let cur = user.streak.current;
  if (last && last.getTime() === yesterday.getTime()) cur++;
  else { if (cur > 1) { await Alert.create({ userId, type: 'streak_risk', severity: 'warning', title: 'Streak broken!', message: `Your ${cur}-day streak ended. Start fresh today!` }); } cur = 1; }
  const longest = Math.max(cur, user.streak.longest || 0);
  await User.findByIdAndUpdate(userId, { 'streak.current': cur, 'streak.longest': longest, 'streak.lastActiveDate': today });
  if ([7, 14, 30, 60, 100].includes(cur)) {
    await Alert.create({ userId, type: 'milestone', severity: 'success', title: `🔥 ${cur}-Day Streak!`, message: `You've maintained a ${cur}-day study streak. Incredible discipline!` });
  }
}

async function awardXP(userId, xp, reason) {
  const user = await User.findById(userId);
  if (!user) return;
  const newXP = (user.gamification?.xp || 0) + xp;
  const newLevel = Math.floor(newXP / 500) + 1;
  const leveledUp = newLevel > (user.gamification?.level || 1);
  await User.findByIdAndUpdate(userId, { 'gamification.xp': newXP, 'gamification.level': newLevel, 'gamification.totalStudyHours': (user.gamification?.totalStudyHours || 0) + (reason === 'session' ? xp / 10 : 0) });
  if (leveledUp) await Alert.create({ userId, type: 'level_up', severity: 'success', title: `Level ${newLevel} Achieved!`, message: `You've reached Level ${newLevel}! Keep studying to unlock more achievements.` });
}

exports.createSession = async (req, res) => {
  const { subject, chapter, startTime, endTime, focusScore, notes, mood, source, tags, distractions } = req.body;
  const start = new Date(startTime), end = new Date(endTime);
  const durationMins = Math.round((end - start) / 60000);
  if (durationMins < 1) return res.status(400).json({ success: false, message: 'Duration must be at least 1 minute' });
  const xpEarned = Math.round(durationMins * 0.5 * (focusScore / 10) * 2);
  const session = await StudySession.create({ userId: req.user._id, subject, chapter, startTime: start, endTime: end, durationMins, focusScore, notes, mood, source: source || 'manual', tags, distractions: distractions || 0, xpEarned });
  Promise.all([updateAnalytics(req.user._id, start), updateStreak(req.user._id), awardXP(req.user._id, xpEarned, 'session')]).catch(console.error);
  req.app.get('io').to(req.user._id.toString()).emit('session:new', session);
  res.status(201).json({ success: true, data: session });
};

exports.getSessions = async (req, res) => {
  const { subject, from, to, limit = 20, page = 1 } = req.query;
  const filter = { userId: req.user._id };
  if (subject) filter.subject = { $regex: subject, $options: 'i' };
  if (from || to) { filter.startTime = {}; if (from) filter.startTime.$gte = new Date(from); if (to) filter.startTime.$lte = new Date(to); }
  const skip = (Number(page)-1) * Number(limit);
  const [sessions, total] = await Promise.all([StudySession.find(filter).sort({ startTime: -1 }).skip(skip).limit(Number(limit)), StudySession.countDocuments(filter)]);
  res.json({ success: true, data: sessions, total, page: Number(page), pages: Math.ceil(total/limit) });
};

exports.deleteSession = async (req, res) => {
  await StudySession.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  res.json({ success: true, message: 'Session deleted' });
};

module.exports = exports;
