const { StudySession, Analytics, Chat } = require('../models/index');
const User = require('../models/User');

// ── AI Provider abstraction ────────────────────────────────────
async function callAI(prompt, systemPrompt = '') {
  const provider = process.env.AI_PROVIDER || 'gemini';

  if (provider === 'openai' && process.env.OPENAI_API_KEY) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt }
        ],
        max_tokens: 800,
        temperature: 0.7
      })
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  if (process.env.GEMINI_API_KEY) {
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
      }
    );
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  // Fallback: smart rule-based response
  return null;
}

// ── GET /api/ai/insights ──────────────────────────────────────
exports.getInsights = async (req, res) => {
  const userId = req.user._id;
  const now = new Date();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const [sessions, user] = await Promise.all([
    StudySession.find({ userId, startTime: { $gte: weekAgo } }),
    User.findById(userId)
  ]);

  const totalHours = +(sessions.reduce((s, x) => s + x.durationMins, 0) / 60).toFixed(1);
  const avgFocus = sessions.length ? +(sessions.reduce((s, x) => s + x.focusScore, 0) / sessions.length).toFixed(1) : 0;

  // Subject breakdown
  const subjectMap = {};
  sessions.forEach(s => {
    if (!subjectMap[s.subject]) subjectMap[s.subject] = { hours: 0, totalFocus: 0, count: 0 };
    subjectMap[s.subject].hours += s.durationMins / 60;
    subjectMap[s.subject].totalFocus += s.focusScore;
    subjectMap[s.subject].count++;
  });
  const subjects = Object.entries(subjectMap).map(([name, d]) => ({
    name, hours: +d.hours.toFixed(1), avgFocus: +(d.totalFocus / d.count).toFixed(1)
  })).sort((a, b) => b.hours - a.hours);

  // Hour analysis for optimal time
  const hourBuckets = {};
  sessions.forEach(s => {
    const h = new Date(s.startTime).getHours();
    if (!hourBuckets[h]) hourBuckets[h] = { total: 0, count: 0 };
    hourBuckets[h].total += s.focusScore; hourBuckets[h].count++;
  });
  let bestHour = null, bestScore = 0;
  Object.entries(hourBuckets).forEach(([h, d]) => {
    const avg = d.total / d.count;
    if (avg > bestScore) { bestScore = avg; bestHour = Number(h); }
  });

  const topSubject = subjects[0]?.name || 'N/A';
  const weakSubject = subjects.length > 1 ? subjects[subjects.length - 1].name : 'N/A';
  const streak = user.streak?.current || 0;

  const systemPrompt = `You are StudyAI, an expert academic coach for students. Be encouraging, data-driven, and specific. Keep each insight to 1-2 sentences.`;

  const prompt = `Analyze this student's study data and provide 4 personalized insights:

Study Data (last 7 days):
- Total hours: ${totalHours}h
- Average focus score: ${avgFocus}/10
- Current streak: ${streak} days
- Top subject: ${topSubject} (${subjects[0]?.hours || 0}h, focus ${subjects[0]?.avgFocus || 0}/10)
- Weak subject: ${weakSubject} (${subjects[subjects.length-1]?.hours || 0}h)
- Best study hour: ${bestHour !== null ? bestHour + ':00' : 'Unknown'}
- Sessions this week: ${sessions.length}

Provide exactly 4 insights as JSON array:
[
  {"type": "positive", "icon": "🌟", "title": "...", "message": "..."},
  {"type": "warning", "icon": "⚠️", "title": "...", "message": "..."},
  {"type": "tip", "icon": "💡", "title": "...", "message": "..."},
  {"type": "prediction", "icon": "🎯", "title": "...", "message": "..."}
]
Return ONLY valid JSON array, no markdown.`;

  let insights;
  try {
    const aiText = await callAI(prompt, systemPrompt);
    if (aiText) {
      const clean = aiText.replace(/```json|```/g, '').trim();
      insights = JSON.parse(clean);
    }
  } catch (e) { console.log('AI parse error, using fallback'); }

  if (!insights) {
    insights = [
      { type: 'positive', icon: '🌟', title: 'Strong Performance', message: `You studied ${totalHours}h this week with an average focus of ${avgFocus}/10. Keep up this momentum!` },
      { type: 'warning', icon: '⚠️', title: weakSubject !== 'N/A' ? `${weakSubject} Needs Attention` : 'Balance Your Subjects', message: weakSubject !== 'N/A' ? `${weakSubject} has the lowest study time this week. Consider dedicating more sessions to it.` : 'Make sure to spread study time across all subjects.' },
      { type: 'tip', icon: '💡', title: bestHour !== null ? `Peak Hour: ${bestHour}:00` : 'Build Your Peak Hours', message: bestHour !== null ? `Your focus is highest at ${bestHour}:00. Schedule your hardest topics during this time.` : 'Track more sessions to discover your peak productivity hours.' },
      { type: 'prediction', icon: '🎯', title: 'Weekly Forecast', message: `At your current pace, you will study ~${(totalHours * 4).toFixed(0)} hours this month. ${totalHours >= 20 ? 'Excellent rate!' : 'Aim for 20+ hours/week for best results.'}` }
    ];
  }

  res.json({ success: true, data: { insights, stats: { totalHours, avgFocus, streak, topSubject, weakSubject, sessions: sessions.length } } });
};

