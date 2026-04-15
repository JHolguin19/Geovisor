/**
 * ETL Routes — Endpoints del pipeline ETL
 *
 * Base: /api/etl
 *
 * POST   /api/etl/process              — Iniciar procesamiento (raw → staging)
 * GET    /api/etl/history              — Historial del pipeline
 * GET    /api/etl/stats                — Estadísticas por estado
 * GET    /api/etl/:jobId               — Estado de un job
 * GET    /api/etl/:jobId/preview       — Preview paginado de staging
 * GET    /api/etl/:jobId/errors        — Filas con error
 * GET    /api/etl/:jobId/geojson       — GeoJSON de geometrías en staging
 * POST   /api/etl/:jobId/promote       — Promover a production
 * POST   /api/etl/:jobId/reject        — Rechazar job
 * POST   /api/etl/:jobId/reprocess     — Re-procesar con nueva config
 */

import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validate, etlProcessSchema, etlPromoteSchema, etlRejectSchema, etlReprocessSchema } from '../middleware/validate.js';
import {
  processUpload,
  getJobStatus,
  getPreview,
  getErrors,
  getGeoJSON,
  promoteJob,
  rejectJob,
  reprocessJob,
  getHistory,
  getStats,
} from '../controllers/etl.controller.js';

const router = Router();

// Todas las rutas ETL requieren autenticación
router.use(authMiddleware);

// ── Rutas generales (sin :jobId) — deben ir PRIMERO ──
router.get('/history',         asyncHandler(getHistory));
router.get('/stats',           asyncHandler(getStats));
router.post('/process',        validate(etlProcessSchema), asyncHandler(processUpload));

// ── Rutas de un job específico ──
router.get('/:jobId',          asyncHandler(getJobStatus));
router.get('/:jobId/preview',  asyncHandler(getPreview));
router.get('/:jobId/errors',   asyncHandler(getErrors));
router.get('/:jobId/geojson',  asyncHandler(getGeoJSON));
router.post('/:jobId/promote', validate(etlPromoteSchema),   asyncHandler(promoteJob));
router.post('/:jobId/reject',  validate(etlRejectSchema),    asyncHandler(rejectJob));
router.post('/:jobId/reprocess', validate(etlReprocessSchema), asyncHandler(reprocessJob));

export default router;
