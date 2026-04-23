const { StudySession, Analytics, Task, Alert } = require('../models/index');
const User = require('../models/User');

const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate()-n); d.setHours(0,0,0,0); return d; };

// ── Summary (dashboard KPIs) ──────────────────────────────────
exports.getSummary = async (req, res) => {
  const uid = req.user._id;
  const todayStart = startOfDay(new Date());
  const weekStart = daysAgo(7);

  const [today, week, tasks, goals, user] = await Promise.all([
    Analytics.findOne({ userId: uid, date: todayStart }),
    Analytics.aggregate([
      { $match: { userId: uid, date: { $gte: weekStart } } },
      { $group: { _id: null, totalMins: { $sum: '$totalMins' }, avgFocus: { $avg: '$avgFocusScore' }, sessions: { $sum: '$sessionsCount' }, xp: { $sum: '$xpEarned' } } }
    ]),
    Task.aggregate([{ $match: { userId: uid } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    require('../models/index').Goal.find({ userId: uid, status: 'active' }).select('progressPercent subject'),
    User.findById(uid).select('streak gamification preferences')
  ]);

  const tm = tasks.reduce((a, t) => { a[t._id] = t.count; return a; }, {});
  const avgGoal = goals.length ? Math.round(goals.reduce((s, g) => s + g.progressPercent, 0) / goals.length) : 0;

  // Productivity score (0-100)
  const w = week[0] || {};
  const prodScore = Math.min(100, Math.round(
    ((w.totalMins || 0) / (user?.preferences?.weeklyGoalHours * 60 || 1200)) * 40 +
    ((w.avgFocus || 0) / 10) * 35 +
    (Math.min(user?.streak?.current || 0, 14) / 14) * 25
  ));

  res.json({ success: true, data: {
    today: { hours: today ? +(today.totalMins/60).toFixed(1) : 0, sessions: today?.sessionsCount || 0, focusScore: today?.avgFocusScore || 0, xp: today?.xpEarned || 0 },
    week: { hours: w.totalMins ? +(w.totalMins/60).toFixed(1) : 0, avgFocus: +(w.avgFocus||0).toFixed(1), sessions: w.sessions||0 },
    tasks: { done: tm.done||0, todo: tm.todo||0, inprogress: tm.inprogress||0 },
    streak: user?.streak || { current: 0, longest: 0 },
    gamification: user?.gamification || { xp: 0, level: 1, badges: [] },
    avgGoalProgress: avgGoal,
    productivityScore: prodScore
  }});
};

exports.getHeatmap = async (req, res) => {
  const { subject, year = new Date().getFullYear() } = req.query;
  const filter = { userId: req.user._id, startTime: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) } };
  if (subject) filter.subject = { $regex: subject, $options: 'i' };
  const data = await StudySession.aggregate([
    { $match: filter },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$startTime' } }, totalMins: { $sum: '$durationMins' }, avgFocus: { $avg: '$focusScore' }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  res.json({ success: true, data });
};

exports.getTrends = async (req, res) => {
  const { weeks = 8 } = req.query;
  const data = await Analytics.aggregate([
    { $match: { userId: req.user._id, date: { $gte: daysAgo(weeks * 7) } } },
    { $group: { _id: { $isoWeek: '$date' }, year: { $first: { $isoWeekYear: '$date' } }, totalMins: { $sum: '$totalMins' }, avgFocus: { $avg: '$avgFocusScore' }, sessions: { $sum: '$sessionsCount' }, days: { $sum: 1 }, xp: { $sum: '$xpEarned' } } },
    { $sort: { year: 1, _id: 1 } }
  ]);
  res.json({ success: true, data: data.map(d => ({ week: `W${d._id}`, hours: +(d.totalMins/60).toFixed(1), avgFocus: +d.avgFocus.toFixed(1), sessions: d.sessions, activeDays: d.days, xp: d.xp })) });
};

exports.getSubjectBreakdown = async (req, res) => {
  const { days = 30 } = req.query;
  const data = await StudySession.aggregate([
    { $match: { userId: req.user._id, startTime: { $gte: daysAgo(days) } } },
    { $group: { _id: '$subject', totalMins: { $sum: '$durationMins' }, avgFocus: { $avg: '$focusScore' }, sessions: { $sum: 1 } } },
    { $sort: { totalMins: -1 } }
  ]);
  res.json({ success: true, data: data.map(d => ({ subject: d._id, hours: +(d.totalMins/60).toFixed(1), avgFocus: +d.avgFocus.toFixed(1), sessions: d.sessions })) });
};

exports.getOptimalTime = async (req, res) => {
  const data = await StudySession.aggregate([
    { $match: { userId: req.user._id, startTime: { $gte: daysAgo(30) } } },
    { $group: { _id: { $hour: '$startTime' }, avgFocus: { $avg: '$focusScore' }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  const map = {};
  data.forEach(d => { map[d._id] = { avgFocus: +d.avgFocus.toFixed(1), count: d.count }; });
  const result = Array.from({ length: 24 }, (_, h) => ({ hour: h, label: h < 12 ? `${h||12}${h<12?'AM':'PM'}` : `${h===12?12:h-12}PM`, avgFocus: map[h]?.avgFocus||0, sessions: map[h]?.count||0 }));
  const best = result.reduce((a, b) => b.avgFocus > a.avgFocus ? b : a, result[0]);
  res.json({ success: true, data: result, optimalHour: best });
};
