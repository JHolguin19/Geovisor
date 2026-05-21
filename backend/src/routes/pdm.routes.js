import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import * as pdmCtrl from '../controllers/pdm.controller.js';

const router = Router();
router.use(authMiddleware);

router.get('/overview',    asyncHandler(pdmCtrl.getOverview));
router.get('/secretarias', asyncHandler(pdmCtrl.getSecretarias));
router.get('/pilares',     asyncHandler(pdmCtrl.getPilares));
router.get('/resumen',     asyncHandler(pdmCtrl.getResumen));
router.get('/:id',         asyncHandler(pdmCtrl.getById));
router.get('/',            asyncHandler(pdmCtrl.list));

export default router;
