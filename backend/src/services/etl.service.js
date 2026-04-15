/**
 * ETL Service — Orquestador del Pipeline
 *
 * Coordina el flujo completo:
 *   extractToRaw → transformToStaging → applyGeoreferencing → validateStaging → promoteToProduction
 *
 * También gestiona:
 *   - Consulta de estado de jobs
 *   - Preview paginado de staging
 *   - Historial del pipeline
 */

import { pool } from '../db/pool.js';
import { AppError } from '../middleware/errorHandler.js';
import { extractToRaw, getRawMetadata } from './etl/extractor.js';
import { transformToStaging } from './etl/transformer.js';
import { applyGeoreferencing } from './etl/georeferencer.js';
import { validateStaging } from './etl/validator.js';
import { promoteToProduction, rejectJob } from './etl/promoter.js';

// ─────────────────────────────────────────────────────────────────────────────
// CREAR JOB DE PROCESAMIENTO
// ─────────────────────────────────────────────────────────────────────────────

async function createProcessingJob({ uploadId, secretariaId, userId, rawTable, geoMode, geoConfig, columnMapping, validationRules }) {
  const stagingTable = `stg_placeholder`; // se actualiza en transformToStaging

  const res = await pool.query(`
    INSERT INTO staging.processing_jobs (
      upload_id, raw_table, staging_table, geo_mode, geo_config,
      column_mapping, validation_rules, secretaria_id, processed_by
    ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9)
    RETURNING id
  `, [
    uploadId,
    rawTable,
    stagingTable,
    geoMode || 'none',
    JSON.stringify(geoConfig || {}),
    JSON.stringify(columnMapping || []),
    JSON.stringify(validationRules || []),
    secretariaId,
    userId,
  ]);

  return res.rows[0].id;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOG DE AUDITORÍA
// ─────────────────────────────────────────────────────────────────────────────

async function logAction({ uploadId, jobId, userId, secretariaId, accion, detalle, ipAddress }) {
  await pool.query(`
    INSERT INTO public.processing_logs (upload_id, job_id, usuario_id, secretaria_id, accion, detalle, ip_address)
    VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
  `, [uploadId || null, jobId || null, userId || null, secretariaId || null, accion, JSON.stringify(detalle || {}), ipAddress || null])
    .catch(err => console.error('Error logging action:', err.message)); // No bloquear el flujo principal
}

// ─────────────────────────────────────────────────────────────────────────────
// EXTRAER ARCHIVO A RAW
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extrae un archivo a raw. Llamado después de la subida del archivo.
 * Crea el registro de upload y extrae a raw.upload_{id}.
 */
export async function extractUploadToRaw({ file, uploadId, user }) {
  const result = await extractToRaw({ file, uploadId });

  await logAction({
    uploadId,
    userId: user.id,
    secretariaId: user.secretaria,
    accion: 'extract_raw',
    detalle: {
      rawTable: result.rawTable,
      totalRows: result.totalRows,
      columns: result.columns.length,
    },
  });

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// INICIAR PROCESAMIENTO (Raw → Staging)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inicia el pipeline de procesamiento para un upload que ya está en raw.
 *
 * @param {object} params
 * @param {number} params.uploadId
 * @param {string} params.geoMode      - 'coords' | 'join' | 'spatial' | 'none'
 * @param {object} params.geoConfig
 * @param {Array}  params.columnMapping
 * @param {Array}  params.validationRules
 * @param {object} params.user
 * @param {string} params.ipAddress
 */
export async function startProcessing({
  uploadId, geoMode, geoConfig, columnMapping, validationRules, user, ipAddress
}) {
  // ── Verificar que el upload existe y está en 'raw' ──
  const uploadRes = await pool.query(`
    SELECT u.*, s.id AS sec_id
    FROM public.uploads u
    LEFT JOIN public.secretarias s ON s.id = u.secretaria_id
    WHERE u.id = $1
  `, [uploadId]);

  if (!uploadRes.rows.length) throw new AppError('Upload no encontrado', 404);
  const upload = uploadRes.rows[0];

  // Verificar acceso
  if (!['admin', 'editor_geo'].includes(user.role) && upload.secretaria_id !== user.secretaria) {
    throw new AppError('No tienes permiso para procesar este upload', 403);
  }

  if (!['raw', 'staging', 'error'].includes(upload.etl_status)) {
    throw new AppError(`El upload no está en estado procesable (estado: ${upload.etl_status})`, 400);
  }

  // ── Obtener raw metadata ──
  const rawMeta = await getRawMetadata(uploadId);
  if (!rawMeta) {
    throw new AppError('El archivo no ha sido extraído a raw. Suba el archivo primero.', 400);
  }

  // ── Crear job ──
  const jobId = await createProcessingJob({
    uploadId,
    secretariaId: upload.secretaria_id,
    userId: user.id,
    rawTable: rawMeta.raw_table,
    geoMode,
    geoConfig,
    columnMapping,
    validationRules,
  });

  await logAction({
    uploadId, jobId,
    userId: user.id,
    secretariaId: upload.secretaria_id,
    accion: 'process_start',
    detalle: { geoMode, columnMapping: columnMapping?.length, ipAddress },
    ipAddress,
  });

  try {
    // ── Fase 1: Transformar (raw → staging tipado) ──
    const transformResult = await transformToStaging({
      jobId,
      uploadId,
      rawTable: rawMeta.raw_table,
      columnMapping,
    });

    // ── Fase 2: Georreferenciar ──
    const stagingTableName = transformResult.stagingTable.replace('staging.', '');
    const geoResult = await applyGeoreferencing({
      jobId,
      stagingTable: stagingTableName,
      geoMode,
      geoConfig,
    });

    // ── Fase 3: Validar ──
    const validationResult = await validateStaging({
      jobId,
      stagingTable: stagingTableName,
      validationRules,
    });

    await logAction({
      uploadId, jobId,
      userId: user.id,
      secretariaId: upload.secretaria_id,
      accion: 'process_complete',
      detalle: {
        ...validationResult.stats,
        geoMode,
        matched: geoResult.matched,
      },
      ipAddress,
    });

    return {
      jobId,
      stagingTable: transformResult.stagingTable,
      stats: validationResult.stats,
      geoStats: geoResult,
      errorLog: validationResult.errorLog,
    };

  } catch (err) {
    // Actualizar job como error
    await pool.query(`
      UPDATE staging.processing_jobs
      SET estado = 'error',
          error_log = $1::jsonb
      WHERE id = $2
    `, [JSON.stringify([{ error: err.message, at: new Date().toISOString() }]), jobId]).catch(() => {});

    await pool.query(`UPDATE public.uploads SET etl_status = 'error' WHERE id = $1`, [uploadId]).catch(() => {});

    await logAction({
      uploadId, jobId,
      userId: user.id,
      secretariaId: upload.secretaria_id,
      accion: 'process_error',
      detalle: { error: err.message },
      ipAddress,
    });

    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTAR JOB
// ─────────────────────────────────────────────────────────────────────────────

export async function getJob({ jobId, user }) {
  const res = await pool.query(`
    SELECT j.*,
           u.nombre_archivo, u.tipo_archivo, u.secretaria_id,
           u.etl_status, u.etl_mode
    FROM staging.processing_jobs j
    JOIN public.uploads u ON u.id = j.upload_id
    WHERE j.id = $1
  `, [jobId]);

  if (!res.rows.length) throw new AppError('Job no encontrado', 404);
  const job = res.rows[0];

  // Control de acceso
  if (!['admin', 'editor_geo'].includes(user.role) && job.secretaria_id !== user.secretaria) {
    throw new AppError('No tienes permiso para ver este job', 403);
  }

  return job;
}

// ─────────────────────────────────────────────────────────────────────────────
// PREVIEW DE STAGING (paginado)
// ─────────────────────────────────────────────────────────────────────────────

export async function getStagingPreview({ jobId, user, page = 1, limit = 50, statusFilter }) {
  const job = await getJob({ jobId, user });
  const stagingTable = job.staging_table?.replace('staging.', '');
  if (!stagingTable) throw new AppError('No hay datos en staging para este job', 404);

  const offset = (page - 1) * limit;
  const whereClause = statusFilter
    ? `WHERE _status = '${statusFilter.replace(/[^a-z]/g, '')}'`
    : '';

  const [dataRes, countRes] = await Promise.all([
    pool.query(`
      SELECT * FROM staging."${stagingTable}"
      ${whereClause}
      ORDER BY _row_id
      LIMIT $1 OFFSET $2
    `, [limit, offset]),
    pool.query(`SELECT COUNT(*) AS total FROM staging."${stagingTable}" ${whereClause}`),
  ]);

  return {
    rows:  dataRes.rows,
    total: parseInt(countRes.rows[0].total, 10),
    page,
    limit,
    pages: Math.ceil(parseInt(countRes.rows[0].total, 10) / limit),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GEOJSON DE STAGING (para mini-mapa)
// ─────────────────────────────────────────────────────────────────────────────

export async function getStagingGeoJSON({ jobId, user, limit = 2000 }) {
  const job = await getJob({ jobId, user });
  const stagingTable = job.staging_table?.replace('staging.', '');
  if (!stagingTable) throw new AppError('No hay datos en staging para este job', 404);

  const res = await pool.query(`
    SELECT ST_AsGeoJSON(geom) AS geometry, _status, _matched, _status_detail
    FROM staging."${stagingTable}"
    WHERE geom IS NOT NULL
    LIMIT $1
  `, [limit]);

  const features = res.rows.map(r => ({
    type: 'Feature',
    geometry: JSON.parse(r.geometry),
    properties: {
      _status:        r._status,
      _matched:       r._matched,
      _status_detail: r._status_detail,
    },
  }));

  return {
    type: 'FeatureCollection',
    features,
    total_with_geom: features.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMOVER A PRODUCCIÓN
// ─────────────────────────────────────────────────────────────────────────────

export async function promote({ jobId, user, options = {}, ipAddress }) {
  const result = await promoteToProduction({
    jobId,
    userId: user.id,
    user,
    ...options,
  });

  await logAction({
    uploadId: result.uploadId,
    jobId,
    userId: user.id,
    secretariaId: user.secretaria,
    accion: 'promote',
    detalle: {
      productionTable: result.productionTable,
      filasProd: result.filasProd,
      version: result.version,
    },
    ipAddress,
  });

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// RECHAZAR JOB
// ─────────────────────────────────────────────────────────────────────────────

export async function reject({ jobId, user, reason, ipAddress }) {
  const job = await getJob({ jobId, user });
  const result = await rejectJob({ jobId, userId: user.id, reason });

  await logAction({
    uploadId: job.upload_id,
    jobId,
    userId: user.id,
    secretariaId: user.secretaria,
    accion: 'reject',
    detalle: { reason },
    ipAddress,
  });

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// RE-PROCESAR UN UPLOAD (con nueva configuración)
// ─────────────────────────────────────────────────────────────────────────────

export async function reprocess({ jobId, user, newConfig, ipAddress }) {
  const job = await getJob({ jobId, user });

  // Obtener el upload original
  const uploadRes = await pool.query(
    `SELECT * FROM public.uploads WHERE id = $1`, [job.upload_id]
  );
  if (!uploadRes.rows.length) throw new AppError('Upload no encontrado', 404);

  // Marcar job actual como rechazado
  await pool.query(`
    UPDATE staging.processing_jobs SET estado = 'rechazado' WHERE id = $1
  `, [jobId]);

  // Iniciar nuevo proceso con la configuración actualizada
  return await startProcessing({
    uploadId: job.upload_id,
    geoMode:          newConfig.geoMode      || job.geo_mode,
    geoConfig:        newConfig.geoConfig     || job.geo_config,
    columnMapping:    newConfig.columnMapping || job.column_mapping,
    validationRules:  newConfig.validationRules || job.validation_rules,
    user,
    ipAddress,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTORIAL DEL PIPELINE (Dashboard)
// ─────────────────────────────────────────────────────────────────────────────

export async function getPipelineHistory({ user, secretariaId, statusFilter, page = 1, limit = 50 }) {
  const isPrivileged = ['admin', 'editor_geo'].includes(user.role);
  const targetSecretaria = isPrivileged ? (secretariaId || null) : user.secretaria;

  const conditions = [];
  const values     = [];
  let   idx        = 1;

  if (targetSecretaria) {
    conditions.push(`u.secretaria_id = $${idx++}`);
    values.push(targetSecretaria);
  }
  if (statusFilter) {
    conditions.push(`u.etl_status = $${idx++}`);
    values.push(statusFilter);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const [dataRes, countRes] = await Promise.all([
    pool.query(`
      SELECT
        u.id AS upload_id,
        u.nombre_archivo,
        u.tipo_archivo,
        u.secretaria_id,
        u.etl_status,
        u.etl_mode,
        u.estado,
        u.created_at,
        u.completed_at,
        s.nombre AS secretaria_nombre,
        s.color  AS secretaria_color,
        us.nombre_completo AS usuario_nombre,
        j.id AS job_id,
        j.estado AS job_estado,
        j.stats AS job_stats,
        j.geo_mode,
        j.staging_table,
        j.production_table,
        j.processed_at,
        j.promoted_at
      FROM public.uploads u
      LEFT JOIN public.secretarias s ON s.id = u.secretaria_id
      LEFT JOIN public.usuarios us ON us.id = u.usuario_id
      LEFT JOIN LATERAL (
        SELECT * FROM staging.processing_jobs
        WHERE upload_id = u.id
        ORDER BY created_at DESC
        LIMIT 1
      ) j ON TRUE
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, [...values, limit, offset]),
    pool.query(`
      SELECT COUNT(*) AS total
      FROM public.uploads u
      ${whereClause}
    `, values),
  ]);

  return {
    items: dataRes.rows,
    total: parseInt(countRes.rows[0].total, 10),
    page,
    limit,
    pages: Math.ceil(parseInt(countRes.rows[0].total, 10) / limit),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ESTADÍSTICAS DEL PIPELINE (para el dashboard)
// ─────────────────────────────────────────────────────────────────────────────

export async function getPipelineStats({ user, secretariaId }) {
  const isPrivileged = ['admin', 'editor_geo'].includes(user.role);
  const targetSecretaria = isPrivileged ? (secretariaId || null) : user.secretaria;

  const whereClause = targetSecretaria ? `WHERE secretaria_id = $1` : '';
  const values = targetSecretaria ? [targetSecretaria] : [];

  const res = await pool.query(`
    SELECT
      etl_status,
      COUNT(*) AS count
    FROM public.uploads
    ${whereClause}
    GROUP BY etl_status
    ORDER BY etl_status
  `, values);

  const stats = {
    legacy: 0, raw: 0, processing: 0, staging: 0,
    validated: 0, production: 0, error: 0,
  };

  for (const row of res.rows) {
    if (stats.hasOwnProperty(row.etl_status)) {
      stats[row.etl_status] = parseInt(row.count, 10);
    }
  }

  stats.total = Object.values(stats).reduce((a, b) => a + b, 0);

  return stats;
}
