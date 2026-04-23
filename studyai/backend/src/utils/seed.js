require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { StudySession, Task, Goal, Analytics } = require('../models/index');

const SUBJECTS = ['Physics', 'Mathematics', 'Chemistry', 'English', 'Computer Science'];
const CHAPTERS = {
  Physics: ['Optics','Mechanics','Thermodynamics','Modern Physics','Electrostatics'],
  Mathematics: ['Calculus','Algebra','Trigonometry','Statistics','Probability'],
  Chemistry: ['Organic Chemistry','Inorganic Chemistry','Physical Chemistry','Electrochemistry'],
  English: ['Essay Writing','Grammar','Comprehension','Literature'],
  'Computer Science': ['Data Structures','Algorithms','DBMS','Networks','OS']
};

function rand(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
function daysAgo(n){ const d=new Date(); d.setDate(d.getDate()-n); return d; }

async function seed(){
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ MongoDB connected');
  await User.deleteMany({ email: 'demo@studyai.com' });

  const user = await User.create({
    name: 'Arjun Sharma', email: 'demo@studyai.com', passwordHash: 'demo123',
    streak: { current: 14, longest: 21, lastActiveDate: new Date() },
    gamification: { xp: 3420, level: 7, totalStudyHours: 112, badges: [
      { id:'first_session', name:'First Step', icon:'🌱', description:'Logged first session', earnedAt: daysAgo(40) },
      { id:'week_streak', name:'Week Warrior', icon:'🔥', description:'7-day streak', earnedAt: daysAgo(14) },
      { id:'50_hours', name:'Scholar', icon:'📚', description:'50 total hours', earnedAt: daysAgo(10) }
    ]},
    preferences: { dailyGoalMins: 120, weeklyGoalHours: 20, subjects: SUBJECTS }
  });
  console.log('👤 Demo user: demo@studyai.com / demo123');

  // 45 days of sessions
  const sessions = [];
  for(let day=45; day>=0; day--){
    if([38,25,17,10,4].includes(day)) continue;
    const n = rand(1,3);
    for(let s=0;s<n;s++){
      const subj = SUBJECTS[rand(0,SUBJECTS.length-1)];
      const chapters = CHAPTERS[subj];
      const hour = [7,8,9,10,14,15,16,19,20,21][rand(0,9)];
      const start = daysAgo(day); start.setHours(hour, rand(0,30), 0, 0);
      const dur = rand(25,90);
      const end = new Date(start.getTime()+dur*60000);
      sessions.push({ userId:user._id, subject:subj, chapter:chapters[rand(0,chapters.length-1)], startTime:start, endTime:end, durationMins:dur, focusScore:rand(5,10), mood:['great','good','neutral','tired'][rand(0,3)], source: Math.random()>0.6?'pomodoro':'manual', xpEarned: Math.round(dur*0.5*rand(6,10)/10*2) });
    }
  }
  await StudySession.insertMany(sessions);
  console.log(`📚 ${sessions.length} sessions created`);

  // Analytics aggregation
  const dayMap = {};
  sessions.forEach(s => {
    const key = s.startTime.toISOString().split('T')[0];
    if(!dayMap[key]) dayMap[key] = [];
    dayMap[key].push(s);
  });
  const analyticsArr = Object.entries(dayMap).map(([dateStr, ss]) => {
    const date = new Date(dateStr); date.setHours(0,0,0,0);
    const totalMins = ss.reduce((a,x)=>a+x.durationMins,0);
    const avgFocusScore = ss.reduce((a,x)=>a+x.focusScore,0)/ss.length;
    const sub = {};
    ss.forEach(s => { if(!sub[s.subject]) sub[s.subject]={mins:0,sessions:0,totalFocus:0}; sub[s.subject].mins+=s.durationMins; sub[s.subject].sessions++; sub[s.subject].totalFocus+=s.focusScore; });
    Object.keys(sub).forEach(k => { sub[k].avgFocus=+(sub[k].totalFocus/sub[k].sessions).toFixed(2); delete sub[k].totalFocus; });
    return { userId:user._id, date, totalMins, sessionsCount:ss.length, avgFocusScore:+avgFocusScore.toFixed(2), subjectBreakdown:sub, productivityScore:Math.min(100,Math.round((totalMins/120)*40+(avgFocusScore/10)*60)), xpEarned: ss.reduce((a,x)=>a+(x.xpEarned||0),0) };
  });
  await Analytics.insertMany(analyticsArr);
  console.log(`📊 Analytics for ${analyticsArr.length} days`);

  await Task.insertMany([
    { userId:user._id, title:'Solve 20 integration problems', subject:'Mathematics', priority:'high', status:'todo', dueDate: daysAgo(-1), estimatedMins:60 },
    { userId:user._id, title:'Revise Organic Chemistry Ch 5', subject:'Chemistry', priority:'high', status:'todo', dueDate: daysAgo(-2), estimatedMins:45 },
    { userId:user._id, title:'Write essay on Climate Change', subject:'English', priority:'medium', status:'inprogress', dueDate: daysAgo(-3), estimatedMins:90 },
    { userId:user._id, title:'Physics numericals Ch 4', subject:'Physics', priority:'high', status:'inprogress', dueDate: daysAgo(0), estimatedMins:50 },
    { userId:user._id, title:'DSA - Binary Trees practice', subject:'Computer Science', priority:'medium', status:'todo', dueDate: daysAgo(-5), estimatedMins:75 },
    { userId:user._id, title:'Maths Mock Test #3', subject:'Mathematics', priority:'medium', status:'done', completedAt: daysAgo(1) },
    { userId:user._id, title:'Physics theory Ch 1-3', subject:'Physics', priority:'medium', status:'done', completedAt: daysAgo(2) },
    { userId:user._id, title:'English grammar exercises', subject:'English', priority:'low', status:'done', completedAt: daysAgo(3) },
  ]);
  console.log('✅ Tasks created');

  await Goal.create({ userId:user._id, title:'JEE Mathematics Mastery', subject:'Mathematics', targetDate: daysAgo(-30), color:'#6366F1', targetHours:80,
    milestones:[{title:'Calculus',isCompleted:true,completedAt:daysAgo(20)},{title:'Algebra',isCompleted:true,completedAt:daysAgo(15)},{title:'Trigonometry',isCompleted:true,completedAt:daysAgo(10)},{title:'Coordinate Geometry',isCompleted:true,completedAt:daysAgo(5)},{title:'Statistics',isCompleted:false},{title:'Probability',isCompleted:false}]
  });
  await Goal.create({ userId:user._id, title:'Physics Full Syllabus', subject:'Physics', targetDate: daysAgo(-25), color:'#10B981', targetHours:60,
    milestones:[{title:'Mechanics',isCompleted:true,completedAt:daysAgo(30)},{title:'Thermodynamics',isCompleted:true,completedAt:daysAgo(22)},{title:'Optics',isCompleted:true,completedAt:daysAgo(12)},{title:'Electrostatics',isCompleted:false},{title:'Magnetism',isCompleted:false},{title:'Modern Physics',isCompleted:false}]
  });
  await Goal.create({ userId:user._id, title:'Chemistry Organic', subject:'Chemistry', targetDate: daysAgo(-15), color:'#F59E0B', targetHours:40,
    milestones:[{title:'Hydrocarbons',isCompleted:true,completedAt:daysAgo(25)},{title:'Alcohols & Ethers',isCompleted:true,completedAt:daysAgo(18)},{title:'Aldehydes & Ketones',isCompleted:false},{title:'Amines',isCompleted:false},{title:'Polymers',isCompleted:false}]
  });
  console.log('🎯 Goals created');
  console.log('\n🎉 Seed complete!\n━━━━━━━━━━━━━━━━━━━━\nEmail   : demo@studyai.com\nPassword: demo123\n━━━━━━━━━━━━━━━━━━━━');
  process.exit(0);
}
seed().catch(e=>{ console.error(e); process.exit(1); });
