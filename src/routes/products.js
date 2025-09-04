// src/routes/products.js
import { Router } from 'express';
import { pool } from '../db.js';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Zod schema for validation
const productSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  category: z.string().optional().default('General'),
  price: z.coerce.number().nonnegative(),
  stock: z.coerce.number().int().nonnegative().default(0),
  image_url: z.string().url().optional().or(z.literal('')),
  description: z.string().optional().or(z.literal(''))
});

// ================== PUBLIC ROUTES ==================

// GET /api/products
// List all products
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM products ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('Error listing products:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/products/:id
// Fetch a single product by ID
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM products WHERE id=$1',
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ================== ADMIN ROUTES ==================

// POST /api/products
// Create product
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const data = productSchema.parse(req.body || {});
    const { rows } = await pool.query(
      `INSERT INTO products (title, category, price, stock, image_url, description)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [
        data.title,
        data.category,
        data.price,
        data.stock,
        data.image_url || null,
        data.description || null
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(400).json({ error: err.message || 'Invalid data' });
  }
});

// PUT /api/products/:id
// Update product
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const data = productSchema.partial().parse(req.body || {});
    const { rows } = await pool.query(
      'SELECT * FROM products WHERE id=$1',
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Not found' });
    }
    const p = rows[0];

    const updated = {
      title: data.title ?? p.title,
      category: data.category ?? p.category,
      price: data.price ?? p.price,
      stock: data.stock ?? p.stock,
      image_url: (data.image_url ?? p.image_url) || null,
      description: (data.description ?? p.description) || null
    };

    const out = await pool.query(
      `UPDATE products
       SET title=$1, category=$2, price=$3, stock=$4,
           image_url=$5, description=$6
       WHERE id=$7
       RETURNING *`,
      [
        updated.title,
        updated.category,
        updated.price,
        updated.stock,
        updated.image_url,
        updated.description,
        req.params.id
      ]
    );
    res.json(out.rows[0]);
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(400).json({ error: err.message || 'Invalid data' });
  }
});

// DELETE /api/products/:id
// Delete product
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM products WHERE id=$1',
      [req.params.id]
    );
    if (!rowCount) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
