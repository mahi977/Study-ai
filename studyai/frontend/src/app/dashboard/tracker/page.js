'use client';
import { useEffect, useState, useRef } from 'react';
import { sessionsAPI } from '@/lib/api';

const SUBJECTS = ['Physics', 'Mathematics', 'Chemistry', 'English', 'Biology', 'History', 'Computer Science', 'Other'];

function PomodoroTimer({ onComplete }) {
  const [running, setRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [cycle, setCycle] = useState(0);
  const [phase, setPhase] = useState('focus'); // focus | break
  const intervalRef = useRef(null);
  const FOCUS = 25 * 60, BREAK = 5 * 60;

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            if (phase === 'focus') { onComplete?.(); setCycle(c => c + 1); setPhase('break'); setTimeLeft(BREAK); }
            else { setPhase('focus'); setTimeLeft(FOCUS); }
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, phase]);

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const ss = String(timeLeft % 60).padStart(2, '0');
  const progress = phase === 'focus' ? ((FOCUS - timeLeft) / FOCUS) * 100 : ((BREAK - timeLeft) / BREAK) * 100;

  const reset = () => { setRunning(false); setTimeLeft(FOCUS); setPhase('focus'); clearInterval(intervalRef.current); };

  return (
    <div className="card text-center">
      <p className="section-title mb-4">{phase === 'focus' ? 'Focus Session' : '☕ Break Time'}</p>
      <div className="relative w-32 h-32 mx-auto mb-4">
        <svg className="transform -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#1F2937" strokeWidth="8" />
          <circle cx="60" cy="60" r="54" fill="none" stroke={phase === 'focus' ? '#6366F1' : '#10B981'}
            strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 54}`}
            strokeDashoffset={`${2 * Math.PI * 54 * (1 - progress / 100)}`}
            style={{ transition: 'stroke-dashoffset 1s linear' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold font-mono text-white">{mm}:{ss}</span>
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-4">Pomodoro #{cycle + 1} · {phase === 'focus' ? '25 min focus' : '5 min break'}</p>
      <div className="flex gap-2 justify-center">
        <button onClick={() => setRunning(r => !r)} className="btn-primary px-6">
          {running ? '⏸ Pause' : '▶ Start'}
        </button>
        <button onClick={reset} className="btn-secondary px-4">↺ Reset</button>
      </div>
    </div>
  );
}

export default function TrackerPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    subject: 'Physics', chapter: '', durationMins: 45,
    focusScore: 7, notes: '', mood: 'good', source: 'manual'
  });
  const [msg, setMsg] = useState('');

  const loadSessions = async () => {
    try {
      const r = await sessionsAPI.getAll({ limit: 15 });
      setSessions(r.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadSessions(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setMsg('');
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - form.durationMins * 60000);
      await sessionsAPI.create({ ...form, startTime, endTime, durationMins: Number(form.durationMins), focusScore: Number(form.focusScore) });
      setMsg('✅ Session logged!');
      setForm({ ...form, chapter: '', notes: '', durationMins: 45, focusScore: 7 });
      loadSessions();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.message || 'Error saving session'));
    } finally { setSaving(false); setTimeout(() => setMsg(''), 3000); }
  };

  const handlePomodoroComplete = async () => {
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 25 * 60000);
      await sessionsAPI.create({ subject: form.subject, startTime, endTime, durationMins: 25, focusScore: 8, source: 'pomodoro', mood: 'good' });
      loadSessions();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id) => {
    await sessionsAPI.delete(id);
    setSessions(s => s.filter(x => x._id !== id));
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Log Session Form */}
        <div className="lg:col-span-2 card">
          <p className="section-title mb-4">Log Study Session</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Subject</label>
                <select className="input" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}>
                  {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Chapter / Topic</label>
                <input className="input" placeholder="e.g. Optics Ch 3" value={form.chapter}
                  onChange={e => setForm({ ...form, chapter: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Duration (minutes)</label>
                <input className="input" type="number" min={1} max={480} value={form.durationMins}
                  onChange={e => setForm({ ...form, durationMins: e.target.value })} required />
              </div>
              <div>
                <label className="label">Focus Score (1–10)</label>
                <div className="flex items-center gap-3">
                  <input type="range" min={1} max={10} value={form.focusScore} className="flex-1"
                    onChange={e => setForm({ ...form, focusScore: e.target.value })} />
                  <span className={`text-lg font-bold w-8 text-center ${form.focusScore >= 8 ? 'text-emerald-400' : form.focusScore >= 6 ? 'text-amber-400' : 'text-red-400'}`}>
                    {form.focusScore}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Mood</label>
                <select className="input" value={form.mood} onChange={e => setForm({ ...form, mood: e.target.value })}>
                  {['great', 'good', 'neutral', 'tired', 'stressed'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Notes</label>
                <input className="input" placeholder="What did you cover?" value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            {msg && <p className={`text-sm px-3 py-2 rounded-lg ${msg.startsWith('✅') ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'}`}>{msg}</p>}
            <button type="submit" disabled={saving} className="btn-primary w-full py-2.5">
              {saving ? 'Saving...' : '+ Log Session'}
            </button>
          </form>
        </div>

        {/* Pomodoro Timer */}
        <PomodoroTimer onComplete={handlePomodoroComplete} />
      </div>

      {/* Session History */}
      <div className="card">
        <p className="section-title mb-4">Session History</p>
        {loading ? <p className="text-gray-500 text-sm">Loading...</p> : (
          <div className="space-y-2">
            {sessions.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No sessions yet. Log your first one above!</p>}
            {sessions.map(s => (
              <div key={s._id} className="flex items-center justify-between py-2.5 px-3 bg-gray-950 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-8 rounded-full ${s.focusScore >= 8 ? 'bg-emerald-500' : s.focusScore >= 6 ? 'bg-amber-500' : 'bg-red-500'}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-200">{s.subject}{s.chapter ? ` — ${s.chapter}` : ''}</p>
                    <p className="text-xs text-gray-500">{new Date(s.startTime).toLocaleDateString()} · {s.durationMins} min · {s.source}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold ${s.focusScore >= 8 ? 'text-emerald-400' : s.focusScore >= 6 ? 'text-amber-400' : 'text-red-400'}`}>
                    {s.focusScore}/10
                  </span>
                  <button onClick={() => handleDelete(s._id)} className="text-gray-600 hover:text-red-400 text-xs transition-colors">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
