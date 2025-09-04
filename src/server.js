
// src/server.js
import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';

const app = express();

/* ====== CORS ====== */
const allowedOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // allow server-to-server, curl, Postman, Render health checks (no Origin)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: false
}));

/* ====== Middleware ====== */
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));

/* ====== Health checks ====== */
// Root: lets Render (and you) see a quick OK
app.get('/', (_req, res) => res.type('text').send('OK'));

// Non-prefixed health for Render or uptime pingers
app.get('/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString(), service: 'lwg_api' });
});

// API-prefixed health for your app
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString(), service: 'lwg_api' });
});

/* ====== Routes ====== */
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

/* ====== 404 handler ====== */
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

/* ====== Start server ====== */
const PORT = process.env.PORT || 8080; // Render injects PORT
app.listen(PORT, () => console.log(`✅ LWG API listening on :${PORT}`));
