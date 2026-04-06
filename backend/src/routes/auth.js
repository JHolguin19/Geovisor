import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    const result = await pool.query(
      'SELECT * FROM usuarios WHERE username = $1 AND activo = TRUE',
      [username]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // Actualizar last_login
    await pool.query('UPDATE usuarios SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.rol, secretaria: user.secretaria_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.nombre_completo,
        role: user.rol,
        secretaria: user.secretaria_id
      }
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, nombre_completo, rol, secretaria_id, email FROM usuarios WHERE id = $1',
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.nombre_completo,
        role: user.rol,
        secretaria: user.secretaria_id,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Error en /me:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, (_req, res) => {
  res.json({ message: 'Sesión cerrada exitosamente' });
});

// POST /api/auth/refresh
router.post('/refresh', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, rol, secretaria_id FROM usuarios WHERE id = $1',
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.rol, secretaria: user.secretaria_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
    res.json({ token });
  } catch (err) {
    console.error('Error en refresh:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
