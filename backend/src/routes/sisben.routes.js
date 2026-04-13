import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as sisbenCtrl from '../controllers/sisben.controller.js';

const router = Router();

router.get('/uba/:ubaId',         authMiddleware, asyncHandler(sisbenCtrl.getUbaStats));
router.get('/uba/:ubaId/geojson', authMiddleware, asyncHandler(sisbenCtrl.getUbaGeoJson));

export default router;
