import { pool } from '../db/pool.js';

const TABLE = 'planeacion_zonarural2025';

/**
 * List all veredas with total records and unique predios (deduplicated by CODIGO).
 */
export async function getVeredas() {
  const { rows } = await pool.query(`
    SELECT
      COALESCE(nombre, '(Sin nombre)') AS vereda,
      COUNT(*)                          AS total_registros,
      COUNT(DISTINCT "CODIGO")          AS predios_unicos,
      ROUND(SUM(area_hecta)::numeric, 2) AS area_hectareas
    FROM ${TABLE}
    GROUP BY nombre
    ORDER BY nombre NULLS LAST
  `);
  return rows;
}

/**
 * Get overall stats, optionally filtered by vereda name.
 * Unique predios are deduplicated by CODIGO.
 */
export async function getStats({ vereda } = {}) {
  const params = [];
  const where = vereda && vereda !== 'TODAS'
    ? `WHERE nombre = $${params.push(vereda)}`
    : '';

  const { rows } = await pool.query(`
    SELECT
      COUNT(*)                               AS total_registros,
      COUNT(DISTINCT "CODIGO")               AS predios_unicos,
      COUNT(DISTINCT nombre)                 AS total_veredas,
      ROUND(SUM(area_hecta)::numeric, 2)     AS area_total_ha,
      ROUND(AVG(area_hecta)::numeric, 4)     AS area_promedio_ha,
      MIN(nombre)                            AS vereda_nombre
    FROM ${TABLE}
    ${where}
  `, params);

  return rows[0] || {};
}

/**
 * Get per-vereda breakdown table (used in "todas" view).
 */
export async function getVeredaBreakdown() {
  const { rows } = await pool.query(`
    SELECT
      COALESCE(nombre, '(Sin nombre)')       AS vereda,
      COUNT(*)                               AS total_registros,
      COUNT(DISTINCT "CODIGO")               AS predios_unicos,
      COUNT(*) - COUNT(DISTINCT "CODIGO")    AS duplicados,
      ROUND(SUM(area_hecta)::numeric, 2)     AS area_hectareas
    FROM ${TABLE}
    GROUP BY nombre
    ORDER BY predios_unicos DESC
  `);
  return rows;
}
