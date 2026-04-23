'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore, useAlertStore } from '@/lib/store';
import { alertsAPI } from '@/lib/api';
import toast, { Toaster } from 'react-hot-toast';

const NAV = [
  { href:'/dashboard', icon:'▦', label:'Overview' },
  { href:'/dashboard/tracker', icon:'⏱', label:'Tracker' },
  { href:'/dashboard/analytics', icon:'⚡', label:'Analytics' },
  { href:'/dashboard/tasks', icon:'✓', label:'Tasks' },
  { href:'/dashboard/goals', icon:'◎', label:'Goals' },
  { href:'/dashboard/chat', icon:'✦', label:'AI Coach' },
  { href:'/dashboard/timetable', icon:'📅', label:'Timetable' },
  { href:'/dashboard/report', icon:'📊', label:'AI Report' },
];

function XPBar({ xp, level }) {
  const xpInLevel = xp % 500;
  const pct = (xpInLevel / 500) * 100;
  return (
    <div className="px-3 py-2 mx-2 bg-slate-800/60 rounded-xl border border-slate-700/50">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold text-indigo-400">Level {level}</span>
        <span className="text-xs text-slate-500">{xpInLevel}/500 XP</span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className="xp-bar h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }) {
  const { user, isLoading, isAuthenticated, init, logout } = useAuthStore();
  const { alerts, unreadCount, setAlerts, addAlert } = useAlertStore();
  const [showAlerts, setShowAlerts] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => { init(); }, []);
  useEffect(() => { if (!isLoading && !isAuthenticated) router.push('/login'); }, [isLoading, isAuthenticated]);

  useEffect(() => {
    if (!user) return;
    alertsAPI.getAll().then(r => setAlerts(r.data.data)).catch(() => {});

    // Keyboard shortcuts
    const handleKey = (e) => {
      if (e.altKey) {
        const shortcuts = { '1':'/dashboard','2':'/dashboard/tracker','3':'/dashboard/analytics','4':'/dashboard/tasks','5':'/dashboard/goals','6':'/dashboard/chat' };
        if (shortcuts[e.key]) { e.preventDefault(); router.push(shortcuts[e.key]); }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [user]);

  if (isLoading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl mx-auto flex items-center justify-center animate-pulse-soft">
          <span className="text-xl">✦</span>
        </div>
        <p className="text-slate-500 text-sm">Loading StudyAI...</p>
      </div>
    </div>
  );

  if (!isAuthenticated) return null;

  const pageTitle = NAV.find(n => n.href === pathname)?.label || 'Dashboard';

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Toaster position="top-right" toastOptions={{ style: { background:'#1E293B', border:'1px solid #334155', color:'#F1F5F9', fontSize:'13px', borderRadius:'12px' } }} />

      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-60'} flex-shrink-0 bg-slate-900/80 backdrop-blur-sm border-r border-slate-800 flex flex-col transition-all duration-300`}>
        {/* Logo */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-sm">✦</span>
          </div>
          {!collapsed && <span className="font-bold text-white text-base">StudyAI</span>}
          <button onClick={() => setCollapsed(!collapsed)} className="ml-auto text-slate-600 hover:text-slate-300 transition-colors text-xs">
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV.map(item => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group ${active ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}`}>
                <span className={`text-base w-5 text-center flex-shrink-0 ${active ? 'text-indigo-400' : 'group-hover:text-slate-300'}`}>{item.icon}</span>
                {!collapsed && <span className="font-medium">{item.label}</span>}
                {active && !collapsed && <div className="ml-auto w-1.5 h-1.5 bg-indigo-400 rounded-full" />}
              </Link>
            );
          })}
        </nav>

        {/* XP Bar */}
        {!collapsed && user?.gamification && (
          <div className="pb-2">
            <XPBar xp={user.gamification.xp || 0} level={user.gamification.level || 1} />
          </div>
        )}

        {/* Streak badge */}
        {!collapsed && user?.streak?.current > 0 && (
          <div className="mx-3 mb-2 px-3 py-2 bg-amber-950/30 border border-amber-800/30 rounded-xl flex items-center gap-2">
            <span className="text-base">🔥</span>
            <div>
              <p className="text-xs font-bold text-amber-300">{user.streak.current} Day Streak</p>
              <p className="text-xs text-slate-600">Best: {user.streak.longest}</p>
            </div>
          </div>
        )}

        {/* User */}
        <div className="p-3 border-t border-slate-800">
          <div className={`flex items-center gap-2.5 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">{user?.name}</p>
                <button onClick={logout} className="text-xs text-slate-600 hover:text-red-400 transition-colors">Sign out</button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-slate-900/60 backdrop-blur-sm border-b border-slate-800 px-6 py-3.5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-white">{pageTitle}</h1>
            <span className="text-slate-700">·</span>
            <span className="text-xs text-slate-500">{new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Keyboard hint */}
            <div className="hidden md:flex items-center gap-1 text-xs text-slate-700 mr-2">
              <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-500">Alt</kbd>
              <span>+</span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-500">1-6</kbd>
              <span className="ml-1">shortcuts</span>
            </div>

            {/* Alerts */}
            <div className="relative">
              <button onClick={() => { setShowAlerts(!showAlerts); if (!showAlerts) alertsAPI.markAllRead().catch(() => {}); }}
                className="relative p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-all">
                <span className="text-base">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showAlerts && (
                <div className="absolute right-0 top-12 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden animate-slide-up">
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">Notifications</p>
                    <button onClick={() => setShowAlerts(false)} className="text-slate-500 hover:text-slate-300 text-xs">✕</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {alerts.length === 0 ? (
                      <p className="p-6 text-sm text-slate-500 text-center">All caught up! 🎉</p>
                    ) : alerts.map(a => (
                      <div key={a._id} className={`p-4 border-b border-slate-800 last:border-0 text-sm hover:bg-slate-800/40 transition-colors ${a.severity === 'danger' ? 'border-l-2 border-l-red-500' : a.severity === 'warning' ? 'border-l-2 border-l-amber-500' : a.severity === 'success' ? 'border-l-2 border-l-emerald-500' : 'border-l-2 border-l-indigo-500'}`}>
                        <p className="font-medium text-slate-200 mb-0.5">{a.title}</p>
                        <p className="text-slate-500 text-xs">{a.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Avatar */}
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-xs font-bold">
              {user?.name?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
