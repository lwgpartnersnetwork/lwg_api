// backend/server.js
import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';

const app = express();

/* =========================
   CORS (local-friendly + allow-list)
   - Always allow localhost / 127.0.0.1 (any port) for dev
   - Also allow any exact origins listed in CORS_ORIGIN (comma-separated)
   - Examples:
     CORS_ORIGIN=https://animated-gumdrop-022acb.netlify.app,https://lwgpartnersnetwork.com
   ========================= */
const allowList = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const isLocalOrigin = (origin = '') =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

app.use(
  cors({
    origin: (origin, cb) => {
      // no Origin header => allow (curl/Postman/mobile/native)
      if (!origin) return cb(null, true);

      if (isLocalOrigin(origin)) return cb(null, true);
      if (allowList.includes('*')) return cb(null, true);
      if (allowList.includes(origin)) return cb(null, true);

      console.warn('CORS blocked:', origin);
      return cb(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: false,
  })
);

/* ============= Middleware ============= */
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));

/* ============= Health check ============= */
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

/* ============= Routes ============= */
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

/* ============= 404 ============= */
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

/* ============= Start ============= */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ LWG API listening on :${PORT}`);
});
