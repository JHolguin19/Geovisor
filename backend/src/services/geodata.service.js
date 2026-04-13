import { pool } from '../db/pool.js';
import { detectGeomColumn } from '../utils/geoUtils.js';
import { AppError } from '../middleware/errorHandler.js';

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

export async function getGeoJsonForTable(tableName, { bbox, q, searchFields, simplify, cols, limit: limitParam }) {
  const allowed = await getAllowedTables();
  if (!allowed.has(tableName)) throw new AppError('Tabla no permitida', 403);

  const geomCol = await detectGeomColumn(tableName);
  if (!geomCol) throw new AppError(`No se encontró columna de geometría en "${tableName}"`, 500);

  const simplifyVal = parseFloat(simplify) || 0;
  const geomExpr = simplifyVal > 0
    ? `ST_AsGeoJSON(ST_SimplifyPreserveTopology(ST_Transform("${geomCol}", 4326), ${simplifyVal}))::jsonb`
    : `ST_AsGeoJSON(ST_Transform("${geomCol}", 4326))::jsonb`;

  const innerSelect = cols
    ? `${cols.split(',').map(c => `"${c.trim()}"`).join(', ')}, "${geomCol}"`
    : '*';

  let query;
  let params = [];

  if (q && searchFields) {
    const fields = searchFields.split(',').map(f => f.trim()).filter(Boolean);
    const limit = Math.min(parseInt(limitParam) || 50, 200);
    const conditions = fields.map((f, i) => `"${f}" ILIKE $${i + 1}`).join(' OR ');
    const searchParams = fields.map(() => `%${q}%`);
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
        WHERE ${conditions}
        LIMIT ${limit}
      ) t`;
    params = searchParams;
  } else if (bbox) {
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
  return result.rows[0]?.geojson ?? { type: 'FeatureCollection', features: [] };
}
