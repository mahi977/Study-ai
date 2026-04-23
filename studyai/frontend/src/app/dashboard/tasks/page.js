'use client';
import { useEffect, useState } from 'react';
import { tasksAPI } from '@/lib/api';

const STATUSES = ['todo', 'inprogress', 'done'];
const STATUS_LABELS = { todo: 'To Do', inprogress: 'In Progress', done: 'Done' };
const STATUS_COLORS = { todo: 'text-gray-400', inprogress: 'text-indigo-400', done: 'text-emerald-400' };
const SUBJECTS = ['Physics', 'Mathematics', 'Chemistry', 'English', 'Biology', 'Computer Science', 'General'];

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', subject: 'General', priority: 'medium', dueDate: '', status: 'todo' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadTasks(); }, []);

  const loadTasks = async () => {
    try {
      const r = await tasksAPI.getAll();
      setTasks(r.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await tasksAPI.create(form);
      setForm({ title: '', subject: 'General', priority: 'medium', dueDate: '', status: 'todo' });
      setShowForm(false);
      loadTasks();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id, status) => {
    try {
      await tasksAPI.update(id, { status });
      setTasks(ts => ts.map(t => t._id === id ? { ...t, status } : t));
    } catch (e) { console.error(e); }
  };

  const deleteTask = async (id) => {
    await tasksAPI.delete(id);
    setTasks(ts => ts.filter(t => t._id !== id));
  };

  const byStatus = (s) => tasks.filter(t => t.status === s);

  const isOverdue = (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done';

  return (
    <div className="max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">{tasks.filter(t => t.status === 'done').length}/{tasks.length} completed</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">+ Add Task</button>
      </div>

      {/* Add Task Form */}
      {showForm && (
        <div className="card">
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Task Title</label>
              <input className="input" placeholder="e.g. Solve 20 integration problems" required
                value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="label">Subject</label>
              <select className="input" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}>
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select className="input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="label">Due Date</label>
              <input className="input" type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving...' : 'Add Task'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Kanban Columns */}
      {loading ? <p className="text-gray-500">Loading tasks...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STATUSES.map(status => (
            <div key={status} className="card">
              <div className="flex items-center justify-between mb-4">
                <p className={`text-sm font-semibold ${STATUS_COLORS[status]}`}>
                  {STATUS_LABELS[status]}
                </p>
                <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                  {byStatus(status).length}
                </span>
              </div>

              <div className="space-y-2 min-h-16">
                {byStatus(status).map(task => (
                  <div key={task._id} className={`p-3 rounded-lg border ${isOverdue(task) ? 'bg-red-950/20 border-red-900/50' : 'bg-gray-950 border-gray-800'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium flex-1 ${task.status === 'done' ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                        {task.title}
                      </p>
                      <button onClick={() => deleteTask(task._id)} className="text-gray-700 hover:text-red-400 text-xs flex-shrink-0">✕</button>
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-xs text-gray-600">{task.subject}</span>
                      <span className={`badge-${task.priority}`}>{task.priority}</span>
                      {task.dueDate && (
                        <span className={`text-xs ${isOverdue(task) ? 'text-red-400' : 'text-gray-600'}`}>
                          {isOverdue(task) ? '⚠ ' : ''}Due {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {/* Move buttons */}
                    <div className="flex gap-1 mt-2">
                      {status !== 'todo' && (
                        <button onClick={() => updateStatus(task._id, status === 'inprogress' ? 'todo' : 'inprogress')}
                          className="text-xs text-gray-600 hover:text-gray-300 transition-colors">← Back</button>
                      )}
                      {status !== 'done' && (
                        <button onClick={() => updateStatus(task._id, status === 'todo' ? 'inprogress' : 'done')}
                          className="text-xs text-indigo-500 hover:text-indigo-300 ml-auto transition-colors">
                          {status === 'todo' ? 'Start →' : 'Complete ✓'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {byStatus(status).length === 0 && (
                  <p className="text-xs text-gray-700 text-center py-4">Empty</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
