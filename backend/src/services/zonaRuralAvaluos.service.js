import { pool } from '../db/pool.js';

const TBL = 'planeacion_zonarural2025_avaluos';
const ANALYTICS_FILTER = 'AND (excluir_analisis IS NOT TRUE)';

/* ── Tax-bracket helpers ─────────────────────────────────────────── */

const OLD_BRACKETS = [
  { min: 0,          max: 10000000,   tarifa: 5.0,  label: '0 – 10 M'      },
  { min: 10000001,   max: 20000000,   tarifa: 5.5,  label: '10 – 20 M'     },
  { min: 20000001,   max: 40000000,   tarifa: 6.5,  label: '20 – 40 M'     },
  { min: 40000001,   max: 60000000,   tarifa: 7.0,  label: '40 – 60 M'     },
  { min: 60000001,   max: Infinity,   tarifa: 8.0,  label: '> 60 M'        },
];

const NEW_BRACKETS = [
  { min: 0,            max: 10000000,    tarifa: 5.0,   label: '0 – 10 M'      },
  { min: 10000001,     max: 40000000,    tarifa: 6.0,   label: '10 – 40 M'     },
  { min: 40000001,     max: 60000000,    tarifa: 7.0,   label: '40 – 60 M'     },
  { min: 60000001,     max: 250000000,   tarifa: 9.0,   label: '60 – 250 M'    },
  { min: 250000001,    max: 1000000000,  tarifa: 10.0,  label: '250 – 1000 M'  },
  { min: 1000000001,   max: Infinity,    tarifa: 11.0,  label: '> 1000 M'      },
];

function bracketSQL(col, brackets) {
  return brackets.map(b => {
    const cond = b.max === Infinity
      ? `${col} > ${b.min - 1}`
      : `${col} BETWEEN ${b.min} AND ${b.max}`;
    return `WHEN ${cond} THEN '${b.label}'`;
  }).join(' ');
}

function tarifaSQL(col, brackets) {
  return brackets.map(b => {
    const cond = b.max === Infinity
      ? `${col} > ${b.min - 1}`
      : `${col} BETWEEN ${b.min} AND ${b.max}`;
    return `WHEN ${cond} THEN ${b.tarifa}`;
  }).join(' ');
}

/* ── In-memory cache (TTL = 10 min) ─────────────────────────────── */

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const _cache = new Map(); // key → { data, expiresAt }

function cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { _cache.delete(key); return null; }
  return entry.data;
}

function cacheSet(key, data) {
  _cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
}

export function clearCache() {
  _cache.clear();
}

/* ── Service functions ───────────────────────────────────────────── */

/**
 * Global KPIs — overall financial impact summary.
 */
export async function getStats() {
  const cached = cacheGet('stats');
  if (cached) return cached;

  const { rows } = await pool.query(`
    SELECT
      COUNT(*)                                                   AS total_predios,
      COUNT(DISTINCT nombre)                                     AS total_veredas,
      ROUND(AVG(avaluo_nuevo)::numeric, 0)                       AS avg_avaluo_nuevo,
      ROUND(AVG(avaluo_antiguo)::numeric, 0)                     AS avg_avaluo_antiguo,
      ROUND(AVG(CASE WHEN avaluo_antiguo > 0
        THEN ((avaluo_nuevo::float / avaluo_antiguo) - 1) * 100 END)::numeric, 1)
                                                                 AS avg_pct_incremento,
      SUM(avaluo_nuevo)                                          AS suma_avaluo_nuevo,
      SUM(avaluo_antiguo)                                        AS suma_avaluo_antiguo,
      SUM(avaluo_nuevo - avaluo_antiguo)                         AS diferencia_total,

      -- Revenue with OLD brackets applied to OLD valuations
      ROUND(SUM(avaluo_antiguo * (CASE ${tarifaSQL('avaluo_antiguo', OLD_BRACKETS)} END) / 1000)::numeric, 0)
                                                                 AS recaudo_antiguo_old_tarifa,
      -- Revenue with NEW brackets applied to NEW valuations
      ROUND(SUM(avaluo_nuevo   * (CASE ${tarifaSQL('avaluo_nuevo',   NEW_BRACKETS)} END) / 1000)::numeric, 0)
                                                                 AS recaudo_nuevo_new_tarifa,
      -- Revenue with OLD brackets applied to NEW valuations (what would happen if rates hadn't changed)
      ROUND(SUM(avaluo_nuevo   * (CASE ${tarifaSQL('avaluo_nuevo',   OLD_BRACKETS)} END) / 1000)::numeric, 0)
                                                                 AS recaudo_nuevo_old_tarifa,

      MIN(avaluo_nuevo)  AS min_nuevo,   MAX(avaluo_nuevo)  AS max_nuevo,
      MIN(avaluo_antiguo) AS min_antiguo, MAX(avaluo_antiguo) AS max_antiguo
    FROM ${TBL}
    WHERE avaluo_nuevo IS NOT NULL AND avaluo_antiguo IS NOT NULL ${ANALYTICS_FILTER}
  `);
  cacheSet('stats', rows[0]);
  return rows[0];
}

