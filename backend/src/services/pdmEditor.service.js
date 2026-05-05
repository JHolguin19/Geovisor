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
      compromisos_2024,    compromisos_2025,    compromisos_2026,    compromisos_2027
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

    // Recalcular todos los campos derivados con capping
    await client.query(`
      UPDATE pdm_metas
      SET
        eficiencia_2024 = LEAST(meta_fisica_2024::numeric / NULLIF(meta_pdm_2024::numeric,0), 1.0),
        eficiencia_2025 = LEAST(meta_fisica_2025::numeric / NULLIF(meta_pdm_2025::numeric,0), 1.0),
        eficiencia_2026 = LEAST(meta_fisica_2026::numeric / NULLIF(meta_pdm_2026::numeric,0), 1.0),
        eficiencia_2027 = LEAST(meta_fisica_2027::numeric / NULLIF(meta_pdm_2027::numeric,0), 1.0)
      WHERE meta_num IN (${[...new Set(changes.map(c => c.meta_num))].join(',')})
        AND (meta_pdm_2024 IS NOT NULL OR meta_pdm_2025 IS NOT NULL
          OR meta_pdm_2026 IS NOT NULL OR meta_pdm_2027 IS NOT NULL)
    `);

    // Recalcular avance_fisico + cumplimiento
    const cap = (f, p) =>
      `LEAST(COALESCE(${f}::numeric,0), CASE WHEN ${p} IS NOT NULL AND ${p}::numeric>0 THEN ${p}::numeric ELSE COALESCE(${f}::numeric,0) END)`;
    const c24 = cap('meta_fisica_2024', 'meta_pdm_2024');
    const c25 = cap('meta_fisica_2025', 'meta_pdm_2025');
    const c26 = cap('meta_fisica_2026', 'meta_pdm_2026');
    const c27 = cap('meta_fisica_2027', 'meta_pdm_2027');

    await client.query(`
      UPDATE pdm_metas
      SET
        avance_fisico = LEAST(CASE
          WHEN tipo_ponderado = 'Acumulativo'
            THEN GREATEST(${c24},${c25},${c26},${c27})::numeric / NULLIF(meta_cuatrienio::numeric,0)
          ELSE
            (${c24}+${c25}+${c26}+${c27})::numeric
            / NULLIF((COALESCE(meta_pdm_2024::numeric,0)+COALESCE(meta_pdm_2025::numeric,0)
                     +COALESCE(meta_pdm_2026::numeric,0)+COALESCE(meta_pdm_2027::numeric,0)),0)
        END, 1.0),
        cumplimiento_cuatrienio = LEAST(CASE
          WHEN tipo_ponderado = 'Acumulativo'
            THEN GREATEST(${c24},${c25},${c26},${c27})::numeric / NULLIF(meta_cuatrienio::numeric,0)*100
          ELSE
            (${c24}+${c25}+${c26}+${c27})::numeric
            / NULLIF((COALESCE(meta_pdm_2024::numeric,0)+COALESCE(meta_pdm_2025::numeric,0)
                     +COALESCE(meta_pdm_2026::numeric,0)+COALESCE(meta_pdm_2027::numeric,0)),0)*100
        END, 100)
      WHERE meta_num IN (${[...new Set(changes.map(c => c.meta_num))].join(',')})
        AND ((tipo_ponderado='Acumulativo' AND meta_cuatrienio IS NOT NULL AND meta_cuatrienio::numeric!=0)
          OR (tipo_ponderado!='Acumulativo' AND
              COALESCE(meta_pdm_2024::numeric,0)+COALESCE(meta_pdm_2025::numeric,0)+
              COALESCE(meta_pdm_2026::numeric,0)+COALESCE(meta_pdm_2027::numeric,0)>0))
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
