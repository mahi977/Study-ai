'use client';
import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, ComposedChart,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, Cell
} from 'recharts';
import { analyticsAPI } from '@/lib/api';

// ── Heatmap Component ─────────────────────────────────────────────
function Heatmap({ data, subject }) {
  // Build a map of date → totalMins
  const map = {};
  data.forEach(d => { map[d._id] = d.totalMins; });

  // Generate last 16 weeks (112 days)
  const days = [];
  const today = new Date();
  for (let i = 111; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split('T')[0];
    days.push({ date: key, mins: map[key] || 0, day: d.getDay() });
  }

  // Max for color scale
  const max = Math.max(...days.map(d => d.mins), 1);

  const getColor = (mins) => {
    if (mins === 0) return '#1F2937';
    const intensity = mins / max;
    if (intensity < 0.25) return '#312E81';
    if (intensity < 0.5)  return '#4338CA';
    if (intensity < 0.75) return '#6366F1';
    return '#818CF8';
  };

  const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Pad to start on Sunday
  const firstDay = days[0].day;
  const padded = [...Array(firstDay).fill(null), ...days];

  return (
    <div>
      {/* Day labels */}
      <div className="flex gap-1 mb-1 ml-0">
        {DAYS.map((d, i) => (
          <div key={i} className="w-4 text-center text-xs text-gray-600">{d}</div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {padded.map((d, i) =>
          d === null ? (
            <div key={`pad-${i}`} className="w-4 h-4 rounded-sm opacity-0" />
          ) : (
            <div key={d.date} className="w-4 h-4 rounded-sm cursor-pointer transition-transform hover:scale-125"
              style={{ background: getColor(d.mins) }}
              title={`${d.date}: ${d.mins > 0 ? (d.mins / 60).toFixed(1) + 'h' : 'No study'}`} />
          )
        )}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 text-xs text-gray-600">
        <span>Less</span>
        {['#1F2937', '#312E81', '#4338CA', '#6366F1', '#818CF8'].map(c => (
          <div key={c} className="w-4 h-4 rounded-sm" style={{ background: c }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

// ── Custom Tooltip ────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="font-semibold text-gray-200 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const [trends, setTrends] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [optimalTime, setOptimalTime] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubject, setActiveSubject] = useState('');
  const [weeksFilter, setWeeksFilter] = useState(8);

  const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#F43F5E', '#3B82F6', '#8B5CF6'];

  useEffect(() => {
    loadAll();
  }, [weeksFilter, activeSubject]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [t, h, sb, ot] = await Promise.all([
        analyticsAPI.getTrends({ weeks: weeksFilter }),
        analyticsAPI.getHeatmap({ subject: activeSubject, year: new Date().getFullYear() }),
        analyticsAPI.getSubjectBreakdown({ days: 30 }),
        analyticsAPI.getOptimalTime(),
      ]);
      setTrends(t.data.data);
      setHeatmapData(h.data.data);
      setSubjects(sb.data.data);
      setOptimalTime(ot.data.data.filter(h => h.sessions > 0 || h.hour >= 6));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // Detect pattern signals
  const getInsights = () => {
    const insights = [];
    if (trends.length >= 2) {
      const last = trends[trends.length - 1];
      const prev = trends[trends.length - 2];
      if (last.hours < prev.hours * 0.7) insights.push({ type: 'warning', msg: `Study hours dropped ${Math.round((1 - last.hours / prev.hours) * 100)}% this week vs last week` });
      if (last.avgFocus < 6) insights.push({ type: 'danger', msg: `Average focus score is ${last.avgFocus}/10 — below healthy threshold of 6` });
      if (last.activeDays < 4) insights.push({ type: 'warning', msg: `Only ${last.activeDays} active study days this week — aim for 5+` });
    }
    if (subjects.length > 1) {
      const sorted = [...subjects].sort((a, b) => a.hours - b.hours);
      if (sorted[0].hours < sorted[sorted.length - 1].hours * 0.3) {
        insights.push({ type: 'info', msg: `${sorted[0].subject} has significantly less time (${sorted[0].hours}h) vs ${sorted[sorted.length-1].subject} (${sorted[sorted.length-1].hours}h)` });
      }
    }
    if (insights.length === 0) insights.push({ type: 'success', msg: 'Great consistency! No major issues detected in your study patterns.' });
    return insights;
  };

  const insights = getInsights();
  const insightColors = { warning: 'bg-amber-950/30 border-amber-900/50 text-amber-300', danger: 'bg-red-950/30 border-red-900/50 text-red-300', info: 'bg-blue-950/30 border-blue-900/50 text-blue-300', success: 'bg-emerald-950/30 border-emerald-900/50 text-emerald-300' };

  return (
    <div className="max-w-6xl space-y-5">
      {/* Filter bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {[4, 8, 12].map(w => (
            <button key={w} onClick={() => setWeeksFilter(w)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${weeksFilter === w ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}>
              {w} Weeks
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500">Last updated: {new Date().toLocaleTimeString()}</p>
      </div>

      {/* AI Insights */}
      <div className="card">
        <p className="section-title mb-3">Pattern Detection Insights</p>
        <div className="space-y-2">
          {insights.map((ins, i) => (
            <div key={i} className={`flex items-start gap-2 px-3 py-2.5 rounded-lg border text-sm ${insightColors[ins.type]}`}>
              <span className="mt-0.5 flex-shrink-0">
                {ins.type === 'warning' ? '⚠' : ins.type === 'danger' ? '✕' : ins.type === 'success' ? '✓' : 'ℹ'}
              </span>
              {ins.msg}
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Trend Chart */}
      <div className="card">
        <p className="section-title mb-4">Weekly Study Hours + Focus Score</p>
        {loading ? <div className="h-48 flex items-center justify-center text-gray-600">Loading...</div> : (
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={trends} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="week" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="hours" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="focus" orientation="right" domain={[0, 10]} tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9CA3AF' }} />
              <Bar yAxisId="hours" dataKey="hours" fill="#6366F1" radius={[3, 3, 0, 0]} name="Hours" opacity={0.85} />
              <Line yAxisId="focus" type="monotone" dataKey="avgFocus" stroke="#10B981" strokeWidth={2.5}
                dot={{ fill: '#10B981', r: 4, strokeWidth: 0 }} name="Avg Focus" />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Subject Breakdown + Optimal Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Subject Breakdown */}
        <div className="card">
          <p className="section-title mb-4">Subject Breakdown (30 days)</p>
          {loading ? <div className="h-40 flex items-center justify-center text-gray-600">Loading...</div> : (
            <div className="space-y-3">
              {subjects.map((s, i) => {
                const maxHours = subjects[0]?.hours || 1;
                return (
                  <div key={s.subject}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-gray-300 font-medium">{s.subject}</span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-500">
                        <span>{s.hours}h</span>
                        <span className={`font-medium ${s.avgFocus >= 8 ? 'text-emerald-400' : s.avgFocus >= 6 ? 'text-amber-400' : 'text-red-400'}`}>
                          Focus {s.avgFocus}/10
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${(s.hours / maxHours) * 100}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                );
              })}
              {subjects.length === 0 && <p className="text-gray-600 text-sm text-center py-8">No data yet</p>}
            </div>
          )}
        </div>

        {/* Optimal Study Time */}
        <div className="card">
          <p className="section-title mb-4">Best Study Hours (Your Pattern)</p>
          {loading ? <div className="h-40 flex items-center justify-center text-gray-600">Loading...</div> : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={optimalTime} barSize={14}>
                  <XAxis dataKey="label" tick={{ fill: '#6B7280', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 10]} tick={{ fill: '#6B7280', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="avgFocus" name="Avg Focus" radius={[2, 2, 0, 0]}>
                    {optimalTime.map((entry, i) => (
                      <Cell key={i} fill={entry.avgFocus >= 8 ? '#818CF8' : entry.avgFocus >= 6 ? '#4338CA' : '#1F2937'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {optimalTime.length > 0 && (() => {
                const best = optimalTime.reduce((a, b) => b.avgFocus > a.avgFocus ? b : a, optimalTime[0]);
                return (
                  <p className="text-xs text-indigo-300 bg-indigo-950/30 border border-indigo-900/40 rounded-lg px-3 py-2 mt-3">
                    ⚡ Your peak focus time is <strong>{best.label}</strong> (avg {best.avgFocus}/10) — schedule important subjects here!
                  </p>
                );
              })()}
            </>
          )}
        </div>
      </div>

      {/* Heatmap */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <p className="section-title">Study Activity Heatmap — {new Date().getFullYear()}</p>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setActiveSubject('')}
              className={`px-3 py-1 rounded-lg text-xs transition-colors ${!activeSubject ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}>
              All Subjects
            </button>
            {subjects.map(s => (
              <button key={s.subject} onClick={() => setActiveSubject(s.subject)}
                className={`px-3 py-1 rounded-lg text-xs transition-colors ${activeSubject === s.subject ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}>
                {s.subject}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="h-24 flex items-center justify-center text-gray-600">Loading heatmap...</div>
        ) : (
          <Heatmap data={heatmapData} subject={activeSubject} />
        )}
      </div>

      {/* Sessions per day of week */}
      <div className="card">
        <p className="section-title mb-4">Active Days per Week (Consistency)</p>
        {loading ? <div className="h-32 flex items-center justify-center text-gray-600">Loading...</div> : (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="week" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 7]} ticks={[0, 1, 2, 3, 4, 5, 6, 7]} tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="activeDays" name="Active Days" radius={[3, 3, 0, 0]}>
                {trends.map((entry, i) => (
                  <Cell key={i} fill={entry.activeDays >= 5 ? '#10B981' : entry.activeDays >= 3 ? '#F59E0B' : '#F43F5E'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        <div className="flex gap-4 mt-3 text-xs text-gray-600">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> 5-7 days (great)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> 3-4 days (ok)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> 1-2 days (low)</span>
        </div>
      </div>
    </div>
  );
}
