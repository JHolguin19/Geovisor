/**
 * Tables Routes — Gestión de tablas entre schemas
 *
 * Base: /api/tables
 *
 * GET  /api/tables/schemas              — Listar tablas por schema (raw/staging/public)
 * GET  /api/tables/:schema/:table/info  — Info de una tabla (columnas, filas, tamaño)
 * POST /api/tables/move                 — Mover tabla entre schemas
 * POST /api/tables/rename               — Renombrar tabla
 * DELETE /api/tables/:schema/:table     — Eliminar tabla
 */

import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import pool from '../db/pool.js';
import { logger } from '../utils/logger.js';

const router = Router();
router.use(authMiddleware);

// ── Solo admin puede mover/eliminar tablas ────────────────────────────────────
function adminOnly(req, res, next) {
  const role = req.user?.role ?? req.user?.rol;
  if (!['admin', 'editor_geo'].includes(role)) {
    return res.status(403).json({ error: 'Solo administradores pueden gestionar tablas.' });
  }
  next();
}

// ── Schemas permitidos (whitelist de seguridad) ───────────────────────────────
const ALLOWED_SCHEMAS = ['raw', 'staging', 'public'];

function validateSchema(schema) {
  return ALLOWED_SCHEMAS.includes(schema);
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tables/schemas — Listar todas las tablas agrupadas por schema
// ─────────────────────────────────────────────────────────────────────────────
router.get('/schemas', asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT
      t.table_schema,
      t.table_name,
      pg_size_pretty(pg_total_relation_size(
        quote_ident(t.table_schema) || '.' || quote_ident(t.table_name)
      )) AS size_pretty,
      pg_total_relation_size(
        quote_ident(t.table_schema) || '.' || quote_ident(t.table_name)
      ) AS size_bytes,
      (
        SELECT COUNT(*)::INTEGER
        FROM information_schema.columns c
        WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name
      ) AS column_count,
      obj_description(
        (quote_ident(t.table_schema) || '.' || quote_ident(t.table_name))::regclass,
        'pg_class'
      ) AS description,
      -- Filas aproximadas desde pg_stat
      COALESCE(
        (SELECT n_live_tup::INTEGER FROM pg_stat_user_tables
         WHERE schemaname = t.table_schema AND relname = t.table_name),
        0
      ) AS approx_rows
    FROM information_schema.tables t
    WHERE t.table_schema IN ('raw', 'staging', 'public')
      AND t.table_type = 'BASE TABLE'
      -- Excluir tablas del sistema y de control
      AND t.table_name NOT IN (
        'secretarias','usuarios','uploads','capas','geo_tablas',
        'refresh_tokens','processing_logs','dataset_versions',
        'spatial_ref_sys','geography_columns','geometry_columns',
        'raster_columns','raster_overviews'
      )
    ORDER BY t.table_schema, pg_total_relation_size(
      quote_ident(t.table_schema) || '.' || quote_ident(t.table_name)
    ) DESC
  `);

  // Agrupar por schema
  const grouped = { raw: [], staging: [], public: [] };
  for (const row of result.rows) {
    const schema = row.table_schema;
    if (grouped[schema]) {
      grouped[schema].push({
        tableName:   row.table_name,
        schema,
        sizePretty:  row.size_pretty,
        sizeBytes:   parseInt(row.size_bytes, 10),
        columnCount: row.column_count,
        approxRows:  row.approx_rows,
        description: row.description,
      });
    }
  }

  // Intentar cruzar con uploads para saber el nombre del archivo origen
  const uploadsRes = await pool.query(`
    SELECT u.id, u.nombre_archivo, u.etl_status, u.secretaria_id,
           s.nombre AS secretaria_nombre, s.color AS secretaria_color,
           j.staging_table, j.production_table, j.id AS job_id
    FROM public.uploads u
    LEFT JOIN public.secretarias s ON s.id = u.secretaria_id
    LEFT JOIN LATERAL (
      SELECT id, staging_table, production_table
      FROM staging.processing_jobs
      WHERE upload_id = u.id
      ORDER BY created_at DESC LIMIT 1
    ) j ON TRUE
    WHERE u.etl_status != 'legacy' OR u.tabla_destino IS NOT NULL
  `).catch(err => { logger.warn({ err }, 'tables/schemas: no se pudo cruzar con uploads'); return { rows: [] }; });

  // Construir mapa tabla→upload para enriquecer las tablas
  const uploadByTable = {};
  for (const u of uploadsRes.rows) {
    if (u.staging_table)    uploadByTable[u.staging_table]    = u;
    if (u.production_table) uploadByTable[u.production_table] = u;
    if (u.tabla_destino)    uploadByTable[`public.${u.tabla_destino}`] = u;
  }

  // Enriquecer cada tabla con info del upload
  for (const schema of ALLOWED_SCHEMAS) {
    grouped[schema] = grouped[schema].map(t => {
      const key = `${t.schema}.${t.tableName}`;
      const upload = uploadByTable[key] || uploadByTable[t.tableName];
      return { ...t, upload: upload || null };
    });
  }

  res.json({ schemas: grouped });
}));

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tables/:schema/:table/info — Columnas y muestra
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:schema/:table/info', asyncHandler(async (req, res) => {
  const { schema, table } = req.params;
  if (!validateSchema(schema)) return res.status(400).json({ error: 'Schema no permitido.' });

  // Columnas
  const colsRes = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = $1 AND table_name = $2
    ORDER BY ordinal_position
  `, [schema, table]);

  // Conteo exacto (solo si tabla pequeña para no bloquear)
  let exactCount = null;
  try {
    const cntRes = await pool.query(
      `SELECT COUNT(*) AS n FROM ${JSON.stringify(schema)}.${JSON.stringify(table)} LIMIT 1`
    );
    exactCount = parseInt(cntRes.rows[0]?.n || 0, 10);
  } catch { /* tabla puede no existir */ }

  res.json({ columns: colsRes.rows, rowCount: exactCount });
}));

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/tables/move — Mover tabla entre schemas
// Body: { fromSchema, fromTable, toSchema, toName? }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/move', adminOnly, asyncHandler(async (req, res) => {
  const { fromSchema, fromTable, toSchema, toName } = req.body;

  if (!fromSchema || !fromTable || !toSchema) {
    return res.status(400).json({ error: 'Se requieren fromSchema, fromTable y toSchema.' });
  }
  if (!validateSchema(fromSchema) || !validateSchema(toSchema)) {
    return res.status(400).json({ error: 'Schema no permitido.' });
  }
  if (fromSchema === toSchema) {
    return res.status(400).json({ error: 'El schema origen y destino son iguales.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Mover schema
    const safeFrom  = `"${fromSchema}"."${fromTable.replace(/"/g, '')}"`;
    const safeTo    = `"${toSchema}"`;
    await client.query(`ALTER TABLE ${safeFrom} SET SCHEMA ${safeTo}`);

    // Renombrar si se indicó un nombre nuevo
    const newName = toName?.replace(/[^a-zA-Z0-9_ ]/g, '_');
    if (newName && newName !== fromTable) {
      const movedRef = `"${toSchema}"."${fromTable.replace(/"/g, '')}"`;
      await client.query(
        `ALTER TABLE ${movedRef} RENAME TO "${newName.replace(/"/g, '')}"`
      );
    }

    await client.query('COMMIT');
    res.json({
      ok: true,
      message: `Tabla movida de ${fromSchema}.${fromTable} → ${toSchema}.${newName || fromTable}`,
      newLocation: { schema: toSchema, table: newName || fromTable },
    });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/tables/rename — Renombrar tabla dentro del mismo schema
// Body: { schema, oldName, newName }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/rename', adminOnly, asyncHandler(async (req, res) => {
  const { schema, oldName, newName } = req.body;
  if (!schema || !oldName || !newName) {
    return res.status(400).json({ error: 'Se requieren schema, oldName y newName.' });
  }
  if (!validateSchema(schema)) {
    return res.status(400).json({ error: 'Schema no permitido.' });
  }

  const safeRef     = `"${schema}"."${oldName.replace(/"/g, '')}"`;
  const safeNewName = newName.replace(/[^a-zA-Z0-9_ ]/g, '_');
  await pool.query(`ALTER TABLE ${safeRef} RENAME TO "${safeNewName.replace(/"/g, '')}"`);

  res.json({ ok: true, message: `Tabla renombrada a ${schema}.${safeNewName}` });
}));

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/tables/:schema/:table — Eliminar tabla
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:schema/:table', adminOnly, asyncHandler(async (req, res) => {
  const { schema, table } = req.params;
  if (!validateSchema(schema)) {
    return res.status(400).json({ error: 'Schema no permitido.' });
  }

  const safeRef = `"${schema}"."${table.replace(/"/g, '')}"`;
  await pool.query(`DROP TABLE IF EXISTS ${safeRef}`);

  res.json({ ok: true, message: `Tabla ${schema}.${table} eliminada.` });
}));

export default router;
