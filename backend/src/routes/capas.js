import express from 'express';
import { pool } from '../db/pool.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/capas?secretariaId=planeacion
// Retorna capas de una secretaría (o todas si admin/editor_geo/sig)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { secretariaId } = req.query;
    const { role, secretaria } = req.user;

    // Determinar qué secretaría consultar
    let targetSecretaria = secretariaId;
    if (role === 'secretaria' || role === 'lector') {
      // Solo puede ver sus propias capas
      targetSecretaria = secretaria;
    }

    const query = targetSecretaria && targetSecretaria !== 'sig'
      ? `SELECT c.*, array_agg(
           json_build_object('campo', pf.campo, 'etiqueta', pf.etiqueta, 'formato', pf.formato, 'orden', pf.orden)
           ORDER BY pf.orden
         ) FILTER (WHERE pf.id IS NOT NULL) AS popup_fields
         FROM capas c
         LEFT JOIN capas_popup_fields pf ON pf.capa_id = c.id
         WHERE c.secretaria_id = $1 AND c.activa = TRUE
         GROUP BY c.id
         ORDER BY c.orden`
      : `SELECT c.*, array_agg(
           json_build_object('campo', pf.campo, 'etiqueta', pf.etiqueta, 'formato', pf.formato, 'orden', pf.orden)
           ORDER BY pf.orden
         ) FILTER (WHERE pf.id IS NOT NULL) AS popup_fields
         FROM capas c
         LEFT JOIN capas_popup_fields pf ON pf.capa_id = c.id
         WHERE c.activa = TRUE
         GROUP BY c.id
         ORDER BY c.secretaria_id, c.orden`;

    const params = targetSecretaria && targetSecretaria !== 'sig' ? [targetSecretaria] : [];
    const result = await pool.query(query, params);

    res.json({ capas: result.rows });
  } catch (err) {
    console.error('[Capas] Error:', err.message);
    res.status(500).json({ error: 'Error al obtener capas' });
  }
});

// GET /api/capas/secretarias — lista de secretarías con sus capas agrupadas
router.get('/secretarias', authMiddleware, async (req, res) => {
  try {
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
    res.json({ secretarias: result.rows });
  } catch (err) {
    console.error('[Capas] Error secretarías:', err.message);
    res.status(500).json({ error: 'Error al obtener secretarías' });
  }
});

// POST /api/capas — crear nueva capa (admin o editor_geo)
router.post('/', authMiddleware, async (req, res) => {
  const { role, id: userId } = req.user;
  if (!['admin', 'editor_geo'].includes(role)) {
    return res.status(403).json({ error: 'Sin permisos para crear capas' });
  }

  const { id, nombre, secretaria_id, tabla_postgis, color, visible_defecto,
          queryable, z_index, descripcion, columnas_consulta, tipo_geometria,
          orden, popup_fields } = req.body;

  if (!id || !nombre || !secretaria_id || !tabla_postgis) {
    return res.status(400).json({ error: 'Faltan campos requeridos: id, nombre, secretaria_id, tabla_postgis' });
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
    res.status(201).json({ message: 'Capa creada', id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Capas] Error creando capa:', err.message);
    res.status(500).json({ error: 'Error al crear capa', detail: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/capas/:id — editar capa
router.put('/:id', authMiddleware, async (req, res) => {
  const { role, secretaria } = req.user;
  const { id } = req.params;

  // Verificar que la capa existe y pertenece a su secretaría (si no es admin)
  const existing = await pool.query('SELECT * FROM capas WHERE id = $1', [id]);
  if (!existing.rows.length) return res.status(404).json({ error: 'Capa no encontrada' });

  if (role === 'secretaria' && existing.rows[0].secretaria_id !== secretaria) {
    return res.status(403).json({ error: 'Sin permisos para editar esta capa' });
  }

  const { nombre, color, visible_defecto, queryable, z_index, descripcion,
          columnas_consulta, orden, activa, popup_fields } = req.body;

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
    res.json({ message: 'Capa actualizada' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Capas] Error editando capa:', err.message);
    res.status(500).json({ error: 'Error al editar capa' });
  } finally {
    client.release();
  }
});

// DELETE /api/capas/:id — solo admin
router.delete('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Solo administradores pueden eliminar capas' });
  }
  await pool.query('UPDATE capas SET activa = FALSE WHERE id = $1', [req.params.id]);
  res.json({ message: 'Capa desactivada' });
});

export default router;
