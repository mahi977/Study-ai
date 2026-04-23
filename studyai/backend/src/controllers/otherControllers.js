const { Task, Goal, Alert } = require('../models/index');
const User = require('../models/User');

// ── Task Controller ───────────────────────────────────────────
const taskController = {
  create: async (req, res) => { const t = await Task.create({ ...req.body, userId: req.user._id }); res.status(201).json({ success: true, data: t }); },
  getAll: async (req, res) => { const { status, subject, priority } = req.query; const f = { userId: req.user._id }; if (status) f.status = status; if (subject) f.subject = { $regex: subject, $options: 'i' }; if (priority) f.priority = priority; const tasks = await Task.find(f).sort({ dueDate: 1, priority: 1, createdAt: -1 }); res.json({ success: true, data: tasks }); },
  update: async (req, res) => { if (req.body.status === 'done' && !req.body.completedAt) req.body.completedAt = new Date(); const t = await Task.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, req.body, { new: true }); if (!t) return res.status(404).json({ success: false, message: 'Task not found' }); res.json({ success: true, data: t }); },
  delete: async (req, res) => { await Task.findOneAndDelete({ _id: req.params.id, userId: req.user._id }); res.json({ success: true }); }
};

// ── Goal Controller ───────────────────────────────────────────
const goalController = {
  create: async (req, res) => { const g = await Goal.create({ ...req.body, userId: req.user._id }); res.status(201).json({ success: true, data: g }); },
  getAll: async (req, res) => { const { status = 'active' } = req.query; const f = { userId: req.user._id }; if (status !== 'all') f.status = status; const goals = await Goal.find(f).sort({ targetDate: 1 }); res.json({ success: true, data: goals }); },
  update: async (req, res) => { const g = await Goal.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, req.body, { new: true, runValidators: true }); if (!g) return res.status(404).json({ success: false, message: 'Goal not found' }); res.json({ success: true, data: g }); },
  toggleMilestone: async (req, res) => {
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id });
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });
    const m = goal.milestones.id(req.params.milestoneId);
    if (!m) return res.status(404).json({ success: false, message: 'Milestone not found' });
    m.isCompleted = !m.isCompleted; m.completedAt = m.isCompleted ? new Date() : undefined;
    await goal.save(); res.json({ success: true, data: goal });
  },
  delete: async (req, res) => { await Goal.findOneAndDelete({ _id: req.params.id, userId: req.user._id }); res.json({ success: true }); }
};

// ── Alert Controller ─────────────────────────────────────────
const alertController = {
  getAll: async (req, res) => { const alerts = await Alert.find({ userId: req.user._id, isRead: false }).sort({ createdAt: -1 }).limit(25); res.json({ success: true, data: alerts }); },
  markAllRead: async (req, res) => { await Alert.updateMany({ userId: req.user._id }, { isRead: true }); res.json({ success: true }); },
  delete: async (req, res) => { await Alert.findOneAndDelete({ _id: req.params.id, userId: req.user._id }); res.json({ success: true }); }
};

// ── Gamification Controller ──────────────────────────────────
const gamificationController = {
  getStatus: async (req, res) => {
    const user = await User.findById(req.user._id).select('gamification streak');
    const BADGES = [
      { id: 'first_session', name: 'First Step', icon: '🌱', description: 'Log your first study session' },
      { id: 'week_streak', name: 'Week Warrior', icon: '🔥', description: '7-day streak' },
      { id: '50_hours', name: 'Centurion', icon: '💪', description: 'Study 50 total hours' },
      { id: 'focus_master', name: 'Focus Master', icon: '🎯', description: 'Achieve 9+ focus score 10 times' },
      { id: 'month_streak', name: 'Iron Discipline', icon: '⚡', description: '30-day streak' },
      { id: '100_hours', name: 'Scholar', icon: '📚', description: 'Study 100 total hours' },
      { id: 'level_5', name: 'Level 5', icon: '🏆', description: 'Reach Level 5' },
      { id: 'level_10', name: 'Elite Studier', icon: '👑', description: 'Reach Level 10' },
    ];
    const earned = user.gamification?.badges?.map(b => b.id) || [];
    const xpToNextLevel = 500 - (user.gamification?.xp || 0) % 500;
    res.json({ success: true, data: { ...user.gamification?.toObject?.() || user.gamification, xpToNextLevel, badges: BADGES.map(b => ({ ...b, earned: earned.includes(b.id), earnedAt: user.gamification?.badges?.find(x => x.id === b.id)?.earnedAt })) } });
  }
};

module.exports = { taskController, goalController, alertController, gamificationController };
