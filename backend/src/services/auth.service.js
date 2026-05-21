import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const ACCESS_EXPIRES = '2h';
const REFRESH_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.rol ?? user.role, secretaria: user.secretaria_id ?? user.secretaria },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES }
  );
}

function generateRefreshToken() {
  return crypto.randomBytes(40).toString('hex');
}

async function saveRefreshToken(userId, token) {
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_MS);
  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt]
  );
}

async function cleanExpiredTokens() {
  await pool.query('DELETE FROM refresh_tokens WHERE expires_at < NOW()').catch(() => {});
}

export async function login(username, password) {
  if (!username || !password) throw new AppError('Usuario y contraseña requeridos', 400);

  const result = await pool.query(
    'SELECT * FROM usuarios WHERE username = $1 AND activo = TRUE',
    [username]
  );
  const user = result.rows[0];

  if (!user) {
    logger.warn({ username }, 'Login fallido: usuario no encontrado');
    throw new AppError('Credenciales inválidas', 401);
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    logger.warn({ username, userId: user.id }, 'Login fallido: contraseña incorrecta');
    throw new AppError('Credenciales inválidas', 401);
  }

  await pool.query('UPDATE usuarios SET last_login = NOW() WHERE id = $1', [user.id]);
  logger.info({ username, userId: user.id }, 'Login exitoso');

  const accessToken = signAccessToken(user);
  const refreshToken = generateRefreshToken();
  await saveRefreshToken(user.id, refreshToken);

  // Limpiar tokens expirados de fondo (fire-and-forget con log de error)
  cleanExpiredTokens().catch(err => logger.warn({ err }, 'Error limpiando tokens expirados'));

  return {
    message: 'Login exitoso',
    token: accessToken,
    refreshToken,
    user: {
      id: user.id,
      username: user.username,
      name: user.nombre_completo,
      role: user.rol,
      secretaria: user.secretaria_id
    }
  };
}

export async function getMe(userId) {
  const result = await pool.query(
    'SELECT id, username, nombre_completo, rol, secretaria_id, email FROM usuarios WHERE id = $1',
    [userId]
  );
  const user = result.rows[0];
  if (!user) throw new AppError('Usuario no encontrado', 404);

  return {
    user: {
      id: user.id,
      username: user.username,
      name: user.nombre_completo,
      role: user.rol,
      secretaria: user.secretaria_id,
      email: user.email
    }
  };
}

/**
 * Refresh token rotation: invalida el token actual, emite nuevos tokens.
 */
export async function refresh(refreshToken) {
  if (!refreshToken) throw new AppError('Refresh token requerido', 400);

  // Buscar y eliminar el token en una sola operación atómica
  const result = await pool.query(
    'DELETE FROM refresh_tokens WHERE token = $1 AND expires_at > NOW() RETURNING user_id',
    [refreshToken]
  );

  if (!result.rows.length) {
    logger.warn('Refresh token inválido o expirado');
    throw new AppError('Refresh token inválido o expirado', 401);
  }

  const userId = result.rows[0].user_id;
  const userResult = await pool.query(
    'SELECT id, username, rol, secretaria_id FROM usuarios WHERE id = $1 AND activo = TRUE',
    [userId]
  );
  const user = userResult.rows[0];
  if (!user) throw new AppError('Usuario no encontrado', 401);

  const newAccessToken = signAccessToken(user);
  const newRefreshToken = generateRefreshToken();
  await saveRefreshToken(user.id, newRefreshToken);

  logger.info({ userId: user.id }, 'Token refresh exitoso');

  return { token: newAccessToken, refreshToken: newRefreshToken };
}

/**
 * Logout: invalida todos los refresh tokens del usuario.
 */
export async function logout(userId) {
  await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
  logger.info({ userId }, 'Logout - tokens invalidados');
}
