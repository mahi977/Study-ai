const mongoose = require('mongoose');

// ── Study Session ──────────────────────────────────────────────
const studySessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject: { type: String, required: true, trim: true, index: true },
  chapter: { type: String, trim: true, default: '' },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  durationMins: { type: Number, required: true, min: 1 },
  focusScore: { type: Number, min: 1, max: 10, default: 7 },
  notes: { type: String, maxlength: 1000, default: '' },
  mood: { type: String, enum: ['great', 'good', 'neutral', 'tired', 'stressed'], default: 'neutral' },
  source: { type: String, enum: ['manual', 'pomodoro', 'timer'], default: 'manual' },
  xpEarned: { type: Number, default: 0 },
  distractions: { type: Number, default: 0 },
  tags: [String]
}, { timestamps: true });
studySessionSchema.index({ userId: 1, startTime: -1 });
studySessionSchema.index({ userId: 1, subject: 1, startTime: -1 });

// ── Task ───────────────────────────────────────────────────────
const taskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, maxlength: 1000, default: '' },
  subject: { type: String, trim: true, default: 'General' },
  priority: { type: String, enum: ['urgent', 'high', 'medium', 'low'], default: 'medium' },
  status: { type: String, enum: ['todo', 'inprogress', 'done', 'archived'], default: 'todo' },
  dueDate: Date,
  tags: [String],
  isRecurring: { type: Boolean, default: false },
  recurInterval: { type: String, enum: ['daily', 'weekly', 'monthly'] },
  completedAt: Date,
  estimatedMins: { type: Number, default: 30 }
}, { timestamps: true });
taskSchema.index({ userId: 1, status: 1, dueDate: 1 });

// ── Goal ───────────────────────────────────────────────────────
const milestoneSchema = new mongoose.Schema({
  title: { type: String, required: true },
  isCompleted: { type: Boolean, default: false },
  completedAt: Date
});
const goalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  subject: { type: String, trim: true, default: 'General' },
  description: { type: String, maxlength: 500, default: '' },
  targetDate: { type: Date, required: true },
  targetHours: { type: Number, default: 0 },
  milestones: [milestoneSchema],
  progressPercent: { type: Number, default: 0, min: 0, max: 100 },
  status: { type: String, enum: ['active', 'completed', 'abandoned'], default: 'active' },
  color: { type: String, default: '#6366F1' }
}, { timestamps: true });
goalSchema.pre('save', function(next) {
  if (this.milestones?.length > 0) {
    const done = this.milestones.filter(m => m.isCompleted).length;
    this.progressPercent = Math.round((done / this.milestones.length) * 100);
    if (this.progressPercent === 100) this.status = 'completed';
  }
  next();
});

// ── Analytics (daily pre-aggregated) ─────────────────────────
const analyticsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  totalMins: { type: Number, default: 0 },
  sessionsCount: { type: Number, default: 0 },
  avgFocusScore: { type: Number, default: 0 },
  pomodoroCount: { type: Number, default: 0 },
  tasksCompleted: { type: Number, default: 0 },
  xpEarned: { type: Number, default: 0 },
  subjectBreakdown: { type: Map, of: { mins: Number, sessions: Number, avgFocus: Number }, default: {} },
  productivityScore: { type: Number, default: 0 }
}, { timestamps: true });
analyticsSchema.index({ userId: 1, date: -1 }, { unique: true });

// ── Alert ─────────────────────────────────────────────────────
const alertSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['streak_risk', 'subject_drop', 'goal_deadline', 'focus_drop', 'inactivity', 'milestone', 'weekly_report', 'badge_earned', 'level_up'], required: true },
  severity: { type: String, enum: ['info', 'warning', 'danger', 'success'], default: 'info' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  metadata: { type: Object, default: {} }
}, { timestamps: true });
alertSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

// ── Chat History ──────────────────────────────────────────────
const chatSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true, maxlength: 5000 },
  sessionId: { type: String }
}, { timestamps: true });
chatSchema.index({ userId: 1, sessionId: 1, createdAt: -1 });

module.exports = {
  StudySession: mongoose.model('StudySession', studySessionSchema),
  Task: mongoose.model('Task', taskSchema),
  Goal: mongoose.model('Goal', goalSchema),
  Analytics: mongoose.model('Analytics', analyticsSchema),
  Alert: mongoose.model('Alert', alertSchema),
  Chat: mongoose.model('Chat', chatSchema)
};
