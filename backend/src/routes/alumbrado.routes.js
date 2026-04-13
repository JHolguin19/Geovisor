import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as alumbradoCtrl from '../controllers/alumbrado.controller.js';

const router = Router();

router.get('/stats', authMiddleware, asyncHandler(alumbradoCtrl.getStats));

export default router;
