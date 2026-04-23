'use client';
import { useState } from 'react';
import { aiAPI } from '@/lib/api';

const SUBJECTS_LIST = ['Mathematics','Physics','Chemistry','English','Biology','Computer Science','History','Geography'];
const PRIORITY_COLORS = { high:'text-red-400 bg-red-950/30 border-red-900/40', medium:'text-amber-400 bg-amber-950/30 border-amber-900/40', low:'text-green-400 bg-green-950/30 border-green-900/40' };

export default function TimetablePage() {
  const [form, setForm] = useState({ subjects:['Mathematics','Physics','Chemistry'], availableHours:4, examDate:'', weakSubjects:[] });
  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggleSubject = (s) => setForm(f => ({ ...f, subjects: f.subjects.includes(s) ? f.subjects.filter(x=>x!==s) : [...f.subjects, s] }));
  const toggleWeak = (s) => setForm(f => ({ ...f, weakSubjects: f.weakSubjects.includes(s) ? f.weakSubjects.filter(x=>x!==s) : [...f.weakSubjects, s] }));

  const generate = async () => {
    setLoading(true);
    try {
      const r = await aiAPI.generateTimetable(form);
      setTimetable(r.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-5xl space-y-6">
      {/* Config card */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center text-sm">📅</div>
          <div>
            <h2 className="font-bold text-white">AI Timetable Generator</h2>
            <p className="text-xs text-slate-500">Personalized schedule based on your performance data</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="label">Select Subjects</label>
            <div className="flex flex-wrap gap-2">
              {SUBJECTS_LIST.map(s => (
                <button key={s} onClick={() => toggleSubject(s)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all duration-200 ${form.subjects.includes(s) ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="label">Daily Available Hours: {form.availableHours}h</label>
              <input type="range" min={2} max={10} step={0.5} value={form.availableHours}
                onChange={e => setForm({...form, availableHours: Number(e.target.value)})}
                className="w-full accent-indigo-500 mt-1" />
              <div className="flex justify-between text-xs text-slate-600 mt-1"><span>2h</span><span>10h</span></div>
            </div>
            <div>
              <label className="label">Exam Date (optional)</label>
              <input type="date" className="input" value={form.examDate} onChange={e => setForm({...form, examDate:e.target.value})} />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="label">Weak Subjects (will get more time)</label>
            <div className="flex flex-wrap gap-2">
              {form.subjects.map(s => (
                <button key={s} onClick={() => toggleWeak(s)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all duration-200 ${form.weakSubjects.includes(s) ? 'bg-amber-600/20 border-amber-500/50 text-amber-300' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                  {form.weakSubjects.includes(s) ? '⚠ ' : ''}{s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={generate} disabled={loading || form.subjects.length === 0} className="btn-gradient mt-5 flex items-center gap-2 w-full justify-center py-3">
          {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating AI Timetable...</> : <><span>✦</span>Generate Smart Timetable</>}
        </button>
      </div>

      {/* Timetable grid */}
      {timetable && (
        <div className="space-y-4 animate-slide-up">
          {/* Tips */}
          {timetable.tips?.length > 0 && (
            <div className="glass-card p-4">
              <p className="section-title mb-3">AI Tips</p>
              <div className="flex flex-wrap gap-2">
                {timetable.tips.map((tip,i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-300 bg-indigo-950/30 border border-indigo-800/30 rounded-lg px-3 py-2">
                    <span className="text-indigo-400 flex-shrink-0">💡</span>{tip}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Days */}
          {timetable.schedule?.map(day => (
            <div key={day.day} className="card p-4">
              <p className="font-bold text-white mb-3 flex items-center gap-2">
                <span className="w-7 h-7 bg-indigo-600/20 border border-indigo-500/30 rounded-lg flex items-center justify-center text-xs text-indigo-300">{day.day[0]}</span>
                {day.day}
              </p>
              <div className="space-y-2">
                {day.slots?.map((slot, i) => (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border text-sm ${PRIORITY_COLORS[slot.priority] || PRIORITY_COLORS.medium}`}>
                    <span className="text-xs font-mono text-slate-400 w-36 flex-shrink-0">{slot.time}</span>
                    <div className="w-1 h-8 rounded-full bg-current opacity-30 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="font-semibold text-slate-200">{slot.subject}</span>
                      <span className="text-slate-400 ml-2">{slot.topic}</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800/50 text-slate-400 flex-shrink-0">{slot.technique}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!timetable && !loading && (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-slate-400 font-medium">Configure your preferences above</p>
          <p className="text-slate-600 text-sm mt-1">AI will generate a personalized weekly timetable based on your study data</p>
        </div>
      )}
    </div>
  );
}
