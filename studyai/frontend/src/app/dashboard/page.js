'use client';
import { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { analyticsAPI, aiAPI, sessionsAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

const COLORS = ['#6366F1','#8B5CF6','#10B981','#F59E0B','#F43F5E','#3B82F6'];

function StatCard({ icon, label, value, sub, color = 'indigo', trend }) {
  const colors = { indigo:'from-indigo-600/20 to-indigo-600/5 border-indigo-500/20 text-indigo-400', green:'from-emerald-600/20 to-emerald-600/5 border-emerald-500/20 text-emerald-400', amber:'from-amber-600/20 to-amber-600/5 border-amber-500/20 text-amber-400', purple:'from-purple-600/20 to-purple-600/5 border-purple-500/20 text-purple-400' };
  return (
    <div className={`card-hover p-5 bg-gradient-to-br ${colors[color]}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-slate-800/80 flex items-center justify-center text-lg">{icon}</div>
        {trend !== undefined && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${trend >= 0 ? 'bg-emerald-950/50 text-emerald-400' : 'bg-red-950/50 text-red-400'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <p className="text-xs font-semibold text-slate-400">{label}</p>
      {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function InsightCard({ insight }) {
  const styles = { positive:'border-emerald-500/20 bg-emerald-950/10', warning:'border-amber-500/20 bg-amber-950/10', tip:'border-indigo-500/20 bg-indigo-950/10', prediction:'border-purple-500/20 bg-purple-950/10' };
  return (
    <div className={`p-4 rounded-xl border ${styles[insight.type] || styles.tip} transition-all duration-200 hover:scale-[1.01]`}>
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">{insight.icon}</span>
        <div>
          <p className="text-sm font-semibold text-slate-200 mb-0.5">{insight.title}</p>
          <p className="text-xs text-slate-400 leading-relaxed">{insight.message}</p>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return <div className="card p-5"><div className="skeleton h-10 w-10 rounded-xl mb-3" /><div className="skeleton h-7 w-20 mb-2" /><div className="skeleton h-3 w-32" /></div>;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs shadow-xl">
      <p className="font-semibold text-slate-200 mb-1">{label}</p>
      {payload.map((p,i) => <p key={i} style={{color:p.color}}>{p.name}: <span className="font-bold">{p.value}</span></p>)}
    </div>
  );
};

export default function OverviewPage() {
  const { user } = useAuthStore();
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [insights, setInsights] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [loading, setLoading] = useState(true);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  useEffect(() => {
    Promise.all([
      analyticsAPI.getSummary(),
      analyticsAPI.getTrends({ weeks: 8 }),
      analyticsAPI.getSubjectBreakdown({ days: 30 }),
      sessionsAPI.getAll({ limit: 6 }),
    ]).then(([s, t, sb, sess]) => {
      setSummary(s.data.data);
      setTrends(t.data.data);
      setSubjects(sb.data.data);
      setSessions(sess.data.data);
    }).finally(() => setLoading(false));

    aiAPI.getInsights().then(r => setInsights(r.data.data.insights || [])).catch(() => setInsights([])).finally(() => setLoadingInsights(false));
  }, []);

  const d = summary || {};
  const motivations = [
    "Consistency beats perfection. Show up every day.",
    "Every expert was once a beginner. Keep going!",
    "Your future self will thank you for studying today.",
    "Small daily improvements lead to remarkable results.",
    "The best investment you can make is in yourself."
  ];
  const motivation = motivations[new Date().getDay() % motivations.length];

  return (
    <div className="max-w-7xl space-y-6">
      {/* Hero */}
      <div className="glass-card p-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">{greeting}, {user?.name?.split(' ')[0]} 👋</h2>
          <p className="text-slate-400 text-sm mt-1 italic">"{motivation}"</p>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            {d.streak?.current > 0 && <span className="badge-amber">🔥 {d.streak.current} day streak</span>}
            {d.productivityScore !== undefined && <span className={`badge ${d.productivityScore >= 70 ? 'badge-green' : d.productivityScore >= 40 ? 'badge-amber' : 'badge-red'}`}>⚡ {d.productivityScore}% productivity</span>}
            {d.gamification?.level && <span className="badge-indigo">✦ Level {d.gamification.level}</span>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-slate-500 text-xs mb-1">Today's Progress</p>
          <p className="text-3xl font-bold gradient-text">{d.today?.hours || 0}h</p>
          <p className="text-xs text-slate-500">{d.today?.sessions || 0} sessions · Goal: {user?.preferences?.dailyGoalMins ? (user.preferences.dailyGoalMins/60).toFixed(1) : 2}h</p>
          <div className="mt-2 w-32 ml-auto">
            <div className="progress-bar"><div className="progress-fill bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${Math.min(100, ((d.today?.hours || 0) / (user?.preferences?.dailyGoalMins/60 || 2)) * 100)}%` }} /></div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? Array(4).fill(0).map((_,i) => <SkeletonCard key={i} />) : <>
          <StatCard icon="📚" label="Study Hours Today" value={`${d.today?.hours || 0}h`} sub={`${d.today?.sessions || 0} sessions logged`} color="indigo" />
          <StatCard icon="🎯" label="Focus Score" value={`${d.today?.focusScore || 0}/10`} sub={`Week avg: ${d.week?.avgFocus || 0}`} color="green" />
          <StatCard icon="✓" label="Tasks Done" value={`${d.tasks?.done || 0}/${(d.tasks?.done||0)+(d.tasks?.todo||0)+(d.tasks?.inprogress||0)}`} sub={`${d.tasks?.inprogress||0} in progress`} color="amber" />
          <StatCard icon="⚡" label="XP Earned" value={`${d.gamification?.xp || 0}`} sub={`Level ${d.gamification?.level || 1}`} color="purple" />
        </>}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <p className="section-title mb-4">Weekly Study Hours</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trends}>
              <defs>
                <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis dataKey="week" tick={{fill:'#64748B',fontSize:11}} axisLine={false} tickLine={false} />
              <YAxis tick={{fill:'#64748B',fontSize:11}} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="hours" stroke="#6366F1" strokeWidth={2.5} fill="url(#colorHours)" name="Hours" dot={{fill:'#6366F1',r:3,strokeWidth:0}} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <p className="section-title mb-4">Subject Balance</p>
          <ResponsiveContainer width="100%" height={130}>
            <PieChart>
              <Pie data={subjects} dataKey="hours" nameKey="subject" cx="50%" cy="50%" outerRadius={55} innerRadius={30} paddingAngle={3}>
                {subjects.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{background:'#1E293B',border:'1px solid #334155',borderRadius:8,fontSize:11}} formatter={v=>[`${v}h`,'']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-3">
            {subjects.slice(0,4).map((s,i) => (
              <div key={s.subject} className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:COLORS[i]}} />
                <span className="text-slate-400 flex-1 truncate">{s.subject}</span>
                <span className="text-slate-500 font-medium">{s.hours}h</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Insights + Recent Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center text-xs">✦</div>
            <p className="section-title">AI Insights</p>
            {loadingInsights && <div className="w-3 h-3 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin ml-auto" />}
          </div>
          {loadingInsights ? (
            <div className="space-y-3">{Array(4).fill(0).map((_,i)=><div key={i} className="skeleton h-16 w-full rounded-xl" />)}</div>
          ) : (
            <div className="space-y-3">{insights.map((ins,i) => <InsightCard key={i} insight={ins} />)}</div>
          )}
        </div>

        <div className="card p-5">
          <p className="section-title mb-4">Recent Sessions</p>
          <div className="space-y-2">
            {sessions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">📚</p>
                <p className="text-slate-500 text-sm">No sessions yet. Start studying!</p>
              </div>
            ) : sessions.map(s => (
              <div key={s._id} className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-xl hover:bg-slate-800/60 transition-colors">
                <div className={`w-1 h-10 rounded-full flex-shrink-0 ${s.focusScore>=8?'bg-emerald-500':s.focusScore>=6?'bg-amber-500':'bg-red-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{s.subject}</p>
                  <p className="text-xs text-slate-500">{s.chapter || '—'} · {s.durationMins}m · {s.source}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold ${s.focusScore>=8?'text-emerald-400':s.focusScore>=6?'text-amber-400':'text-red-400'}`}>{s.focusScore}/10</p>
                  <p className="text-xs text-slate-600">{new Date(s.startTime).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Focus Trend */}
      <div className="card p-5">
        <p className="section-title mb-4">Focus Score Trend (8 Weeks)</p>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={trends}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
            <XAxis dataKey="week" tick={{fill:'#64748B',fontSize:11}} axisLine={false} tickLine={false} />
            <YAxis domain={[0,10]} tick={{fill:'#64748B',fontSize:11}} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="avgFocus" stroke="#10B981" strokeWidth={2.5} dot={{fill:'#10B981',r:3,strokeWidth:0}} name="Avg Focus" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
