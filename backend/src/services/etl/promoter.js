/**
 * ETL Promoter — Fase 5: Staging → Production (public)
 *
 * Responsabilidades:
 * - Copiar filas válidas de staging.stg_{jobId} → public.{tabla}
 * - Excluir filas con _status = 'error' (opcional, configurable)
 * - Registrar en geo_tablas
 * - Registrar en dataset_versions (versionamiento)
 * - Actualizar uploads.etl_status = 'production'
 * - Crear capa en capas (opcional)
 */

import { pool } from '../../db/pool.js';
import { sanitizeTableName } from '../../utils/tableUtils.js';
import { AppError } from '../../middleware/errorHandler.js';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Obtiene las columnas de la tabla staging (excluyendo las de control) */
async function getStagingColumns(client, stagingTable) {
  const CONTROL_COLS = ['_row_id', '_source_row', '_status', '_status_detail', '_matched', 'geom'];

  const res = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'staging'
      AND table_name   = $1
      AND column_name NOT IN (${CONTROL_COLS.map((_, i) => `$${i + 2}`).join(', ')})
    ORDER BY ordinal_position
  `, [stagingTable, ...CONTROL_COLS]);

  return res.rows; // [{column_name, data_type}]
}

/** Detecta el tipo de geometría predominante en la tabla staging */
async function detectGeomType(client, stagingTable) {
  const res = await client.query(`
    SELECT
      CASE
        WHEN upper(GeometryType(geom)) LIKE '%POINT%'   THEN 'point'
        WHEN upper(GeometryType(geom)) LIKE '%POLYGON%' THEN 'polygon'
        WHEN upper(GeometryType(geom)) LIKE '%LINE%'    THEN 'line'
        ELSE 'geometry'
      END AS tipo,
      COUNT(*) AS cnt
    FROM staging."${stagingTable}"
    WHERE geom IS NOT NULL
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 1
  `);
  return res.rows[0]?.tipo || 'geometry';
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL: promoteToProduction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Promueve datos de staging a production (public schema)
 *
 * @param {object} params
 * @param {number} params.jobId          - ID del processing_job
 * @param {number} params.userId         - ID del usuario que aprueba
 * @param {object} params.user           - { role, secretaria }
 * @param {string} [params.tableName]    - Nombre personalizado para la tabla de producción
 * @param {boolean} [params.includeErrors=false] - Si incluir filas con _status='error'
 * @param {boolean} [params.createLayer=false]   - Si crear entrada en tabla 'capas'
 * @param {string}  [params.layerName]   - Nombre de la capa (si createLayer=true)
 * @param {string}  [params.layerColor]  - Color hex de la capa
 *
 * @returns {object} Info de promoción
 */
export async function promoteToProduction({
  jobId, userId, user,
  tableName: customTableName,
  includeErrors = false,
  createLayer   = false,
  layerName,
  layerColor = '#3B82F6',
}) {
  // ── 1. Obtener el job y validar ──
  const jobRes = await pool.query(`
    SELECT j.*, u.nombre_archivo, u.secretaria_id
    FROM staging.processing_jobs j
    JOIN public.uploads u ON u.id = j.upload_id
    WHERE j.id = $1
  `, [jobId]);

  if (!jobRes.rows.length) throw new AppError('Job de procesamiento no encontrado', 404);
  const job = jobRes.rows[0];

  // Control de acceso: secretaría solo puede promover sus propios datos
  if (!['admin', 'editor_geo'].includes(user.role) && job.secretaria_id !== user.secretaria) {
    throw new AppError('No tienes permiso para publicar estos datos', 403);
  }

  if (!['completado', 'validado'].includes(job.estado)) {
    throw new AppError(`El job debe estar en estado 'completado' o 'validado' para promover (estado actual: ${job.estado})`, 400);
  }

  const stagingTable = job.staging_table?.replace('staging.', '');
  if (!stagingTable) throw new AppError('El job no tiene tabla staging asociada', 400);

  // ── 2. Generar nombre de tabla de producción ──
  const baseTableName = customTableName
    ? sanitizeTableName(customTableName)
    : sanitizeTableName(job.nombre_archivo);

  const productionTable = `${baseTableName}_${Date.now()}`;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── 3. Obtener columnas de staging ──
    const stagingCols = await getStagingColumns(client, stagingTable);
    if (!stagingCols.length) throw new AppError('La tabla staging no tiene columnas de datos', 400);

    const colDefs = stagingCols.map(c => `"${c.column_name}" ${c.data_type.toUpperCase()}`).join(',\n  ');
    const colList = stagingCols.map(c => `"${c.column_name}"`).join(', ');

    // ── 4. Crear tabla de producción ──
    await client.query(`
      CREATE TABLE public."${productionTable}" (
        gid SERIAL PRIMARY KEY,
        ${colDefs},
        geom GEOMETRY(Geometry, 4326)
      )
    `);

    // ── 5. Copiar datos desde staging ──
    const statusFilter = includeErrors
      ? '' // incluir todo
      : `WHERE _status != 'error'`;

    const insertResult = await client.query(`
      INSERT INTO public."${productionTable}" (${colList}, geom)
      SELECT ${colList}, geom
      FROM staging."${stagingTable}"
      ${statusFilter}
    `);

    const filasProd      = insertResult.rowCount || 0;
    const totalStaging   = parseInt((job.stats || {}).total || 0, 10);
    const filasDescartadas = totalStaging - filasProd;

    // ── 6. Crear índice espacial ──
    await client.query(`
      CREATE INDEX ON public."${productionTable}" USING GIST (geom)
      WHERE geom IS NOT NULL
    `);

    // ── 7. Detectar tipo de geometría ──
    const tipoGeom = await detectGeomType(client, stagingTable);

    // ── 8. Registrar en geo_tablas ──
    await client.query(`
      INSERT INTO public.geo_tablas (
        nombre_tabla, secretaria_id, descripcion, columna_geometria,
        srid, tipo_geometria, total_features, publica, upload_id
      ) VALUES ($1, $2, $3, 'geom', 4326, $4, $5, FALSE, $6)
      ON CONFLICT (nombre_tabla) DO UPDATE SET
        total_features = EXCLUDED.total_features,
        tipo_geometria = EXCLUDED.tipo_geometria
    `, [
      productionTable,
      job.secretaria_id,
      `Dataset: ${job.nombre_archivo} (Job #${jobId})`,
      tipoGeom,
      filasProd,
      job.upload_id,
    ]);

    // ── 9. Versión en dataset_versions ──
    // Desactivar versiones anteriores del mismo upload
    await client.query(`
      UPDATE public.dataset_versions SET activa = FALSE
      WHERE upload_id = $1
    `, [job.upload_id]);

    // Calcular número de versión
    const versionRes = await client.query(`
      SELECT COALESCE(MAX(version_number), 0) + 1 AS next_ver
      FROM public.dataset_versions WHERE upload_id = $1
    `, [job.upload_id]);
    const nextVersion = parseInt(versionRes.rows[0].next_ver, 10);

    await client.query(`
      INSERT INTO public.dataset_versions (
        upload_id, job_id, version_number, production_table,
        filas_produccion, filas_descartadas, promoted_by, activa
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
    `, [job.upload_id, jobId, nextVersion, productionTable, filasProd, filasDescartadas, userId]);

    // ── 10. Actualizar el job como promovido ──
    await client.query(`
      UPDATE staging.processing_jobs
      SET estado           = 'promovido',
          production_table = $1,
          promoted_by      = $2,
          promoted_at      = NOW()
      WHERE id = $3
    `, [productionTable, userId, jobId]);

    // ── 11. Actualizar uploads ──
    await client.query(`
      UPDATE public.uploads
      SET etl_status    = 'production',
          tabla_destino = $1,
          estado        = 'completado',
          completed_at  = NOW()
      WHERE id = $2
    `, [productionTable, job.upload_id]);

    // ── 12. Crear capa (opcional) ──
    if (createLayer && layerName) {
      const capaId = `${job.secretaria_id}_${sanitizeTableName(layerName)}_${Date.now()}`;
      await client.query(`
        INSERT INTO public.capas (
          id, nombre, secretaria_id, tabla_postgis, color,
          visible_defecto, queryable, z_index, tipo_geometria,
          activa, orden, created_by
        ) VALUES ($1, $2, $3, $4, $5, FALSE, TRUE, 1, $6, TRUE, 0, $7)
        ON CONFLICT (id) DO NOTHING
      `, [capaId, layerName, job.secretaria_id, productionTable, layerColor, tipoGeom, userId]);
    }

    await client.query('COMMIT');

    return {
      message:          'Datos publicados en producción exitosamente',
      productionTable,
      filasProd,
      filasDescartadas,
      tipoGeom,
      version:          nextVersion,
      uploadId:         job.upload_id,
      jobId,
    };

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Rechaza un job de procesamiento (no promueve a producción)
 */
export async function rejectJob({ jobId, userId, reason }) {
  const res = await pool.query(`
    UPDATE staging.processing_jobs
    SET estado       = 'rechazado',
        validated_by = $1,
        validated_at = NOW(),
        error_log    = error_log || $2::jsonb
    WHERE id = $3
    RETURNING upload_id
  `, [userId, JSON.stringify([{ rejected_by: userId, reason, at: new Date().toISOString() }]), jobId]);

  if (!res.rows.length) throw new AppError('Job no encontrado', 404);

  // Revertir etl_status a 'raw' para que pueda re-procesarse
  await pool.query(`
    UPDATE public.uploads SET etl_status = 'raw'
    WHERE id = $1
  `, [res.rows[0].upload_id]);

  return { message: 'Job rechazado. El upload puede re-procesarse.', jobId };
}
