/**
 * ETL Georeferencer — Fase 3: Georreferenciación en Staging
 *
 * Responsabilidades:
 * - Aplicar georreferenciación a staging.stg_{jobId}
 * - Modo 'coords':  lat/lon → ST_MakePoint → Point geometry
 * - Modo 'join':    JOIN relacional con tabla base → copia geom o centroide
 * - Modo 'spatial': Punto existente → encontrar polígono contenedor
 * - Modo 'none':    Sin geometría
 *
 * IMPORTANTE: Usa nombres de tablas de Supabase (producción):
 *   - barriosurbanos       (no planeacion_barrios_urbanos)
 *   - predios_2025_m       (no planeacion_predios_2025)
 *   - BARR_UBA_1, BARR_UBA2, etc.
 */

import { pool } from '../../db/pool.js';
import { AppError } from '../../middleware/errorHandler.js';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Verifica que una tabla existe en el schema 'public' */
async function tableExists(client, tableName) {
  const res = await client.query(
    `SELECT to_regclass('public.' || quote_ident($1)) AS exists`,
    [tableName]
  );
  return !!res.rows[0]?.exists;
}

/** Sanitiza nombre de tabla: solo letras, números, guiones, espacios controlados */
function sanitizeRef(name) {
  // Permite: letras, números, _, -, espacios y tildes (para tablas con nombres especiales)
  if (!/^[a-zA-Z0-9_\- áéíóúñÁÉÍÓÚÑ.]+$/.test(name)) {
    throw new AppError(`Nombre de capa base inválido: "${name}"`, 400);
  }
  return name;
}

// ─────────────────────────────────────────────────────────────────────────────
// GEORREFERENCIACIÓN: COORDENADAS DIRECTAS
// ─────────────────────────────────────────────────────────────────────────────

async function georefByCoords(client, stagingTable, { latCol, lonCol }) {
  if (!latCol || !lonCol) {
    throw new AppError('Se requieren columnas de latitud y longitud para modo coordenadas', 400);
  }

  // Construir geometría desde columnas lat/lon tipadas en staging
  // Los valores ya están en el staging como TEXT o NUMERIC según el mapping
  const updateResult = await client.query(`
    UPDATE staging."${stagingTable}" t
    SET geom = ST_SetSRID(
          ST_MakePoint(
            CAST(t."${lonCol}" AS DOUBLE PRECISION),
            CAST(t."${latCol}" AS DOUBLE PRECISION)
          ), 4326
        ),
        _matched = TRUE
    WHERE t."${latCol}" IS NOT NULL
      AND t."${lonCol}" IS NOT NULL
      AND t."${latCol}"::TEXT ~ '^-?\\d+\\.?\\d*$'
      AND t."${lonCol}"::TEXT ~ '^-?\\d+\\.?\\d*$'
  `);

  // Marcar como warning las filas sin geometría válida
  await client.query(`
    UPDATE staging."${stagingTable}"
    SET _status        = 'warning',
        _status_detail = COALESCE(_status_detail || ' | ', '') ||
                         'Coordenadas inválidas o ausentes'
    WHERE geom IS NULL
      AND _status != 'error'
  `);

  // Validar y reparar geometrías
  await client.query(`
    UPDATE staging."${stagingTable}"
    SET geom = ST_MakeValid(geom)
    WHERE geom IS NOT NULL AND NOT ST_IsValid(geom)
  `);

  const matched   = updateResult.rowCount || 0;
  const countRes  = await client.query(`SELECT COUNT(*) AS t FROM staging."${stagingTable}"`);
  const total     = parseInt(countRes.rows[0].t, 10);
  const unmatched = total - matched;

  return { matched, unmatched, total };
}

// ─────────────────────────────────────────────────────────────────────────────
// GEORREFERENCIACIÓN: JOIN CON CAPA BASE
// ─────────────────────────────────────────────────────────────────────────────

