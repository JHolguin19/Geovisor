import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { AppError } from '../middleware/errorHandler.js';

export async function getAll() {
  const { rows } = await pool.query(`
    SELECT u.id, u.username, u.nombre_completo, u.email, u.rol,
           u.secretaria_id, u.activo, u.last_login, u.created_at,
           s.nombre AS secretaria_nombre
    FROM   usuarios u
    LEFT JOIN secretarias s ON s.id = u.secretaria_id
    ORDER BY u.created_at DESC
  `);
  return rows;
}

export async function create({ username, password, nombre_completo, email, rol, secretaria_id }) {
  const exists = await pool.query(
    'SELECT id FROM usuarios WHERE username = $1', [username]
  );
  if (exists.rows.length) throw new AppError('El nombre de usuario ya existe', 409);

  const password_hash = await bcrypt.hash(password, 12);

  const { rows } = await pool.query(`
    INSERT INTO usuarios (username, password_hash, nombre_completo, email, rol, secretaria_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, username, nombre_completo, email, rol, secretaria_id, activo, created_at
  `, [username, password_hash, nombre_completo || null, email || null, rol, secretaria_id || null]);

  return rows[0];
}

export async function update(id, { nombre_completo, email, rol, secretaria_id, password }) {
  const setClauses = [];
  const values = [];
  let i = 1;

  if (nombre_completo !== undefined) { setClauses.push(`nombre_completo = $${i++}`); values.push(nombre_completo); }
  if (email           !== undefined) { setClauses.push(`email = $${i++}`);           values.push(email); }
  if (rol             !== undefined) { setClauses.push(`rol = $${i++}`);             values.push(rol); }
  if (secretaria_id   !== undefined) { setClauses.push(`secretaria_id = $${i++}`);   values.push(secretaria_id || null); }
  if (password) {
    const hash = await bcrypt.hash(password, 12);
    setClauses.push(`password_hash = $${i++}`);
    values.push(hash);
  }

  if (!setClauses.length) throw new AppError('Nada que actualizar', 400);

  values.push(id);
  const { rows } = await pool.query(`
    UPDATE usuarios SET ${setClauses.join(', ')}
    WHERE id = $${i}
    RETURNING id, username, nombre_completo, email, rol, secretaria_id, activo, created_at
  `, values);

  if (!rows.length) throw new AppError('Usuario no encontrado', 404);
  return rows[0];
}

export async function toggleActivo(id, requesterId) {
  if (Number(id) === Number(requesterId)) {
    throw new AppError('No puedes desactivar tu propio usuario', 400);
  }

  const { rows } = await pool.query(`
    UPDATE usuarios SET activo = NOT activo
    WHERE id = $1
    RETURNING id, username, activo
  `, [id]);

  if (!rows.length) throw new AppError('Usuario no encontrado', 404);
  return rows[0];
}

export async function remove(id, requesterId) {
  if (Number(id) === Number(requesterId)) {
    throw new AppError('No puedes eliminar tu propio usuario', 400);
  }

  const { rows } = await pool.query(
    'DELETE FROM usuarios WHERE id = $1 RETURNING id', [id]
  );
  if (!rows.length) throw new AppError('Usuario no encontrado', 404);
  return { deleted: true };
}
