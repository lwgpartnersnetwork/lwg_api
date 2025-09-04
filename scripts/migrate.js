import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlPath = path.join(__dirname, 'schema.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function ensureAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log('Skipping admin bootstrap: ADMIN_EMAIL or ADMIN_PASSWORD missing');
    return;
  }
  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT id FROM users WHERE email=$1', [email]);
    if (rows.length) {
      console.log('Admin already exists:', email);
      return;
    }
    const hash = await bcrypt.hash(password, 10);
    await client.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1,$2,$3)',
      [email, hash, 'admin']
    );
    console.log('Admin created:', email);
  } finally {
    client.release();
  }
}

async function run() {
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('Schema migrated.');
    await ensureAdmin();
  } catch (e) {
    console.error(e);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