/**
 * Distribution by NEW tax brackets.
 */
export async function getBracketDistribution() {
  const cached = cacheGet('brackets');
  if (cached) return cached;

  const { rows } = await pool.query(`
    SELECT
      CASE ${bracketSQL('avaluo_nuevo', NEW_BRACKETS)} END   AS rango,
      CASE ${tarifaSQL('avaluo_nuevo', NEW_BRACKETS)} END    AS tarifa,
      COUNT(*)                                                AS predios,
      ROUND(SUM(avaluo_nuevo)::numeric, 0)                    AS suma_avaluo,
      ROUND(SUM(avaluo_nuevo * (CASE ${tarifaSQL('avaluo_nuevo', NEW_BRACKETS)} END) / 1000)::numeric, 0)
                                                              AS recaudo_estimado
    FROM ${TBL}
    WHERE avaluo_nuevo IS NOT NULL ${ANALYTICS_FILTER}
    GROUP BY 1, 2
    ORDER BY tarifa
  `);

  const { rows: oldRows } = await pool.query(`
    SELECT
      CASE ${bracketSQL('avaluo_antiguo', OLD_BRACKETS)} END AS rango,
      CASE ${tarifaSQL('avaluo_antiguo', OLD_BRACKETS)} END  AS tarifa,
      COUNT(*)                                                AS predios,
      ROUND(SUM(avaluo_antiguo)::numeric, 0)                  AS suma_avaluo,
      ROUND(SUM(avaluo_antiguo * (CASE ${tarifaSQL('avaluo_antiguo', OLD_BRACKETS)} END) / 1000)::numeric, 0)
                                                              AS recaudo_estimado
    FROM ${TBL}
    WHERE avaluo_antiguo IS NOT NULL ${ANALYTICS_FILTER}
    GROUP BY 1, 2
    ORDER BY tarifa
  `);

  const result = { nuevo: rows, antiguo: oldRows, brackets: { old: OLD_BRACKETS, new: NEW_BRACKETS } };
  cacheSet('brackets', result);
  return result;
}

/**
 * Pareto data — properties sorted by tax contribution (desc), with cumulative %.
 */
