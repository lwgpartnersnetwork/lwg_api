// src/db.js
import { Pool } from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString,
  // Render needs SSL for external connections
  ssl: { rejectUnauthorized: false },
  // Make the connection more resilient
  keepAlive: true,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on('error', (err) => {
  console.error('PG pool error:', err);
});
