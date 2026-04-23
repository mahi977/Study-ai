'use client';
import { useEffect, useState } from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { aiAPI } from '@/lib/api';

export default function ReportPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh=false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try { const r = await aiAPI.getWeeklyReport(); setReport(r.data.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center animate-pulse-soft"><span>✦</span></div>
      <p className="text-slate-500 text-sm">Generating your AI mentor report...</p>
    </div>
  );

  const { reportText, stats } = report || {};
  const perfScore = Math.min(100, Math.round(((stats?.totalHours||0)/20)*40 + ((stats?.avgFocus||0)/10)*40 + (Math.min(stats?.streak||0,14)/14)*20));
  const perfLevel = perfScore>=80?{l:'Excellent',c:'text-emerald-400',bg:'from-emerald-600/20 to-emerald-600/5'}:perfScore>=60?{l:'Good',c:'text-indigo-400',bg:'from-indigo-600/20 to-indigo-600/5'}:perfScore>=40?{l:'Average',c:'text-amber-400',bg:'from-amber-600/20 to-amber-600/5'}:{l:'Needs Work',c:'text-red-400',bg:'from-red-600/20 to-red-600/5'};

  const radarData = (stats?.subjects||[]).slice(0,5).map(s=>({ subject: s.subject.length>8?s.subject.slice(0,8)+'..':s.subject, hours:s.hours, focus:s.avgFocus }));

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Week ending {new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</p>
        <button onClick={() => load(true)} disabled={refreshing} className="btn-secondary flex items-center gap-2 text-xs">
          {refreshing ? <span className="w-3 h-3 border-2 border-slate-500/30 border-t-slate-400 rounded-full animate-spin" /> : '↻'} Regenerate
        </button>
      </div>

      {/* Score card */}
      <div className={`card p-6 bg-gradient-to-br ${perfLevel.bg}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="section-title mb-1">Performance Score</p>
            <div className="flex items-baseline gap-2"><span className={`text-5xl font-bold ${perfLevel.c}`}>{perfScore}</span><span className="text-slate-500 text-lg">/100</span></div>
            <span className={`text-sm font-semibold ${perfLevel.c}`}>{perfLevel.l} ✦</span>
          </div>
          <div className="space-y-2.5 flex-1 max-w-xs">
            {[{l:'Study Volume',v:Math.min(100,Math.round(((stats?.totalHours||0)/20)*100)),c:'#6366F1'},{l:'Focus Quality',v:Math.round(((stats?.avgFocus||0)/10)*100),c:'#10B981'},{l:'Consistency',v:Math.min(100,Math.round(((stats?.streak||0)/14)*100)),c:'#F59E0B'}].map(item=>(
              <div key={item.l}>
                <div className="flex justify-between text-xs mb-1"><span className="text-slate-500">{item.l}</span><span className="text-slate-400">{item.v}%</span></div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-1000" style={{width:`${item.v}%`,background:item.c}} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats pills */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[{l:'Hours Studied',v:`${stats?.totalHours||0}h`,c:'indigo'},{l:'Avg Focus',v:`${stats?.avgFocus||0}/10`,c:'green'},{l:'Streak',v:`${stats?.streak||0} days`,c:'amber'},{l:'Top Subject',v:stats?.topSubject||'—',c:'purple'}].map(item=>(
          <div key={item.l} className="card p-4 text-center"><p className={`text-xl font-bold ${item.c==='indigo'?'text-indigo-400':item.c==='green'?'text-emerald-400':item.c==='amber'?'text-amber-400':'text-purple-400'}`}>{item.v}</p><p className="text-xs text-slate-500 mt-1">{item.l}</p></div>
        ))}
      </div>

      {/* AI Report text */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center text-sm">✦</div>
          <div><p className="font-bold text-white text-sm">AI Mentor Report</p><p className="text-xs text-slate-500">Powered by AI · Personalized insights</p></div>
        </div>
        <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-5">
          {(reportText||'').split('\n').filter(Boolean).map((para,i) => (
            <p key={i} className="text-sm text-slate-300 leading-relaxed mb-3 last:mb-0">{para}</p>
          ))}
        </div>
      </div>

      {/* Radar + breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {radarData.length >= 3 && (
          <div className="card p-5">
            <p className="section-title mb-4">Subject Balance Radar</p>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#1E293B" />
                <PolarAngleAxis dataKey="subject" tick={{fill:'#94A3B8',fontSize:11}} />
                <Radar name="Hours" dataKey="hours" stroke="#6366F1" fill="#6366F1" fillOpacity={0.2} strokeWidth={2} />
                <Radar name="Focus" dataKey="focus" stroke="#10B981" fill="#10B981" fillOpacity={0.1} strokeWidth={2} />
                <Tooltip contentStyle={{background:'#1E293B',border:'1px solid #334155',borderRadius:8,fontSize:11}} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="card p-5">
          <p className="section-title mb-4">Subject Breakdown</p>
          <div className="space-y-3">
            {(stats?.subjects||[]).map((s,i)=>(
              <div key={s.subject}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">{s.subject}</span>
                  <div className="flex gap-3 text-slate-500">
                    <span>{s.hours}h</span>
                    <span className={s.avgFocus>=8?'text-emerald-400':s.avgFocus>=6?'text-amber-400':'text-red-400'}>{s.avgFocus}/10</span>
                  </div>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{width:`${((s.hours/(stats?.subjects?.[0]?.hours||1))*100)}%`,background:['#6366F1','#10B981','#F59E0B','#F43F5E','#8B5CF6'][i%5]}} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