export async function getParetoData() {
  const cached = cacheGet('pareto');
  if (cached) return cached;

  const { rows } = await pool.query(`
    WITH taxed AS (
      SELECT
        codigo,
        nombre,
        avaluo_nuevo,
        ROUND((avaluo_nuevo * (CASE ${tarifaSQL('avaluo_nuevo', NEW_BRACKETS)} END) / 1000)::numeric, 0)
          AS impuesto
      FROM ${TBL}
      WHERE avaluo_nuevo IS NOT NULL ${ANALYTICS_FILTER}
    ),
    ranked AS (
      SELECT *,
        SUM(impuesto) OVER (ORDER BY impuesto DESC) AS acum_impuesto,
        SUM(impuesto) OVER ()                        AS total_impuesto,
        ROW_NUMBER() OVER (ORDER BY impuesto DESC)   AS rn,
        COUNT(*) OVER ()                             AS total_predios
      FROM taxed
    )
    SELECT
      rn,
      total_predios,
      impuesto,
      acum_impuesto,
      total_impuesto,
      ROUND((rn::numeric / total_predios) * 100, 2)            AS pct_predios,
      ROUND((acum_impuesto::numeric / total_impuesto) * 100, 2) AS pct_acum_recaudo
    FROM ranked
    WHERE rn IN (1,
      GREATEST(1, ROUND(total_predios * 0.01)),
      GREATEST(1, ROUND(total_predios * 0.02)),
      GREATEST(1, ROUND(total_predios * 0.05)),
      GREATEST(1, ROUND(total_predios * 0.10)),
      GREATEST(1, ROUND(total_predios * 0.15)),
      GREATEST(1, ROUND(total_predios * 0.20)),
      GREATEST(1, ROUND(total_predios * 0.30)),
      GREATEST(1, ROUND(total_predios * 0.40)),
      GREATEST(1, ROUND(total_predios * 0.50)),
      GREATEST(1, ROUND(total_predios * 0.60)),
      GREATEST(1, ROUND(total_predios * 0.70)),
      GREATEST(1, ROUND(total_predios * 0.80)),
      GREATEST(1, ROUND(total_predios * 0.90)),
      GREATEST(1, ROUND(total_predios * 0.95)),
      total_predios)
    ORDER BY rn;
  `);
  cacheSet('pareto', rows);
  return rows;
}

/**
 * Per-vereda financial impact.
 */
export async function getVeredaImpact() {
  const cached = cacheGet('veredaImpact');
  if (cached) return cached;

  const { rows } = await pool.query(`
    SELECT
      COALESCE(nombre, '(Sin nombre)') AS vereda,
      COUNT(*)                          AS predios,
      ROUND(AVG(avaluo_nuevo)::numeric, 0)    AS avg_avaluo_nuevo,
      ROUND(AVG(avaluo_antiguo)::numeric, 0)  AS avg_avaluo_antiguo,
      ROUND(((AVG(avaluo_nuevo::numeric) / NULLIF(AVG(avaluo_antiguo::numeric), 0)) - 1) * 100, 1)
                                               AS avg_pct_incremento,
      ROUND(SUM(avaluo_nuevo * (CASE ${tarifaSQL('avaluo_nuevo', NEW_BRACKETS)} END) / 1000)::numeric, 0)
                                               AS recaudo_nuevo,
      ROUND(SUM(avaluo_antiguo * (CASE ${tarifaSQL('avaluo_antiguo', OLD_BRACKETS)} END) / 1000)::numeric, 0)
                                               AS recaudo_antiguo,
      ROUND(AVG(avaluo_nuevo * (CASE ${tarifaSQL('avaluo_nuevo', NEW_BRACKETS)} END) / 1000)::numeric, 0)
                                               AS avg_impuesto_nuevo,
      ROUND(AVG(avaluo_antiguo * (CASE ${tarifaSQL('avaluo_antiguo', OLD_BRACKETS)} END) / 1000)::numeric, 0)
                                               AS avg_impuesto_antiguo,
      SUM(avaluo_nuevo)                        AS suma_avaluo_nuevo,
      SUM(avaluo_antiguo)                      AS suma_avaluo_antiguo
    FROM ${TBL}
    WHERE avaluo_nuevo IS NOT NULL AND avaluo_antiguo IS NOT NULL ${ANALYTICS_FILTER}
    GROUP BY nombre
    ORDER BY avg_pct_incremento DESC NULLS LAST
  `);
  cacheSet('veredaImpact', rows);
  return rows;
}

/**
 * Aggregated GeoJSON by vereda — reads from the materialized view (fast, <200 ms).
 * The MV was created by migration 021 and pre-computes ST_Union per vereda.
 */
