import express from 'express';
import { pool } from '../db/pool.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

const UBA_TABLE_MAP = {
  uba1: 'BARR_UBA_1',
  uba2: 'BARR_UBA2',
  uba3: 'BARR_UBA3',
  uba4: 'BARR_UBA4',
  uba5: 'BARR_UBA5',
  ubac: 'BARRIOS_UBA_C'
};

const UBA_LABELS = {
  uba1: 'UBA 1', uba2: 'UBA 2', uba3: 'UBA 3',
  uba4: 'UBA 4', uba5: 'UBA 5', ubac: 'UBA C'
};

// Campos que se suman en los totales de UBA
const SUM_FIELDS = [
  'poblacion_total', 'poblacion_hombre', 'poblacion_mujer',
  'cantidad_hogares', 'cantidad_viviendas', 'personas_sisben', 'area_m2'
];

// Campos que se promedian (tasas / índices)
const AVG_FIELDS = [
  'puntaje_promedio', 'ipm', 'incidencia_pobreza', 'nbi'
];

const NUM_FIELDS = [...SUM_FIELDS, ...AVG_FIELDS];

// Detectar columna de geometría
async function detectGeomColumn(tableName) {
  try {
    const res = await pool.query(
      `SELECT f_geometry_column FROM geometry_columns
       WHERE f_table_schema = 'public' AND f_table_name = $1 LIMIT 1`,
      [tableName]
    );
    if (res.rows.length > 0) return res.rows[0].f_geometry_column;
  } catch { /* ignorar */ }
  for (const col of ['geom', 'the_geom', 'geometry', 'shape', 'wkb_geometry']) {
    try { await pool.query(`SELECT "${col}" FROM "${tableName}" LIMIT 0`); return col; } catch { }
  }
  return null;
}

// Detectar columna de nombre de barrio
async function detectNameColumn(tableName) {
  for (const col of ['nombre', 'NOMBRE', 'nombre_barrio', 'barrio', 'nom_barrio', 'name', 'NAME']) {
    try { await pool.query(`SELECT "${col}" FROM "${tableName}" LIMIT 0`); return col; } catch { }
  }
  return null;
}

// Buscar tabla Sisben barrios (puede tener distintos nombres)
async function findSisbenTable() {
  for (const t of ['sisben_barrios', 'pg_sisben_barrios', 'sisbenbarrios', 'sisben_barr']) {
    try { await pool.query(`SELECT 1 FROM "${t}" LIMIT 0`); return t; } catch { }
  }
  return null;
}

// ── GET /api/sisben/uba/:ubaId ────────────────────────────────────────────────
// Estadísticas tabulares: parte de sisben_barrios, filtra por nombres de la UBA
router.get('/uba/:ubaId', authMiddleware, async (req, res) => {
  const { ubaId } = req.params;
  const ubaTable  = UBA_TABLE_MAP[ubaId];
  if (!ubaTable) return res.status(400).json({ error: 'UBA no válida' });

  try {
    const sisbenTable = await findSisbenTable();
    if (!sisbenTable) {
      return res.json({ ubaId, ubaLabel: UBA_LABELS[ubaId], totalBarrios: 0, barrios: [], totals: {} });
    }

    const [sbNameCol, sbGeom, ubaNameCol] = await Promise.all([
      detectNameColumn(sisbenTable),
      detectGeomColumn(sisbenTable),
      detectNameColumn(ubaTable)
    ]);

    if (!sbNameCol || !ubaNameCol) {
      return res.json({ ubaId, ubaLabel: UBA_LABELS[ubaId], totalBarrios: 0, barrios: [], totals: {} });
    }

    // Base: sisben_barrios. Filtro: solo barrios cuyos nombres están en la tabla UBA.
    const geomExclude = sbGeom ? ` - '${sbGeom}'` : '';
    const q = `
      WITH uba_names AS (
        SELECT DISTINCT LOWER(TRIM("${ubaNameCol}")) AS nombre_lower
        FROM "${ubaTable}"
        WHERE TRIM("${ubaNameCol}") != '' AND "${ubaNameCol}" IS NOT NULL
      )
      SELECT DISTINCT ON (LOWER(TRIM(sb."${sbNameCol}")))
        to_jsonb(sb.*) ${geomExclude} AS datos
      FROM "${sisbenTable}" sb
      INNER JOIN uba_names u
        ON LOWER(TRIM(sb."${sbNameCol}")) = u.nombre_lower
      WHERE TRIM(sb."${sbNameCol}") != '' AND sb."${sbNameCol}" IS NOT NULL
      ORDER BY LOWER(TRIM(sb."${sbNameCol}"))
    `;

    const result = await pool.query(q);
    const barrios = result.rows.map(r => r.datos ?? {});

    const totals = {};
    for (const f of SUM_FIELDS) {
      totals[f] = barrios.reduce((s, b) => s + (Number(b[f]) || 0), 0);
    }
    for (const f of AVG_FIELDS) {
      const vals = barrios.map(b => Number(b[f])).filter(v => !isNaN(v) && v > 0);
      totals[f] = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
    }

    res.json({ ubaId, ubaLabel: UBA_LABELS[ubaId], totalBarrios: barrios.length, barrios, totals });
  } catch (err) {
    console.error(`[Sisben UBA] ${ubaId}:`, err.message);
    res.status(500).json({ error: 'Error al consultar datos Sisben', detail: err.message });
  }
});

