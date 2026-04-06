import express from 'express';
import { pool } from '../db/pool.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Cache de tablas permitidas — se recarga cada 5 minutos
let allowedTablesCache = null;
let cacheExpiry = 0;

async function getAllowedTables() {
  if (allowedTablesCache && Date.now() < cacheExpiry) return allowedTablesCache;
  const result = await pool.query('SELECT nombre_tabla FROM geo_tablas');
  allowedTablesCache = new Set(result.rows.map(r => r.nombre_tabla));
  cacheExpiry = Date.now() + 5 * 60 * 1000;
  return allowedTablesCache;
}

// Detectar columna de geometría
async function detectGeomColumn(tableName) {
  const result = await pool.query(
    `SELECT f_geometry_column FROM geometry_columns
     WHERE f_table_schema = 'public' AND f_table_name = $1 LIMIT 1`,
    [tableName]
  );
  if (result.rows.length > 0) return result.rows[0].f_geometry_column;
  for (const col of ['geom', 'the_geom', 'geometry', 'shape', 'wkb_geometry']) {
    try {
      await pool.query(`SELECT "${col}" FROM "${tableName}" LIMIT 0`);
      return col;
    } catch { /* columna no existe */ }
  }
  return null;
}

// GET /api/geodata/:tableName
router.get('/:tableName', authMiddleware, async (req, res) => {
  const { tableName } = req.params;

  const allowed = await getAllowedTables();
  if (!allowed.has(tableName)) {
    return res.status(403).json({ error: 'Tabla no permitida' });
  }

  try {
    const geomCol = await detectGeomColumn(tableName);
    if (!geomCol) {
      return res.status(500).json({ error: `No se encontró columna de geometría en "${tableName}"` });
    }

    const simplify = parseFloat(req.query.simplify) || 0;
    const geomExpr = simplify > 0
      ? `ST_AsGeoJSON(ST_SimplifyPreserveTopology(ST_Transform("${geomCol}", 4326), ${simplify}))::jsonb`
      : `ST_AsGeoJSON(ST_Transform("${geomCol}", 4326))::jsonb`;

    const colsParam = req.query.cols;
    const innerSelect = colsParam
      ? `${colsParam.split(',').map(c => `"${c.trim()}"`).join(', ')}, "${geomCol}"`
      : '*';

    let query;
    let params = [];

    const { bbox } = req.query;
    if (bbox) {
      const parts = bbox.split(',').map(Number);
      if (parts.length === 4 && parts.every(n => !isNaN(n))) {
        const [minx, miny, maxx, maxy] = parts;
        query = `
          SELECT jsonb_build_object(
            'type', 'FeatureCollection',
            'features', COALESCE(jsonb_agg(
              jsonb_build_object(
                'type', 'Feature',
                'geometry', ${geomExpr},
                'properties', to_jsonb(t) - '${geomCol}'
              )
            ), '[]'::jsonb)
          ) AS geojson
          FROM (
            SELECT ${innerSelect} FROM "${tableName}"
            WHERE ST_Intersects(
              "${geomCol}",
              ST_Transform(ST_MakeEnvelope($1, $2, $3, $4, 4326), ST_SRID("${geomCol}"))
            )
            LIMIT 50000
          ) t`;
        params = [minx, miny, maxx, maxy];
      }
    }

    if (!query) {
      query = `
        SELECT jsonb_build_object(
          'type', 'FeatureCollection',
          'features', COALESCE(jsonb_agg(
            jsonb_build_object(
              'type', 'Feature',
              'geometry', ${geomExpr},
              'properties', to_jsonb(t) - '${geomCol}'
            )
          ), '[]'::jsonb)
        ) AS geojson
        FROM (SELECT ${innerSelect} FROM "${tableName}" LIMIT 50000) t`;
    }

    const result = await pool.query(query, params);
    const geojson = result.rows[0]?.geojson;
    if (!geojson) return res.json({ type: 'FeatureCollection', features: [] });

    res.json(geojson);
  } catch (err) {
    console.error(`[GeoData] Error en tabla "${tableName}":`, err.message);
    res.status(500).json({ error: 'Error al consultar la base de datos', detail: err.message });
  }
});

export default router;
