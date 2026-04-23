const cron = require('node-cron');
const User = require('../models/User');
const { StudySession, Alert } = require('../models/index');

function startCronJobs() {
  console.log('⏰ Cron jobs started');

  // Every day 8 PM — streak risk check
  cron.schedule('0 20 * * *', async () => {
    try {
      const today = new Date(); today.setHours(0,0,0,0);
      const users = await User.find({ 'streak.current': { $gt: 0 } }).select('_id streak');
      for (const user of users) {
        const session = await StudySession.findOne({ userId: user._id, startTime: { $gte: today } });
        if (!session) {
          const exists = await Alert.findOne({ userId: user._id, type: 'streak_risk', createdAt: { $gte: today } });
          if (!exists) await Alert.create({ userId: user._id, type: 'streak_risk', severity: 'danger', title: `🔥 ${user.streak.current}-day streak at risk!`, message: "You haven't studied today. Log a session before midnight!" });
        }
      }
    } catch (e) { console.error('[CRON] streak:', e.message); }
  });

  // Every Monday 6 AM — subject drop detection
  cron.schedule('0 6 * * 1', async () => {
    try {
      const now = new Date();
      const thisWeek = new Date(now - 7*86400000);
      const lastWeek = new Date(now - 14*86400000);
      const users = await User.find({}).select('_id');
      for (const user of users) {
        const [tw, lw] = await Promise.all([
          StudySession.aggregate([{ $match: { userId: user._id, startTime: { $gte: thisWeek } } }, { $group: { _id: '$subject', mins: { $sum: '$durationMins' } } }]),
          StudySession.aggregate([{ $match: { userId: user._id, startTime: { $gte: lastWeek, $lt: thisWeek } } }, { $group: { _id: '$subject', mins: { $sum: '$durationMins' } } }])
        ]);
        const lwMap = Object.fromEntries(lw.map(s => [s._id, s.mins]));
        const twMap = Object.fromEntries(tw.map(s => [s._id, s.mins]));
        for (const [subj, lastMins] of Object.entries(lwMap)) {
          const thisMins = twMap[subj] || 0;
          if (lastMins > 30 && thisMins < lastMins * 0.7) {
            const drop = Math.round((1 - thisMins/lastMins)*100);
            await Alert.create({ userId: user._id, type: 'subject_drop', severity: 'warning', title: `${subj} dropped ${drop}%`, message: `Your ${subj} study time fell by ${drop}% this week. Time to catch up!`, metadata: { subject: subj, dropPct: drop } });
          }
        }
      }
    } catch (e) { console.error('[CRON] subject drop:', e.message); }
  });

  // Daily midnight — inactivity check (3+ days)
  cron.schedule('5 0 * * *', async () => {
    try {
      const threeDaysAgo = new Date(Date.now() - 3*86400000);
      const users = await User.find({}).select('_id');
      for (const user of users) {
        const last = await StudySession.findOne({ userId: user._id }).sort({ startTime: -1 });
        if (last && last.startTime < threeDaysAgo) {
          const exists = await Alert.findOne({ userId: user._id, type: 'inactivity', createdAt: { $gte: threeDaysAgo } });
          if (!exists) await Alert.create({ userId: user._id, type: 'inactivity', severity: 'warning', title: '3 days without studying!', message: "It's been 3+ days. Even 20 minutes today will rebuild your momentum!" });
        }
      }
    } catch (e) { console.error('[CRON] inactivity:', e.message); }
  });
}

module.exports = { startCronJobs };
