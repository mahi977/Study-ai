require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const { startCronJobs } = require('./jobs/cron');

// Routes
const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/sessions');
const taskRoutes = require('./routes/tasks');
const goalRoutes = require('./routes/goals');
const analyticsRoutes = require('./routes/analytics');
const alertRoutes = require('./routes/alerts');
const aiRoutes = require('./routes/ai');
const gamificationRoutes = require('./routes/gamification');

const app = express();
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000', methods: ['GET', 'POST'] }
});
io.on('connection', (socket) => {
  socket.on('join', (userId) => { if (userId) socket.join(userId); });
  socket.on('pomodoro:complete', async ({ userId, subject, duration }) => {
    socket.to(userId).emit('session:auto-logged', { subject, duration });
  });
});
app.set('io', io);

// Security & Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(mongoSanitize());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate limiting
const api = rateLimit({ windowMs: 15 * 60 * 1000, max: 500, message: { success: false, message: 'Too many requests' } });
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, message: { success: false, message: 'AI rate limit reached' } });
app.use('/api', api);
app.use('/api/ai', aiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/gamification', gamificationRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok', env: process.env.NODE_ENV, ts: Date.now() }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal Server Error' });
});

// Start
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`\n🚀 StudyAI Backend → http://localhost:${PORT}`);
    console.log(`🤖 AI Provider: ${process.env.AI_PROVIDER || 'gemini'}`);
    console.log(`📦 Environment: ${process.env.NODE_ENV}\n`);
    startCronJobs();
  });
}).catch(err => { 
  console.error('DB Connection failed:', err.message); 
  console.log('Starting server without database connection...');
  server.listen(PORT, () => {
    console.log(`\n🚀 StudyAI Backend → http://localhost:${PORT} (DB DISABLED)`);
    console.log(`🤖 AI Provider: ${process.env.AI_PROVIDER || 'gemini'}`);
    console.log(`📦 Environment: ${process.env.NODE_ENV}\n`);
    // Don't start cron jobs without DB
  });
});
