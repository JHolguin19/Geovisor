import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { listVeredas, stats, breakdown } from '../controllers/zonaRural.controller.js';

const router = express.Router();

router.get('/veredas',    authMiddleware, listVeredas);
router.get('/stats',      authMiddleware, stats);
router.get('/breakdown',  authMiddleware, breakdown);

export default router;