// ── POST /api/ai/chat ────────────────────────────────────────
exports.chat = async (req, res) => {
  const { message, sessionId, history = [] } = req.body;
  const userId = req.user._id;

  // Get recent context
  const [recentSessions, user] = await Promise.all([
    StudySession.find({ userId }).sort({ startTime: -1 }).limit(10),
    User.findById(userId)
  ]);

  const totalHours = +(recentSessions.reduce((s, x) => s + x.durationMins, 0) / 60).toFixed(1);
  const subjects = [...new Set(recentSessions.map(s => s.subject))];

  const systemPrompt = `You are StudyAI Coach, an intelligent AI assistant for students. You help with:
- Study strategies and techniques
- Subject-specific advice
- Time management
- Motivation and mindset
- Creating study plans

Student context:
- Name: ${user.name}
- Streak: ${user.streak?.current || 0} days
- Recent study hours (last 10 sessions): ${totalHours}h
- Subjects studied: ${subjects.join(', ') || 'None yet'}
- XP Level: ${user.gamification?.level || 1}

Be concise (max 150 words), friendly, actionable, and use emojis sparingly. Format with bullet points when listing steps.`;

  // Build conversation history for context
  const conversationHistory = history.slice(-6).map(m => `${m.role === 'user' ? 'Student' : 'StudyAI'}: ${m.content}`).join('\n');
  const fullPrompt = conversationHistory ? `${conversationHistory}\nStudent: ${message}` : message;

  let reply;
  try {
    reply = await callAI(fullPrompt, systemPrompt);
  } catch (e) { reply = null; }

  if (!reply) {
    const lowerMsg = message.toLowerCase();
    
    // More comprehensive keyword matching for better responses
    if (lowerMsg.includes('study plan') || lowerMsg.includes('schedule') || lowerMsg.includes('timetable')) {
      reply = `Here's a focused study plan for you:\n\n• **Morning (6-8 AM):** Tackle your hardest subject when fresh\n• **Mid-day (2-4 PM):** Review notes and practice problems\n• **Evening (7-9 PM):** Light revision and next-day prep\n\nKey: Use 25-min Pomodoro sessions with 5-min breaks. Your current streak of ${user.streak?.current || 0} days shows you have the discipline! 💪`;
    } else if (lowerMsg.includes('motivat') || lowerMsg.includes('focus') || lowerMsg.includes('concentrat')) {
      reply = `Staying motivated is a skill! Here's what works:\n\n• Break big goals into 25-min focused sprints\n• Celebrate small wins — every session counts\n• Your ${user.streak?.current || 0}-day streak is proof you can do it!\n• Remove distractions: phone in another room\n• Study with purpose: write down WHY before each session 🎯`;
    } else if (lowerMsg.includes('math') || lowerMsg.includes('calculus') || lowerMsg.includes('algebra')) {
      reply = `For math subjects, try this approach:\n\n• Practice problems daily, not just before exams\n• Focus on understanding concepts over memorizing formulas\n• Use spaced repetition for key theorems\n• Work through examples step-by-step\n• Join study groups for problem-solving discussions 📐`;
    } else if (lowerMsg.includes('exam') || lowerMsg.includes('test') || lowerMsg.includes('quiz')) {
      reply = `Exam preparation strategy:\n\n• Start early — don't cram the night before\n• Create summary sheets for each topic\n• Practice past papers under timed conditions\n• Focus on weak areas identified in your analytics\n• Get good sleep and eat well before the exam\n• Review mistakes to understand patterns 📝`;
    } else if (lowerMsg.includes('time') || lowerMsg.includes('manag') || lowerMsg.includes('organize')) {
      reply = `Time management tips:\n\n• Use the Eisenhower Matrix: urgent/important prioritization\n• Block study time in your calendar like appointments\n• Set specific goals for each study session\n• Take regular breaks to maintain focus\n• Track your time to identify productivity patterns\n• Your best study hour appears to be ${bestHour !== null ? bestHour + ':00' : 'unknown yet'} ⏰`;
    } else if (lowerMsg.includes('subject') || lowerMsg.includes('topic') || lowerMsg.includes('chapter')) {
      reply = `Subject-specific study tips:\n\n• Break complex topics into smaller, manageable chunks\n• Use active recall: test yourself without looking at notes\n• Make mind maps to connect concepts\n• Teach the material to someone else (or imagine doing so)\n• Review regularly using spaced repetition\n• Focus on understanding over memorization 📚`;
    } else if (lowerMsg.includes('stress') || lowerMsg.includes('anxiety') || lowerMsg.includes('overwhelm')) {
      reply = `Managing study stress:\n\n• Take deep breaths and short breaks when feeling overwhelmed\n• Break tasks into smaller, achievable steps\n• Celebrate progress, not perfection\n• Get adequate sleep and exercise\n• Talk to friends, family, or a counselor if needed\n• Remember: consistent effort beats occasional intensity 🧘`;
    } else if (lowerMsg.includes('goal') || lowerMsg.includes('target') || lowerMsg.includes('achieve')) {
      reply = `Setting and achieving goals:\n\n• Make goals SMART: Specific, Measurable, Achievable, Relevant, Time-bound\n• Break big goals into daily actionable steps\n• Track progress regularly in your dashboard\n• Adjust plans based on what works for you\n• Reward yourself for milestones reached\n• Your current streak shows great momentum! 🎯`;
    } else {
      // More personalized generic response
      const responses = [
        `Great question! Based on your study data, I'd recommend focusing on consistent practice. You've studied ${totalHours}h recently with subjects like ${subjects.join(', ') || 'various topics'}. What specific area can I help you with?`,
        `As your AI study coach, I see you've been working on ${subjects.join(', ') || 'multiple subjects'} with a ${user.streak?.current || 0}-day streak. For better results, try active recall techniques and regular review. What challenge are you facing?`,
        `I notice your focus score trends and study patterns. To improve, consider studying during your peak hours and using the Pomodoro technique. You've got this! What would you like to work on today?`,
        `Based on your progress (${totalHours}h studied), you're building good habits. Remember: quality over quantity, and regular breaks prevent burnout. How can I assist with your current studies?`,
        `Your study analytics show ${subjects.length || 'good'} subject variety. Try connecting concepts across subjects for deeper understanding. What topic needs your attention right now?`
      ];
      reply = responses[Math.floor(Math.random() * responses.length)];
    }
  }

  // Save to history
  await Chat.insertMany([
    { userId, role: 'user', content: message, sessionId: sessionId || 'default' },
    { userId, role: 'assistant', content: reply, sessionId: sessionId || 'default' }
  ]);

  res.json({ success: true, data: { reply, sessionId: sessionId || 'default' } });
};

