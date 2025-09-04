import { Router } from 'express';
import { pool } from '../db.js';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const itemSchema = z.object({
  product_id: z.number().int().optional(), // optional if coming from client-only cart
  title: z.string().min(1),
  price: z.coerce.number().nonnegative(),
  qty: z.coerce.number().int().positive(),
  image_url: z.string().url().optional().or(z.literal(''))
});

const orderSchema = z.object({
  customer_name: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  delivery_location: z.string().optional().or(z.literal('')),
  delivery_fee: z.coerce.number().nonnegative().default(0),
  subtotal: z.coerce.number().nonnegative(),
  total: z.coerce.number().nonnegative(),
  payment_method: z.string().optional().or(z.literal('')),
  payment_info: z.string().optional().or(z.literal('')),
  source_url: z.string().optional().or(z.literal('')),
  items: z.array(itemSchema).min(1)
});

// Public: create order
router.post('/', async (req, res) => {
  const data = orderSchema.parse(req.body || {});
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderRes = await client.query(
      `INSERT INTO orders (customer_name, phone, address, delivery_location, delivery_fee, subtotal, total, payment_method, payment_info, source_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        data.customer_name || null,
        data.phone || null,
        data.address || null,
        data.delivery_location || null,
        data.delivery_fee || 0,
        data.subtotal,
        data.total,
        data.payment_method || null,
        data.payment_info || null,
        data.source_url || null
      ]
    );
    const order = orderRes.rows[0];

    for (const it of data.items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, title, price, qty, image_url)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [order.id, it.product_id ?? null, it.title, it.price, it.qty, it.image_url || null]
      );

      // Optional: decrement stock if product_id known
      if (it.product_id) {
        await client.query(`UPDATE products SET stock = GREATEST(stock - $1, 0) WHERE id=$2`, [it.qty, it.product_id]);
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ id: order.id, created_at: order.created_at });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: 'Order save failed' });
  } finally {
    client.release();
  }
});

// Admin: list orders (newest first)
router.get('/', requireAuth, async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 200');
  res.json(rows);
});

// Admin: order details + items
router.get('/:id', requireAuth, async (req, res) => {
  const orderRes = await pool.query('SELECT * FROM orders WHERE id=$1', [req.params.id]);
  if (!orderRes.rows.length) return res.status(404).json({ error: 'Not found' });
  const itemsRes = await pool.query('SELECT * FROM order_items WHERE order_id=$1', [req.params.id]);
  res.json({ order: orderRes.rows[0], items: itemsRes.rows });
});

export default router;