export async function getGeoJSON({ mode = 'incremento_pct' } = {}) {
  const cacheKey = `geojson_vereda_${mode}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const { rows } = await pool.query(`
    SELECT jsonb_build_object(
      'type', 'FeatureCollection',
      'features', COALESCE(jsonb_agg(f.feature), '[]'::jsonb)
    ) AS geojson
    FROM (
      SELECT jsonb_build_object(
        'type', 'Feature',
        'geometry', ST_AsGeoJSON(geom, 5)::jsonb,
        'properties', jsonb_build_object(
          'vereda',         vereda,
          'predios',        predios,
          'avaluo_nuevo',   avaluo_nuevo,
          'avaluo_antiguo', avaluo_antiguo,
          'incremento_pct', incremento_pct,
          'impuesto_nuevo', impuesto_nuevo,
          'recaudo_nuevo',  recaudo_nuevo
        )
      ) AS feature
      FROM mv_zonarural_avaluos_vereda
    ) f
  `);

  const result = rows[0]?.geojson || { type: 'FeatureCollection', features: [] };
  cacheSet(cacheKey, result);
  return result;
}

/**
 * Property-level GeoJSON — individual polygons with tax/valuation data.
 * Supports optional vereda filter for performance.
 */
export async function getPropertyGeoJSON({ vereda = null, colorBy = 'impuesto' } = {}) {
  const cacheKey = `geojson_predios_${vereda || 'all'}_${colorBy}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const veredaFilter = vereda ? `AND nombre = $1` : '';
  const params = vereda ? [vereda] : [];

  const { rows } = await pool.query(`
    SELECT jsonb_build_object(
      'type', 'FeatureCollection',
      'features', COALESCE(jsonb_agg(f.feature), '[]'::jsonb)
    ) AS geojson
    FROM (
      SELECT jsonb_build_object(
        'type', 'Feature',
        'geometry', ST_AsGeoJSON(ST_Simplify(geom, 0.00005), 5)::jsonb,
        'properties', jsonb_build_object(
          'codigo',          codigo,
          'vereda',          COALESCE(nombre, '(Sin nombre)'),
          'propietario',     propietario,
          'avaluo_nuevo',    avaluo_nuevo,
          'avaluo_antiguo',  avaluo_antiguo,
          'area_predio',     area_predio,
          'area_construida', area_construida,
          'incremento_pct',  CASE WHEN avaluo_antiguo > 0 AND avaluo_nuevo IS NOT NULL
            THEN ROUND((((avaluo_nuevo::float / avaluo_antiguo) - 1) * 100)::numeric, 1)
            ELSE NULL END,
          'impuesto_nuevo',  CASE WHEN avaluo_nuevo IS NOT NULL
            THEN ROUND((avaluo_nuevo * (CASE ${tarifaSQL('avaluo_nuevo', NEW_BRACKETS)} END) / 1000)::numeric, 0)
            ELSE NULL END,
          'impuesto_antiguo', CASE WHEN avaluo_antiguo IS NOT NULL
            THEN ROUND((avaluo_antiguo * (CASE ${tarifaSQL('avaluo_antiguo', OLD_BRACKETS)} END) / 1000)::numeric, 0)
            ELSE NULL END,
          'tarifa_nueva',    CASE WHEN avaluo_nuevo IS NOT NULL THEN CASE ${tarifaSQL('avaluo_nuevo', NEW_BRACKETS)} END ELSE NULL END,
          'rango_nuevo',     CASE WHEN avaluo_nuevo IS NOT NULL THEN CASE ${bracketSQL('avaluo_nuevo', NEW_BRACKETS)} END ELSE NULL END
        )
      ) AS feature
      FROM ${TBL}
      WHERE geom IS NOT NULL ${veredaFilter}
    ) f
  `, params);

  const result = rows[0]?.geojson || { type: 'FeatureCollection', features: [] };
  cacheSet(cacheKey, result);
  return result;
}

/**
 * Refresh the materialized view and clear the in-memory cache.
 * Called from the /refresh endpoint (admin only).
 */
export async function refreshMaterializedView() {
  await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_zonarural_avaluos_vereda');
  clearCache();
  return { refreshed: true };
}
