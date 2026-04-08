import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { getPredios } from '../controllers/catastro/prediosController.js';
import { getPrediosPagos2025 } from '../controllers/catastro/prediosPagos2025Controller.js';

const router = express.Router();

router.get('/predios', authMiddleware, getPredios);
router.get('/predios-pagos-2025', authMiddleware, getPrediosPagos2025);

export default router;
