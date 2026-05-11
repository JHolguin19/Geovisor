/**
 * pdmEditor.service.js — Lógica para el editor tipo Excel del PDM
 */

import pool from '../db/pool.js';

// Campos que pueden ser editados por el usuario (whitelist de seguridad)
const EDITABLE_FIELDS = new Set([
  'meta_cuatrienio',
  'meta_pdm_2024', 'meta_pdm_2025', 'meta_pdm_2026', 'meta_pdm_2027',
  'meta_fisica_2024', 'meta_fisica_2025', 'meta_fisica_2026', 'meta_fisica_2027',
  'observaciones_2024', 'observaciones_2025', 'observaciones_2026', 'observaciones_2027',
  'compromisos_2024', 'compromisos_2025', 'compromisos_2026', 'compromisos_2027',
]);

// Campos numéricos (se convierten a float antes de guardar)
const NUMERIC_FIELDS = new Set([
  'meta_cuatrienio',
  'meta_pdm_2024', 'meta_pdm_2025', 'meta_pdm_2026', 'meta_pdm_2027',
  'meta_fisica_2024', 'meta_fisica_2025', 'meta_fisica_2026', 'meta_fisica_2027',
]);

/**
 * Devuelve todas las filas de pdm_metas con sus campos clave para el editor.
 */
export async function getGrid() {
  const { rows } = await pool.query(`
    SELECT
      id, meta_num, secretaria, descripcion_meta,
      num_pilar, nom_pilar, tipo_ponderado,
      meta_cuatrienio,
      meta_pdm_2024,   meta_pdm_2025,   meta_pdm_2026,   meta_pdm_2027,
      meta_fisica_2024, meta_fisica_2025, meta_fisica_2026, meta_fisica_2027,
      eficiencia_2024,  eficiencia_2025,  eficiencia_2026,  eficiencia_2027,
      ponderado_avance_2024, ponderado_avance_2025,
      ponderado_avance_2026, ponderado_avance_2027,
      avance_fisico, ponderado_cuatrienio, cumplimiento_cuatrienio,
      observaciones_2024, observaciones_2025, observaciones_2026, observaciones_2027,
      compromisos_2024,    compromisos_2025,    compromisos_2026,    compromisos_2027,
      -- Financial data extracted from JSONB columns (in millions)
      ROUND(COALESCE((presupuesto_2024->>'total_apropiacion')::numeric, 0) / 1000000, 2) AS apropiacion_2024,
      ROUND(COALESCE((presupuesto_2024->>'neto_registros')::numeric,    0) / 1000000, 2) AS comprometido_2024,
      ROUND(COALESCE((presupuesto_2024->>'total_obligacion')::numeric,  0) / 1000000, 2) AS obligado_2024,
      ROUND(COALESCE((presupuesto_2025->>'total_apropiacion')::numeric, 0) / 1000000, 2) AS apropiacion_2025,
      ROUND(COALESCE((presupuesto_2025->>'neto_registros')::numeric,    0) / 1000000, 2) AS comprometido_2025,
      ROUND(COALESCE((presupuesto_2025->>'total_obligacion')::numeric,  0) / 1000000, 2) AS obligado_2025,
      ROUND(COALESCE((presupuesto_2026->>'total_apropiacion')::numeric, 0) / 1000000, 2) AS apropiacion_2026,
      ROUND(COALESCE((presupuesto_2026->>'neto_registros')::numeric,    0) / 1000000, 2) AS comprometido_2026,
      ROUND(COALESCE((presupuesto_2026->>'total_obligacion')::numeric,  0) / 1000000, 2) AS obligado_2026,
      ROUND(COALESCE((presupuesto_2027->>'total_apropiacion')::numeric, 0) / 1000000, 2) AS apropiacion_2027,
      ROUND(COALESCE((presupuesto_2027->>'neto_registros')::numeric,    0) / 1000000, 2) AS comprometido_2027,
      ROUND(COALESCE((presupuesto_2027->>'total_obligacion')::numeric,  0) / 1000000, 2) AS obligado_2027
    FROM pdm_metas
    ORDER BY meta_num ASC NULLS LAST
  `);
  return rows;
}

/**
 * Guarda un batch de cambios.
 * changes: [{ meta_num, field, value }, ...]
 * Después de actualizar, recalcula eficiencia, ponderado y avance cuatrienal.
 */
export async function saveChanges(changes) {
  if (!changes?.length) return { updated: 0, errors: [] };

  const client = await pool.connect();
  let updated = 0;
  const errors = [];

  try {
    await client.query('BEGIN');

    for (const { meta_num, field, value } of changes) {
      if (!EDITABLE_FIELDS.has(field)) {
        errors.push({ meta_num, field, error: 'Campo no editable' });
        continue;
      }

      let dbValue = value;
      if (NUMERIC_FIELDS.has(field)) {
        dbValue = value === '' || value === null ? null : parseFloat(value);
        if (isNaN(dbValue)) dbValue = null;
      }

      try {
        const res = await client.query(
          `UPDATE pdm_metas SET ${field} = $1 WHERE meta_num = $2`,
          [dbValue, meta_num]
        );
        if (res.rowCount > 0) updated++;
      } catch (err) {
        errors.push({ meta_num, field, error: err.message });
      }
    }

    // Recalcular eficiencia (sin cap)
    await client.query(`
      UPDATE pdm_metas
      SET
        eficiencia_2024 = meta_fisica_2024::numeric / NULLIF(meta_pdm_2024::numeric,0),
        eficiencia_2025 = meta_fisica_2025::numeric / NULLIF(meta_pdm_2025::numeric,0),
        eficiencia_2026 = meta_fisica_2026::numeric / NULLIF(meta_pdm_2026::numeric,0),
        eficiencia_2027 = meta_fisica_2027::numeric / NULLIF(meta_pdm_2027::numeric,0)
      WHERE meta_num IN (${[...new Set(changes.map(c => c.meta_num))].join(',')})
        AND (meta_pdm_2024 IS NOT NULL OR meta_pdm_2025 IS NOT NULL
          OR meta_pdm_2026 IS NOT NULL OR meta_pdm_2027 IS NOT NULL)
    `);

    // Recalcular avance_fisico + cumplimiento (sin cap)
    await client.query(`
      UPDATE pdm_metas
      SET
        avance_fisico = (
          COALESCE(meta_fisica_2024::numeric,0)+COALESCE(meta_fisica_2025::numeric,0)+
          COALESCE(meta_fisica_2026::numeric,0)+COALESCE(meta_fisica_2027::numeric,0)
        ) / NULLIF(meta_cuatrienio::numeric, 0),
        cumplimiento_cuatrienio = (
          COALESCE(meta_fisica_2024::numeric,0)+COALESCE(meta_fisica_2025::numeric,0)+
          COALESCE(meta_fisica_2026::numeric,0)+COALESCE(meta_fisica_2027::numeric,0)
        ) / NULLIF(meta_cuatrienio::numeric, 0) * 100
      WHERE meta_num IN (${[...new Set(changes.map(c => c.meta_num))].join(',')})
        AND meta_cuatrienio IS NOT NULL AND meta_cuatrienio::numeric != 0
    `);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return { updated, errors };
}

/**
 * Devuelve las filas actualizadas (post-save) para refrescar el grid.
 */
export async function getRows(metaNums) {
  if (!metaNums?.length) return [];
  const placeholders = metaNums.map((_, i) => `$${i + 1}`).join(',');
  const { rows } = await pool.query(
    `SELECT * FROM pdm_metas WHERE meta_num IN (${placeholders}) ORDER BY meta_num`,
    metaNums
  );
  return rows;
}
