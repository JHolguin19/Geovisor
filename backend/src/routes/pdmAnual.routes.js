import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authMiddleware, roleMiddleware } from '../middleware/authMiddleware.js';
import { validate, schemas } from '../middleware/validate.js';
import * as ctrl from '../controllers/pdmAnual.controller.js';

const router = Router();

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    cb(null, allowed.includes(file.mimetype) || /\.xlsx?$/i.test(file.originalname));
  },
});

// Lectura — autenticado
router.get('/:year/overview',     authMiddleware, validate(schemas.pdmYear, 'params'), asyncHandler(ctrl.getYearOverview));
router.get('/:year/secretarias',  authMiddleware, validate(schemas.pdmYear, 'params'), asyncHandler(ctrl.getYearSecretarias));
router.get('/:year/pilares',      authMiddleware, validate(schemas.pdmYear, 'params'), asyncHandler(ctrl.getYearPilares));
router.get('/:year/metas',        authMiddleware, validate(schemas.pdmYear, 'params'), asyncHandler(ctrl.getYearMetas));

// Upload — solo admin/editor_geo
router.post(
  '/upload',
  authMiddleware,
  roleMiddleware(['admin', 'editor_geo']),
  upload.single('archivo'),
  asyncHandler(ctrl.uploadPdmExcel),
);

export default router;