// ── POST /api/ai/weekly-report ────────────────────────────────
exports.weeklyReport = async (req, res) => {
  const userId = req.user._id;
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [sessions, user] = await Promise.all([
    StudySession.find({ userId, startTime: { $gte: weekAgo } }),
    User.findById(userId)
  ]);

  const totalHours = +(sessions.reduce((s, x) => s + x.durationMins, 0) / 60).toFixed(1);
  const avgFocus = sessions.length ? +(sessions.reduce((s, x) => s + x.focusScore, 0) / sessions.length).toFixed(1) : 0;
  const subjectMap = {};
  sessions.forEach(s => {
    if (!subjectMap[s.subject]) subjectMap[s.subject] = 0;
    subjectMap[s.subject] += s.durationMins / 60;
  });
  const topSubject = Object.keys(subjectMap).sort((a, b) => subjectMap[b] - subjectMap[a])[0] || 'None';
  const weakSubject = Object.keys(subjectMap).sort((a, b) => subjectMap[a] - subjectMap[b])[0] || 'None';

  const prompt = `Write a 180-word weekly study performance report for ${user.name} in the tone of an encouraging academic mentor.

Data:
- Total hours: ${totalHours}h (target: ${user.preferences?.weeklyGoalHours || 20}h)
- Avg focus: ${avgFocus}/10
- Sessions: ${sessions.length}
- Streak: ${user.streak?.current || 0} days
- Top subject: ${topSubject}
- Needs improvement: ${weakSubject}
- XP Level: ${user.gamification?.level || 1}

Structure: 3 short paragraphs — (1) Performance highlights, (2) Areas needing attention, (3) Specific action items for next week. Be specific, warm, and motivating.`;

  let reportText;
  try {
    reportText = await callAI(prompt);
  } catch (e) { reportText = null; }

  if (!reportText) {
    const achieved = totalHours >= (user.preferences?.weeklyGoalHours || 20);
    reportText = `${user.name}, ${achieved ? `outstanding effort this week!` : `great effort this week!`} You dedicated ${totalHours} hours to studying with an average focus score of ${avgFocus}/10. ${topSubject !== 'None' ? `Your strongest performance was in ${topSubject}, showing real commitment to mastering that subject.` : 'Keep building your study consistency.'}

${weakSubject !== 'None' && weakSubject !== topSubject ? `${weakSubject} needs more dedicated time — it received the least attention this week. Consistent, even if short, daily sessions will compound significantly over time.` : 'Keep balancing your subjects well to avoid gaps in your preparation.'} Your ${user.streak?.current || 0}-day streak is a powerful foundation.

For next week: Aim for at least ${Math.max(totalHours + 2, user.preferences?.weeklyGoalHours || 20)} total hours, schedule daily ${weakSubject !== 'None' ? weakSubject : 'revision'} sessions of 45+ minutes, and maintain your Pomodoro discipline. You have what it takes — stay consistent! 🚀`;
  }

  res.json({
    success: true,
    data: {
      reportText,
      stats: { totalHours, avgFocus, sessions: sessions.length, topSubject, weakSubject, streak: user.streak?.current || 0 }
    }
  });
};