// ── GET /api/sisben/uba/:ubaId/geojson ────────────────────────────────────────
// GeoJSON: geometría de sisben_barrios filtrada por nombres de la UBA
router.get('/uba/:ubaId/geojson', authMiddleware, async (req, res) => {
  const { ubaId }  = req.params;
  const ubaTable   = UBA_TABLE_MAP[ubaId];
  if (!ubaTable) return res.status(400).json({ error: 'UBA no válida' });

  try {
    const sisbenTable = await findSisbenTable();
    if (!sisbenTable) {
      return res.json({ type: 'FeatureCollection', features: [] });
    }

    const [sbNameCol, sbGeom, ubaNameCol] = await Promise.all([
      detectNameColumn(sisbenTable),
      detectGeomColumn(sisbenTable),
      detectNameColumn(ubaTable)
    ]);

    if (!sbNameCol || !ubaNameCol) {
      return res.json({ type: 'FeatureCollection', features: [] });
    }

    let query;

    if (sbGeom) {
      // Caso principal: sisben_barrios tiene geometría propia → usarla directamente
      query = `
        WITH uba_names AS (
          SELECT DISTINCT LOWER(TRIM("${ubaNameCol}")) AS nombre_lower
          FROM "${ubaTable}"
          WHERE TRIM("${ubaNameCol}") != '' AND "${ubaNameCol}" IS NOT NULL
        ),
        filtered AS (
          SELECT DISTINCT ON (LOWER(TRIM(sb."${sbNameCol}")))
            sb.*
          FROM "${sisbenTable}" sb
          INNER JOIN uba_names u
            ON LOWER(TRIM(sb."${sbNameCol}")) = u.nombre_lower
          WHERE TRIM(sb."${sbNameCol}") != '' AND sb."${sbNameCol}" IS NOT NULL
          ORDER BY LOWER(TRIM(sb."${sbNameCol}"))
        )
        SELECT jsonb_build_object(
          'type', 'FeatureCollection',
          'features', COALESCE(jsonb_agg(
            jsonb_build_object(
              'type', 'Feature',
              'geometry', ST_AsGeoJSON(ST_Transform("${sbGeom}", 4326))::jsonb,
              'properties', to_jsonb(t) - '${sbGeom}'
            ) ORDER BY t."${sbNameCol}"
          ), '[]'::jsonb)
        ) AS geojson
        FROM filtered t
      `;
    } else {
      // Fallback: sisben_barrios sin geometría → geometría de la tabla UBA + datos sisben
      const ubaGeom = await detectGeomColumn(ubaTable);
      if (!ubaGeom) return res.json({ type: 'FeatureCollection', features: [] });

      query = `
        WITH sisben_filtered AS (
          SELECT DISTINCT ON (LOWER(TRIM(sb."${sbNameCol}")))
            to_jsonb(sb.*) AS datos,
            LOWER(TRIM(sb."${sbNameCol}")) AS nombre_lower
          FROM "${sisbenTable}" sb
          WHERE TRIM(sb."${sbNameCol}") != '' AND sb."${sbNameCol}" IS NOT NULL
          ORDER BY LOWER(TRIM(sb."${sbNameCol}"))
        )
        SELECT jsonb_build_object(
          'type', 'FeatureCollection',
          'features', COALESCE(jsonb_agg(
            jsonb_build_object(
              'type', 'Feature',
              'geometry', ST_AsGeoJSON(ST_Transform(uba."${ubaGeom}", 4326))::jsonb,
              'properties', (to_jsonb(uba.*) - '${ubaGeom}') || COALESCE(sf.datos, '{}'::jsonb)
            ) ORDER BY uba."${ubaNameCol}"
          ), '[]'::jsonb)
        ) AS geojson
        FROM "${ubaTable}" uba
        INNER JOIN sisben_filtered sf
          ON LOWER(TRIM(uba."${ubaNameCol}")) = sf.nombre_lower
        WHERE TRIM(uba."${ubaNameCol}") != '' AND uba."${ubaNameCol}" IS NOT NULL
      `;
    }

    const result = await pool.query(query);
    res.json(result.rows[0]?.geojson ?? { type: 'FeatureCollection', features: [] });
  } catch (err) {
    console.error(`[Sisben UBA GeoJSON] ${ubaId}:`, err.message);
    res.status(500).json({ error: 'Error al generar GeoJSON', detail: err.message });
  }
});

export default router;
