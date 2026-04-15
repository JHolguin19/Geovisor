/**
 * ETL Controller — Handlers HTTP para el pipeline ETL
 * Patrón: extrae params del request → llama al service → envía response
 */

import {
  startProcessing,
  getJob,
  getStagingPreview,
  getStagingGeoJSON,
  promote,
  reject,
  reprocess,
  getPipelineHistory,
  getPipelineStats,
  extractUploadToRaw,
} from '../services/etl.service.js';

/** POST /api/etl/extract/:uploadId — Extraer upload a raw (llamado automáticamente tras subida) */
export async function extractToRaw(req, res) {
  const uploadId = parseInt(req.params.uploadId, 10);
  const result = await extractUploadToRaw({
    file:     req.body.file,   // pasado desde el upload controller
    uploadId,
    user:     req.user,
  });
  res.json({ ok: true, data: result });
}

/** POST /api/etl/process — Iniciar procesamiento (raw → staging) */
export async function processUpload(req, res) {
  const {
    upload_id,
    geo_mode,
    geo_config,
    column_mapping,
    validation_rules,
  } = req.body;

  const result = await startProcessing({
    uploadId:        parseInt(upload_id, 10),
    geoMode:         geo_mode,
    geoConfig:       geo_config || {},
    columnMapping:   column_mapping || [],
    validationRules: validation_rules || [],
    user:            req.user,
    ipAddress:       req.ip,
  });

  res.json({ ok: true, data: result });
}

/** GET /api/etl/:jobId — Estado de un job */
export async function getJobStatus(req, res) {
  const jobId = parseInt(req.params.jobId, 10);
  const job   = await getJob({ jobId, user: req.user });
  res.json({ ok: true, data: job });
}

/** GET /api/etl/:jobId/preview — Preview paginado de staging */
export async function getPreview(req, res) {
  const jobId        = parseInt(req.params.jobId, 10);
  const page         = parseInt(req.query.page, 10) || 1;
  const limit        = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const statusFilter = req.query.status || null;

  const result = await getStagingPreview({
    jobId, user: req.user, page, limit, statusFilter
  });
  res.json({ ok: true, data: result });
}

/** GET /api/etl/:jobId/errors — Filas con error o warning */
export async function getErrors(req, res) {
  const jobId  = parseInt(req.params.jobId, 10);
  const page   = parseInt(req.query.page, 10) || 1;
  const limit  = Math.min(parseInt(req.query.limit, 10) || 100, 500);

  const result = await getStagingPreview({
    jobId, user: req.user, page, limit, statusFilter: 'error'
  });
  res.json({ ok: true, data: result });
}

/** GET /api/etl/:jobId/geojson — GeoJSON de geometrías generadas en staging */
export async function getGeoJSON(req, res) {
  const jobId = parseInt(req.params.jobId, 10);
  const limit = Math.min(parseInt(req.query.limit, 10) || 2000, 5000);

  const result = await getStagingGeoJSON({ jobId, user: req.user, limit });
  res.json(result); // GeoJSON estándar directo
}

/** POST /api/etl/:jobId/promote — Promover staging → production */
export async function promoteJob(req, res) {
  const jobId = parseInt(req.params.jobId, 10);
  const {
    table_name,
    include_errors,
    create_layer,
    layer_name,
    layer_color,
  } = req.body;

  const result = await promote({
    jobId,
    user:      req.user,
    ipAddress: req.ip,
    options: {
      tableName:     table_name,
      includeErrors: include_errors === true,
      createLayer:   create_layer  === true,
      layerName:     layer_name,
      layerColor:    layer_color,
    },
  });

  res.json({ ok: true, data: result });
}

/** POST /api/etl/:jobId/reject — Rechazar job */
export async function rejectJob(req, res) {
  const jobId  = parseInt(req.params.jobId, 10);
  const reason = req.body.reason || 'Sin motivo especificado';

  const result = await reject({ jobId, user: req.user, reason, ipAddress: req.ip });
  res.json({ ok: true, data: result });
}

/** POST /api/etl/:jobId/reprocess — Re-procesar con nueva config */
export async function reprocessJob(req, res) {
  const jobId = parseInt(req.params.jobId, 10);
  const {
    geo_mode,
    geo_config,
    column_mapping,
    validation_rules,
  } = req.body;

  const result = await reprocess({
    jobId,
    user:      req.user,
    ipAddress: req.ip,
    newConfig: {
      geoMode:         geo_mode,
      geoConfig:       geo_config,
      columnMapping:   column_mapping,
      validationRules: validation_rules,
    },
  });

  res.json({ ok: true, data: result });
}

/** GET /api/etl/history — Historial del pipeline */
export async function getHistory(req, res) {
  const page         = parseInt(req.query.page, 10) || 1;
  const limit        = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const secretariaId = req.query.secretaria || null;
  const statusFilter = req.query.status    || null;

  const result = await getPipelineHistory({
    user: req.user, secretariaId, statusFilter, page, limit
  });

  res.json({ ok: true, data: result });
}

/** GET /api/etl/stats — Estadísticas del pipeline (para el dashboard) */
export async function getStats(req, res) {
  const secretariaId = req.query.secretaria || null;
  const stats = await getPipelineStats({ user: req.user, secretariaId });
  res.json({ ok: true, data: stats });
}