// ── POST /api/ai/timetable ────────────────────────────────────
exports.generateTimetable = async (req, res) => {
  const { subjects, availableHours, examDate, weakSubjects = [] } = req.body;
  const userId = req.user._id;

  const recentSessions = await StudySession.find({ userId }).sort({ startTime: -1 }).limit(30);
  const subjectPerf = {};
  recentSessions.forEach(s => {
    if (!subjectPerf[s.subject]) subjectPerf[s.subject] = { totalFocus: 0, count: 0 };
    subjectPerf[s.subject].totalFocus += s.focusScore;
    subjectPerf[s.subject].count++;
  });

  const prompt = `Create a detailed 7-day study timetable as JSON for a student.

Student info:
- Subjects: ${subjects?.join(', ') || 'Mathematics, Physics, Chemistry, English'}
- Daily available hours: ${availableHours || 4}
- Exam date: ${examDate || '30 days away'}
- Weak subjects (need more time): ${weakSubjects.join(', ') || 'None specified'}
- Recent avg focus: ${Object.keys(subjectPerf).length ? Object.values(subjectPerf).map(p => (p.totalFocus/p.count).toFixed(1)).join(', ') : 'No data'}

Return ONLY a JSON object like this (no markdown):
{
  "schedule": [
    {
      "day": "Monday",
      "slots": [
        {"time": "7:00 AM - 8:30 AM", "subject": "Mathematics", "topic": "Calculus Practice", "priority": "high", "technique": "Pomodoro x3"},
        {"time": "9:00 AM - 10:00 AM", "subject": "Physics", "topic": "Wave Optics", "priority": "medium", "technique": "Active Recall"}
      ]
    }
  ],
  "tips": ["tip1", "tip2", "tip3"]
}`;

  let timetable;
  try {
    const aiText = await callAI(prompt);
    if (aiText) {
      const clean = aiText.replace(/```json|```/g, '').trim();
      timetable = JSON.parse(clean);
    }
  } catch (e) { timetable = null; }

  if (!timetable) {
    const subjectList = subjects || ['Mathematics', 'Physics', 'Chemistry', 'English'];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    timetable = {
      schedule: days.map((day, i) => ({
        day,
        slots: [
          { time: '7:00 AM - 8:30 AM', subject: subjectList[i % subjectList.length], topic: 'Core Concepts', priority: 'high', technique: 'Pomodoro x3' },
          { time: '4:00 PM - 5:30 PM', subject: subjectList[(i + 1) % subjectList.length], topic: 'Practice Problems', priority: 'medium', technique: 'Active Recall' },
          ...(day !== 'Sunday' ? [{ time: '8:00 PM - 9:00 PM', subject: weakSubjects[0] || subjectList[0], topic: 'Revision', priority: 'low', technique: 'Spaced Repetition' }] : [])
        ]
      })),
      tips: ['Start with your hardest subject when energy is highest', 'Take a 10-minute break every 50 minutes', 'Review previous day\'s notes before starting new topics']
    };
  }

  res.json({ success: true, data: timetable });
};

// ── GET /api/ai/chat-history ──────────────────────────────────
exports.getChatHistory = async (req, res) => {
  const messages = await Chat.find({ userId: req.user._id, sessionId: req.query.sessionId || 'default' })
    .sort({ createdAt: 1 }).limit(50);
  res.json({ success: true, data: messages });
};