async function georefByJoin(client, stagingTable, {
  joinLayer, joinFieldExcel, joinFieldLayer, joinGeomType = 'centroid'
}) {
  if (!joinLayer || !joinFieldExcel || !joinFieldLayer) {
    throw new AppError('Faltan parámetros: joinLayer, joinFieldExcel, joinFieldLayer', 400);
  }

  const safeLayer = sanitizeRef(joinLayer);

  // Verificar que la capa base existe
  const exists = await tableExists(client, safeLayer);
  if (!exists) {
    throw new AppError(`La capa base "${safeLayer}" no existe en la base de datos`, 400);
  }

  // Expresión de geometría: polígono completo o centroide
  const geomExpr = joinGeomType === 'polygon'
    ? `b.geom`
    : `ST_Centroid(b.geom)`;

  // JOIN relacional: lower/trim para tolerancia a espacios y mayúsculas
  const updateResult = await client.query(`
    UPDATE staging."${stagingTable}" t
    SET geom     = ${geomExpr},
        _matched = TRUE
    FROM public."${safeLayer}" b
    WHERE lower(trim(t."${joinFieldExcel}"::TEXT)) = lower(trim(b."${joinFieldLayer}"::TEXT))
      AND t.geom IS NULL
  `);

  // Marcar sin cruce como warning
  await client.query(`
    UPDATE staging."${stagingTable}"
    SET _status        = 'warning',
        _status_detail = COALESCE(_status_detail || ' | ', '') ||
                         'Sin coincidencia en la capa base "${safeLayer}"'
    WHERE geom IS NULL
      AND _status != 'error'
  `);

  // Reparar geometrías inválidas
  await client.query(`
    UPDATE staging."${stagingTable}"
    SET geom = ST_MakeValid(geom)
    WHERE geom IS NOT NULL AND NOT ST_IsValid(geom)
  `);

  const matched   = updateResult.rowCount || 0;
  const countRes  = await client.query(`SELECT COUNT(*) AS t FROM staging."${stagingTable}"`);
  const total     = parseInt(countRes.rows[0].t, 10);
  const unmatched = total - matched;

  return { matched, unmatched, total, joinLayer: safeLayer };
}

// ─────────────────────────────────────────────────────────────────────────────
// GEORREFERENCIACIÓN: SPATIAL JOIN (Punto dentro de polígono)
// ─────────────────────────────────────────────────────────────────────────────

async function georefBySpatial(client, stagingTable, {
  baseLayer, relationship = 'within', enrichField, enrichTarget
}) {
  if (!baseLayer) {
    throw new AppError('Se requiere baseLayer para modo spatial', 400);
  }

  const safeLayer = sanitizeRef(baseLayer);
  const exists = await tableExists(client, safeLayer);
  if (!exists) {
    throw new AppError(`La capa base "${safeLayer}" no existe`, 400);
  }

  // Función ST_ según tipo de relación
  const stFunc = relationship === 'intersects' ? 'ST_Intersects' : 'ST_Within';

  // Si se especifica un campo a enriquecer, tomarlo del polígono
  let setClause = '';
  if (enrichField && enrichTarget) {
    setClause = `, "${enrichTarget}" = b."${enrichField}"`;
  }

  const updateResult = await client.query(`
    UPDATE staging."${stagingTable}" t
    SET _matched = TRUE${setClause}
    FROM public."${safeLayer}" b
    WHERE ${stFunc}(t.geom, b.geom)
      AND NOT t._matched
  `);

  const matched   = updateResult.rowCount || 0;
  const countRes  = await client.query(`SELECT COUNT(*) AS t FROM staging."${stagingTable}"`);
  const total     = parseInt(countRes.rows[0].t, 10);
  const unmatched = total - matched;

  return { matched, unmatched, total };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL: applyGeoreferencing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aplica georreferenciación a la tabla staging
 *
 * @param {object} params
 * @param {number} params.jobId        - ID del processing_job
 * @param {string} params.stagingTable - Nombre de tabla: 'stg_42'
 * @param {string} params.geoMode      - 'coords' | 'join' | 'spatial' | 'none'
 * @param {object} params.geoConfig    - Configuración específica del modo
 *
 * @returns {object} Stats: { matched, unmatched, total, geoMode }
 */
export async function applyGeoreferencing({ jobId, stagingTable, geoMode, geoConfig }) {
  if (geoMode === 'none') {
    return { matched: 0, unmatched: 0, total: 0, geoMode: 'none' };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let stats = {};

    switch (geoMode) {
      case 'coords':
        stats = await georefByCoords(client, stagingTable, {
          latCol: geoConfig.lat_col,
          lonCol: geoConfig.lon_col,
        });
        break;

      case 'join':
        stats = await georefByJoin(client, stagingTable, {
          joinLayer:      geoConfig.join_layer,
          joinFieldExcel: geoConfig.join_field_excel,
          joinFieldLayer: geoConfig.join_field_layer,
          joinGeomType:   geoConfig.join_geom_type || 'centroid',
        });
        break;

      case 'spatial':
        stats = await georefBySpatial(client, stagingTable, {
          baseLayer:    geoConfig.base_layer,
          relationship: geoConfig.relationship || 'within',
          enrichField:  geoConfig.enrich_field,
          enrichTarget: geoConfig.enrich_target,
        });
        break;

      default:
        throw new AppError(`Modo de georreferenciación desconocido: "${geoMode}"`, 400);
    }

    // ── Crear índice espacial ──
    await client.query(`
      CREATE INDEX IF NOT EXISTS "idx_stg_${jobId}_geom"
      ON staging."${stagingTable}" USING GIST (geom)
      WHERE geom IS NOT NULL
    `);

    // ── Actualizar stats en el job ──
    await client.query(`
      UPDATE staging.processing_jobs
      SET stats = stats || $1::jsonb
      WHERE id = $2
    `, [JSON.stringify({ ...stats, geoMode }), jobId]);

    await client.query('COMMIT');

    return { ...stats, geoMode };

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
