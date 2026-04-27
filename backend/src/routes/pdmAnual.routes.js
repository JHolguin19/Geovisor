import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authMiddleware, roleMiddleware } from '../middleware/authMiddleware.js';
import { validate, schemas } from '../middleware/validate.js';
import * as ctrl from '../controllers/pdmAnual.controller.js';
import * as informeCtrl from '../controllers/pdmInforme.controller.js';

const router = Router();

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv',
    ];
    cb(null, allowed.includes(file.mimetype) || /\.(xlsx?|csv)$/i.test(file.originalname));
  },
});

// Trayectoria cuatrienal y comparativos (sin parámetro de año)
router.get('/trayectoria',           authMiddleware, asyncHandler(ctrl.getTrayectoria));
router.get('/comparativo',           authMiddleware, asyncHandler(ctrl.getComparativo));
router.get('/comparativo-financiero', authMiddleware, asyncHandler(ctrl.getComparativoFinanciero));

// Lectura — autenticado
router.get('/:year/overview',     authMiddleware, validate(schemas.pdmYear, 'params'), asyncHandler(ctrl.getYearOverview));
router.get('/:year/secretarias',  authMiddleware, validate(schemas.pdmYear, 'params'), asyncHandler(ctrl.getYearSecretarias));
router.get('/:year/pilares',      authMiddleware, validate(schemas.pdmYear, 'params'), asyncHandler(ctrl.getYearPilares));
router.get('/:year/metas',        authMiddleware, validate(schemas.pdmYear, 'params'), asyncHandler(ctrl.getYearMetas));

// Divergencia físico-financiero por año
router.get('/:year/divergencia', authMiddleware, validate(schemas.pdmYear, 'params'), asyncHandler(ctrl.getDivergencia));

// Export Excel por año
router.get('/:year/export', authMiddleware, validate(schemas.pdmYear, 'params'), asyncHandler(ctrl.exportYear));

// Upload — solo admin/editor_geo
router.post(
  '/upload',
  authMiddleware,
  roleMiddleware(['admin', 'editor_geo']),
  upload.single('archivo'),
  asyncHandler(ctrl.uploadPdmExcel),
);

// Informe ejecutivo IA — solo admin/editor_geo
router.post(
  '/:year/informe/generar',
  authMiddleware,
  roleMiddleware(['admin', 'editor_geo']),
  validate(schemas.pdmYear, 'params'),
  asyncHandler(informeCtrl.generarInforme),
);

router.post(
  '/:year/informe/pdf',
  authMiddleware,
  roleMiddleware(['admin', 'editor_geo']),
  validate(schemas.pdmYear, 'params'),
  asyncHandler(informeCtrl.descargarPDF),
);

export default router;
