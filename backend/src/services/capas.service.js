import { pool } from '../db/pool.js';
import { AppError } from '../middleware/errorHandler.js';

const WITH_POPUP_FIELDS = `
  array_agg(
    json_build_object('campo', pf.campo, 'etiqueta', pf.etiqueta, 'formato', pf.formato, 'orden', pf.orden)
    ORDER BY pf.orden
  ) FILTER (WHERE pf.id IS NOT NULL) AS popup_fields
`;

export async function list({ role, secretaria, secretariaId }) {
  let targetSecretaria = secretariaId;
  if (role === 'secretaria' || role === 'lector') {
    targetSecretaria = secretaria;
  }

  const bySecretaria = targetSecretaria && targetSecretaria !== 'sig';
  const query = bySecretaria
    ? `SELECT c.*, ${WITH_POPUP_FIELDS}
       FROM capas c
       LEFT JOIN capas_popup_fields pf ON pf.capa_id = c.id
       WHERE c.secretaria_id = $1 AND c.activa = TRUE
       GROUP BY c.id ORDER BY c.orden`
    : `SELECT c.*, ${WITH_POPUP_FIELDS}
       FROM capas c
       LEFT JOIN capas_popup_fields pf ON pf.capa_id = c.id
       WHERE c.activa = TRUE
       GROUP BY c.id ORDER BY c.secretaria_id, c.orden`;

  const params = bySecretaria ? [targetSecretaria] : [];
  const result = await pool.query(query, params);
  return result.rows;
}

export async function listSecretarias() {
  const result = await pool.query(`
    SELECT s.id, s.nombre, s.short_name, s.codigo, s.color, s.descripcion,
           s.tiene_mapa, s.orden,
           COUNT(c.id) AS total_capas
    FROM secretarias s
    LEFT JOIN capas c ON c.secretaria_id = s.id AND c.activa = TRUE
    WHERE s.activa = TRUE
    GROUP BY s.id
    ORDER BY s.orden
  `);
  return result.rows;
}

export async function create({ id, nombre, secretaria_id, tabla_postgis, color,
  visible_defecto, queryable, z_index, descripcion,
  columnas_consulta, tipo_geometria, orden, popup_fields, userId }) {

  if (!id || !nombre || !secretaria_id || !tabla_postgis) {
    throw new AppError('Faltan campos requeridos: id, nombre, secretaria_id, tabla_postgis', 400);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      INSERT INTO capas (id, nombre, secretaria_id, tabla_postgis, color, visible_defecto,
                         queryable, z_index, descripcion, columnas_consulta, tipo_geometria, orden, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    `, [id, nombre, secretaria_id, tabla_postgis, color || '#3388ff',
        visible_defecto ?? false, queryable ?? true, z_index || 1,
        descripcion, columnas_consulta, tipo_geometria || 'polygon', orden || 0, userId]);

    if (popup_fields?.length) {
      for (const [i, pf] of popup_fields.entries()) {
        await client.query(`
          INSERT INTO capas_popup_fields (capa_id, campo, etiqueta, formato, orden)
          VALUES ($1,$2,$3,$4,$5)
        `, [id, pf.campo, pf.etiqueta, pf.formato || 'text', i]);
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function update({ id, role, secretaria, body }) {
  const existing = await pool.query('SELECT * FROM capas WHERE id = $1', [id]);
  if (!existing.rows.length) throw new AppError('Capa no encontrada', 404);
  if (role === 'secretaria' && existing.rows[0].secretaria_id !== secretaria) {
    throw new AppError('Sin permisos para editar esta capa', 403);
  }

  const { nombre, color, visible_defecto, queryable, z_index, descripcion,
          columnas_consulta, orden, activa, popup_fields } = body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      UPDATE capas SET
        nombre = COALESCE($1, nombre),
        color = COALESCE($2, color),
        visible_defecto = COALESCE($3, visible_defecto),
        queryable = COALESCE($4, queryable),
        z_index = COALESCE($5, z_index),
        descripcion = COALESCE($6, descripcion),
        columnas_consulta = COALESCE($7, columnas_consulta),
        orden = COALESCE($8, orden),
        activa = COALESCE($9, activa)
      WHERE id = $10
    `, [nombre, color, visible_defecto, queryable, z_index, descripcion,
        columnas_consulta, orden, activa, id]);

    if (popup_fields) {
      await client.query('DELETE FROM capas_popup_fields WHERE capa_id = $1', [id]);
      for (const [i, pf] of popup_fields.entries()) {
        await client.query(`
          INSERT INTO capas_popup_fields (capa_id, campo, etiqueta, formato, orden)
          VALUES ($1,$2,$3,$4,$5)
        `, [id, pf.campo, pf.etiqueta, pf.formato || 'text', i]);
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function remove(id) {
  await pool.query('UPDATE capas SET activa = FALSE WHERE id = $1', [id]);
}
