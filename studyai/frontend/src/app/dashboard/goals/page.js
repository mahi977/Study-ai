'use client';
import { useEffect, useState } from 'react';
import { goalsAPI } from '@/lib/api';

const SUBJECTS = ['Physics', 'Mathematics', 'Chemistry', 'English', 'Biology', 'Computer Science', 'General'];
const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#F43F5E', '#3B82F6', '#8B5CF6', '#EC4899'];

function CircularProgress({ percent, color, size = 80 }) {
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width={size} height={size} className="flex-shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1F2937" strokeWidth="7" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="7"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      <text x={size/2} y={size/2 + 5} textAnchor="middle"
        fill={color} fontSize="13" fontWeight="bold" fontFamily="Inter">
        {percent}%
      </text>
    </svg>
  );
}

function GoalCard({ goal, onToggleMilestone, onDelete, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const daysLeft = Math.ceil((new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysLeft < 0 && goal.status !== 'completed';

  return (
    <div className={`card border ${goal.status === 'completed' ? 'border-emerald-900/50 bg-emerald-950/10' : isOverdue ? 'border-red-900/50' : 'border-gray-800'}`}>
      {/* Header */}
      <div className="flex items-start gap-4">
        <CircularProgress percent={goal.progressPercent} color={goal.color || '#6366F1'} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-gray-100 text-sm">{goal.title}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{goal.subject}</p>
            </div>
            <button onClick={() => onDelete(goal._id)} className="text-gray-700 hover:text-red-400 text-xs transition-colors flex-shrink-0">✕</button>
          </div>

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {goal.status === 'completed' ? (
              <span className="text-xs bg-emerald-900/40 text-emerald-400 px-2 py-0.5 rounded-full">✓ Completed</span>
            ) : isOverdue ? (
              <span className="text-xs bg-red-900/40 text-red-400 px-2 py-0.5 rounded-full">⚠ Overdue by {Math.abs(daysLeft)} days</span>
            ) : (
              <span className="text-xs bg-indigo-900/30 text-indigo-400 px-2 py-0.5 rounded-full">{daysLeft} days left</span>
            )}
            <span className="text-xs text-gray-600">
              {goal.milestones.filter(m => m.isCompleted).length}/{goal.milestones.length} milestones
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${goal.progressPercent}%`, background: goal.color || '#6366F1' }} />
          </div>
        </div>
      </div>

      {/* Milestones toggle */}
      <button onClick={() => setExpanded(!expanded)}
        className="mt-3 text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1">
        {expanded ? '▲ Hide' : '▼ Show'} milestones
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-gray-800 pt-3">
          {goal.milestones.map((m) => (
            <div key={m._id}
              onClick={() => onToggleMilestone(goal._id, m._id)}
              className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-gray-800 cursor-pointer group transition-colors">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${m.isCompleted ? 'bg-emerald-600 border-emerald-600' : 'border-gray-600 group-hover:border-gray-400'}`}>
                {m.isCompleted && <span className="text-white text-xs">✓</span>}
              </div>
              <span className={`text-sm transition-colors ${m.isCompleted ? 'line-through text-gray-600' : 'text-gray-300'}`}>
                {m.title}
              </span>
              {m.isCompleted && m.completedAt && (
                <span className="text-xs text-gray-700 ml-auto">
                  {new Date(m.completedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          ))}

          {goal.milestones.length === 0 && (
            <p className="text-xs text-gray-600 text-center py-2">No milestones added</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('active');
  const [form, setForm] = useState({
    title: '', subject: 'Mathematics', targetDate: '', description: '', color: '#6366F1',
    milestones: [{ title: '' }, { title: '' }, { title: '' }]
  });

  useEffect(() => { loadGoals(); }, [filter]);

  const loadGoals = async () => {
    setLoading(true);
    try {
      const r = await goalsAPI.getAll({ status: filter });
      setGoals(r.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const milestones = form.milestones.filter(m => m.title.trim()).map(m => ({ title: m.title }));
      await goalsAPI.create({ ...form, milestones });
      setShowForm(false);
      setForm({ title: '', subject: 'Mathematics', targetDate: '', description: '', color: '#6366F1',
        milestones: [{ title: '' }, { title: '' }, { title: '' }] });
      loadGoals();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleToggleMilestone = async (goalId, milestoneId) => {
    try {
      const r = await goalsAPI.toggleMilestone(goalId, milestoneId);
      setGoals(gs => gs.map(g => g._id === goalId ? r.data.data : g));
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this goal?')) return;
    await goalsAPI.delete(id);
    setGoals(gs => gs.filter(g => g._id !== id));
  };

  const setMilestone = (i, val) => {
    const ms = [...form.milestones];
    ms[i] = { title: val };
    setForm({ ...form, milestones: ms });
  };

  const addMilestoneField = () => setForm({ ...form, milestones: [...form.milestones, { title: '' }] });

  // Stats
  const totalGoals = goals.length;
  const avgProgress = totalGoals ? Math.round(goals.reduce((s, g) => s + g.progressPercent, 0) / totalGoals) : 0;

  return (
    <div className="max-w-5xl space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {['active', 'completed', 'all'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}>
              {f}
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">+ New Goal</button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-2xl font-bold text-indigo-400">{totalGoals}</p>
          <p className="text-xs text-gray-500 mt-1">Total Goals</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-emerald-400">{avgProgress}%</p>
          <p className="text-xs text-gray-500 mt-1">Avg Progress</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-amber-400">
            {goals.filter(g => g.status === 'completed').length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Completed</p>
        </div>
      </div>

      {/* Create Goal Form */}
      {showForm && (
        <div className="card border border-indigo-900/50">
          <p className="section-title mb-4">Create New Goal</p>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Goal Title</label>
                <input className="input" placeholder="e.g. Complete JEE Mathematics Syllabus" required
                  value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label className="label">Subject</label>
                <select className="input" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}>
                  {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Target Date</label>
                <input className="input" type="date" required
                  value={form.targetDate} onChange={e => setForm({ ...form, targetDate: e.target.value })} />
              </div>
              <div>
                <label className="label">Color</label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                      className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-110' : ''}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Description (optional)</label>
                <input className="input" placeholder="Short description..."
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>

            {/* Milestones */}
            <div>
              <label className="label">Milestones (Steps to achieve this goal)</label>
              <div className="space-y-2">
                {form.milestones.map((m, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-5 text-center">{i + 1}.</span>
                    <input className="input flex-1" placeholder={`Milestone ${i + 1}...`}
                      value={m.title} onChange={e => setMilestone(i, e.target.value)} />
                  </div>
                ))}
                <button type="button" onClick={addMilestoneField}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                  + Add milestone
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Creating...' : 'Create Goal'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Goals Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading goals...</div>
      ) : goals.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-3xl mb-3">◎</p>
          <p className="text-gray-400 font-medium">No goals yet</p>
          <p className="text-gray-600 text-sm mt-1">Create your first goal to start tracking progress</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map(goal => (
            <GoalCard key={goal._id} goal={goal}
              onToggleMilestone={handleToggleMilestone}
              onDelete={handleDelete}
              onUpdate={loadGoals} />
          ))}
        </div>
      )}
    </div>
  );
}
