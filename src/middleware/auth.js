// src/middleware/auth.js
import jwt from 'jsonwebtoken';

/**
 * Require a valid JWT in "Authorization: Bearer <token>".
 * Attaches decoded payload to req.user (e.g., { id, email, role }).
 */
export function requireAuth(req, res, next) {
  try {
    const hdr = req.headers.authorization || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7).trim() : null;

    if (!token) {
      return res.status(401).json({ error: 'Missing authorization token' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('⚠️ JWT_SECRET is not set');
      return res.status(500).json({ error: 'Server misconfigured' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role, iat, exp }
    return next();
  } catch (err) {
    console.warn('JWT verification failed:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Require an authenticated user with role === 'admin'.
 * Use after requireAuth.
 */
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: admin only' });
  }
  return next();
}
