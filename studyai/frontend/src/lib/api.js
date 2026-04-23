import axios from 'axios';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: BASE, timeout: 20000 });

api.interceptors.request.use(cfg => {
  if (typeof window !== 'undefined') {
    const t = localStorage.getItem('accessToken');
    if (t) cfg.headers.Authorization = `Bearer ${t}`;
  }
  return cfg;
});

api.interceptors.response.use(
  r => r,
  async err => {
    const orig = err.config;
    if (err.response?.status === 401 && err.response?.data?.code === 'TOKEN_EXPIRED' && !orig._retry) {
      orig._retry = true;
      try {
        const rt = localStorage.getItem('refreshToken');
        const { data } = await axios.post(`${BASE}/auth/refresh`, { refreshToken: rt });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        orig.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(orig);
      } catch { localStorage.clear(); window.location.href = '/login'; }
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  register: d => api.post('/auth/register', d),
  login: d => api.post('/auth/login', d),
  getMe: () => api.get('/auth/me'),
  updateProfile: d => api.patch('/auth/profile', d),
};
export const sessionsAPI = {
  getAll: p => api.get('/sessions', { params: p }),
  create: d => api.post('/sessions', d),
  delete: id => api.delete(`/sessions/${id}`),
};
export const tasksAPI = {
  getAll: p => api.get('/tasks', { params: p }),
  create: d => api.post('/tasks', d),
  update: (id,d) => api.patch(`/tasks/${id}`, d),
  delete: id => api.delete(`/tasks/${id}`),
};
export const goalsAPI = {
  getAll: p => api.get('/goals', { params: p }),
  create: d => api.post('/goals', d),
  update: (id,d) => api.patch(`/goals/${id}`, d),
  toggleMilestone: (gid,mid) => api.patch(`/goals/${gid}/milestones/${mid}`),
  delete: id => api.delete(`/goals/${id}`),
};
export const analyticsAPI = {
  getSummary: () => api.get('/analytics/summary'),
  getHeatmap: p => api.get('/analytics/heatmap', { params: p }),
  getTrends: p => api.get('/analytics/trends', { params: p }),
  getSubjectBreakdown: p => api.get('/analytics/subject-breakdown', { params: p }),
  getOptimalTime: () => api.get('/analytics/optimal-time'),
};
export const aiAPI = {
  getInsights: () => api.get('/ai/insights'),
  chat: d => api.post('/ai/chat', d),
  getWeeklyReport: () => api.get('/ai/weekly-report'),
  generateTimetable: d => api.post('/ai/timetable', d),
  getChatHistory: p => api.get('/ai/chat-history', { params: p }),
};
export const alertsAPI = {
  getAll: () => api.get('/alerts'),
  markAllRead: () => api.patch('/alerts/read-all'),
  delete: id => api.delete(`/alerts/${id}`),
};
export const gamificationAPI = {
  getStatus: () => api.get('/gamification/status'),
};

export default api;
