import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validate, schemas } from '../middleware/validate.js';
import * as uploadsCtrl from '../controllers/uploads.controller.js';

const router = Router();

const upload = multer({
  dest: '/tmp/geovisor_uploads/',
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (['csv', 'xls', 'xlsx', 'json', 'geojson'].includes(ext)) return cb(null, true);
    cb(new Error('Tipo de archivo no soportado. Use CSV, Excel o GeoJSON.'));
  }
});

// Analizar archivo sin guardarlo (retorna columnas + preview + detección)
router.post('/analyze', authMiddleware, upload.single('archivo'), asyncHandler(uploadsCtrl.analyze));

// Capas base disponibles para cruce
router.get('/base-layers', authMiddleware, asyncHandler(uploadsCtrl.baseLayers));

// Campos de una capa base específica
router.get('/base-layer-fields/:tableName', authMiddleware, asyncHandler(uploadsCtrl.baseLayerFields));

// Upload principal
router.post('/', authMiddleware, upload.single('archivo'), validate(schemas.upload), asyncHandler(uploadsCtrl.upload));

// Historial
router.get('/', authMiddleware, asyncHandler(uploadsCtrl.list));

// Eliminar upload (tabla PostGIS + registros DB)
router.delete('/:id', authMiddleware, asyncHandler(uploadsCtrl.deleteUpload));

export default router;
