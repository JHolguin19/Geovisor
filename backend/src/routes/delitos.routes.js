import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as delitosCtrl from '../controllers/delitos.controller.js';

const router = Router();

router.get('/stats',    authMiddleware, asyncHandler(delitosCtrl.getStats));
router.get('/geojson',  authMiddleware, asyncHandler(delitosCtrl.getBarriosDelitos));
router.get('/tipos',    authMiddleware, asyncHandler(delitosCtrl.getTiposDelito));
router.get('/lista',    authMiddleware, asyncHandler(delitosCtrl.getDelitos));

export default router;
