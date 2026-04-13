import { pool } from '../db/pool.js';
import { detectGeomColumn, detectNameColumn, findSisbenTable } from '../utils/geoUtils.js';
import { AppError } from '../middleware/errorHandler.js';

const UBA_TABLE_MAP = {
  uba1: 'planeacion_uba1',
  uba2: 'planeacion_uba2',
  uba3: 'planeacion_uba3',
  uba4: 'planeacion_uba4',
  uba5: 'planeacion_uba5',
  ubac: 'planeacion_ubac'
};

const UBA_LABELS = {
  uba1: 'UBA 1', uba2: 'UBA 2', uba3: 'UBA 3',
  uba4: 'UBA 4', uba5: 'UBA 5', ubac: 'UBA C'
};

const SUM_FIELDS = [
  'poblacion_total', 'poblacion_hombre', 'poblacion_mujer',
  'cantidad_hogares', 'cantidad_viviendas', 'personas_sisben', 'area_m2'
];

const AVG_FIELDS = [
  'puntaje_promedio', 'ipm', 'incidencia_pobreza', 'nbi'
];

function validateUba(ubaId) {
  const ubaTable = UBA_TABLE_MAP[ubaId];
  if (!ubaTable) throw new AppError('UBA no válida', 400);
  return { ubaTable, ubaLabel: UBA_LABELS[ubaId] };
}

export async function getUbaStats(ubaId) {
  const { ubaTable, ubaLabel } = validateUba(ubaId);

  const sisbenTable = await findSisbenTable();
  if (!sisbenTable) {
    return { ubaId, ubaLabel, totalBarrios: 0, barrios: [], totals: {} };
  }

  const [sbNameCol, sbGeom, ubaNameCol] = await Promise.all([
    detectNameColumn(sisbenTable),
    detectGeomColumn(sisbenTable),
    detectNameColumn(ubaTable)
  ]);

  if (!sbNameCol || !ubaNameCol) {
    return { ubaId, ubaLabel, totalBarrios: 0, barrios: [], totals: {} };
  }

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

  return { ubaId, ubaLabel, totalBarrios: barrios.length, barrios, totals };
}

export async function getUbaGeoJson(ubaId) {
  const { ubaTable } = validateUba(ubaId);
  const emptyCollection = { type: 'FeatureCollection', features: [] };

  const sisbenTable = await findSisbenTable();
  if (!sisbenTable) return emptyCollection;

  const [sbNameCol, sbGeom, ubaNameCol] = await Promise.all([
    detectNameColumn(sisbenTable),
    detectGeomColumn(sisbenTable),
    detectNameColumn(ubaTable)
  ]);

  if (!sbNameCol || !ubaNameCol) return emptyCollection;

  let query;

  if (sbGeom) {
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
    const ubaGeom = await detectGeomColumn(ubaTable);
    if (!ubaGeom) return emptyCollection;

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
  return result.rows[0]?.geojson ?? emptyCollection;
}
