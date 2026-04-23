import { create } from 'zustand';
import { authAPI } from './api';

export const useAuthStore = create((set) => ({
  user: null, isLoading: true, isAuthenticated: false,
  init: async () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('accessToken');
    if (!token) { set({ isLoading: false }); return; }
    try {
      const { data } = await authAPI.getMe();
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch { localStorage.clear(); set({ isLoading: false }); }
  },
  login: async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    set({ user: data.user, isAuthenticated: true });
    return data;
  },
  register: async (name, email, password) => {
    const { data } = await authAPI.register({ name, email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    set({ user: data.user, isAuthenticated: true });
    return data;
  },
  logout: () => { localStorage.clear(); set({ user: null, isAuthenticated: false }); window.location.href = '/login'; },
  updateUser: (user) => set({ user }),
}));

export const useAlertStore = create((set) => ({
  alerts: [], unreadCount: 0,
  setAlerts: (alerts) => set({ alerts, unreadCount: alerts.filter(a => !a.isRead).length }),
  addAlert: (alert) => set(s => ({ alerts: [alert, ...s.alerts], unreadCount: s.unreadCount + 1 })),
  clearAll: () => set({ alerts: [], unreadCount: 0 }),
}));

export const useThemeStore = create((set) => ({
  theme: 'dark',
  toggle: () => set(s => {
    const next = s.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', next === 'dark');
    return { theme: next };
  })
}));
