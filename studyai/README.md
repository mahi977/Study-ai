# ✦ StudyAI — AI-Powered Study Productivity Platform
### Premium SaaS | Next.js 14 · Node.js · MongoDB · Gemini AI

---

## 🚀 Quick Start (5 Minutes)

### Step 1 — Clone / Extract

```bash
# Extract ZIP, then open in VS Code
code studyai
```

### Step 2 — Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env → add your MongoDB Atlas URI + Gemini API key
npm run seed     # Load 45 days of demo data
npm run dev      # → http://localhost:5000
```

### Step 3 — Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev      # → http://localhost:3000
```

### Step 4 — Login

```
Email:    demo@studyai.com
Password: demo123
```

---

## 🔑 Environment Variables

### Backend `.env`

```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/studyai
JWT_SECRET=any_32+_char_random_string
JWT_REFRESH_SECRET=another_32+_char_string
PORT=5000
CLIENT_URL=http://localhost:3000

# AI — Get FREE Gemini key at: aistudio.google.com
GEMINI_API_KEY=AIza...your_key_here
AI_PROVIDER=gemini

# OR use OpenAI
# OPENAI_API_KEY=sk-...
# AI_PROVIDER=openai
```

### Frontend `.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

---

## 📁 Project Structure

```
studyai/
├── backend/
│   ├── src/
│   │   ├── server.js                  Express + Socket.io + Security
│   │   ├── config/db.js               MongoDB Atlas
│   │   ├── models/
│   │   │   ├── User.js                XP + Badges + Streak
│   │   │   └── index.js               Session, Task, Goal, Analytics, Alert, Chat
│   │   ├── controllers/
│   │   │   ├── authController.js      JWT Auth
│   │   │   ├── aiController.js        Gemini/OpenAI + Smart Fallback
│   │   │   ├── analyticsController.js 5 analytics endpoints
│   │   │   ├── sessionController.js   XP + Streak auto-update
│   │   │   └── otherControllers.js    Task + Goal + Alert + Gamification
│   │   ├── routes/ (8 files)
│   │   ├── middleware/auth.js
│   │   ├── jobs/cron.js               3 CRON jobs
│   │   └── utils/seed.js              45 days demo data
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── login/page.js           Premium Login + Register
    │   │   └── dashboard/
    │   │       ├── layout.js           Collapsible Sidebar + Topbar
    │   │       ├── page.js             Overview + AI Insights + Charts
    │   │       ├── tracker/page.js     Session Logger + Pomodoro Timer
    │   │       ├── analytics/page.js   Heatmap + Trends + Optimal Time
    │   │       ├── tasks/page.js       Kanban Board
    │   │       ├── goals/page.js       Goals + Milestone Rings
    │   │       ├── chat/page.js        AI Coach Chat
    │   │       ├── timetable/page.js   AI Timetable Generator
    │   │       └── report/page.js      AI Weekly Report + Radar
    │   ├── lib/
    │   │   ├── api.js                  Axios + Token Refresh
    │   │   └── store.js                Zustand State
    │   └── app/globals.css             Premium Dark Theme + Glassmorphism
    ├── tailwind.config.js
    └── package.json
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register |
| POST | /api/auth/login | Login + JWT |
| POST | /api/auth/refresh | Refresh token |
| GET | /api/auth/me | Current user |
| POST | /api/sessions | Log session |
| GET | /api/sessions | Get sessions |
| GET | /api/analytics/summary | KPI cards |
| GET | /api/analytics/heatmap | Calendar heatmap |
| GET | /api/analytics/trends | Weekly trends |
| GET | /api/analytics/subject-breakdown | Per-subject stats |
| GET | /api/analytics/optimal-time | Best study hours |
| GET | /api/ai/insights | 4 AI insights |
| POST | /api/ai/chat | AI coach chat |
| GET | /api/ai/weekly-report | Mentor report |
| POST | /api/ai/timetable | Generate schedule |
| GET | /api/tasks | All tasks |
| POST | /api/tasks | Create task |
| PATCH | /api/tasks/:id | Update task |
| GET | /api/goals | All goals |
| POST | /api/goals | Create goal |
| PATCH | /api/goals/:id/milestones/:mid | Toggle milestone |
| GET | /api/gamification/status | XP + badges |
| GET | /api/alerts | Smart alerts |

---

## 🎨 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, Tailwind CSS |
| Charts | Recharts (Area, Bar, Pie, Radar, Line) |
| Animations | Framer Motion ready, CSS keyframes |
| State | Zustand |
| Backend | Node.js, Express.js, Socket.io |
| Database | MongoDB Atlas, Mongoose |
| AI | Google Gemini 1.5 Flash / OpenAI GPT-4o-mini |
| Auth | JWT + bcrypt |
| Realtime | Socket.io |
| Jobs | node-cron (3 scheduled tasks) |

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Alt + 1 | Overview |
| Alt + 2 | Tracker |
| Alt + 3 | Analytics |
| Alt + 4 | Tasks |
| Alt + 5 | Goals |
| Alt + 6 | AI Coach |

---

## 🚀 Deploy to Production

### Frontend → Vercel
```bash
cd frontend
npx vercel --prod
# Add env: NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
```

### Backend → Render.com
1. New Web Service → Connect GitHub
2. Root Dir: `backend`
3. Build: `npm install`
4. Start: `npm start`
5. Add all env vars from `.env.example`

---

## 🎯 AI Features

- **Gemini AI Insights** — 4 personalized insights from study data
- **AI Coach Chat** — Full conversation with context memory
- **Weekly Mentor Report** — 180-word personalized analysis
- **AI Timetable** — 7-day schedule based on weak subjects + availability
- **Smart Fallback** — Works without API key (rule-based responses)

---

## 📊 Gamification

| Milestone | Badge |
|-----------|-------|
| First session | 🌱 First Step |
| 7-day streak | 🔥 Week Warrior |
| 50 study hours | 💪 Centurion |
| 9+ focus × 10 | 🎯 Focus Master |
| 30-day streak | ⚡ Iron Discipline |
| 100 hours | 📚 Scholar |
| Level 5 | 🏆 Level 5 |
| Level 10 | 👑 Elite Studier |

---

## 👤 Demo Account
```
Email:    demo@studyai.com
Password: demo123
```
*45 days of pre-seeded study data included*
