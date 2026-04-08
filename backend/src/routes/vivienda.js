import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { getBeneficiariosVillamariana } from '../controllers/vivienda/villaMarianaController.js';

const router = express.Router();

router.get('/villamariana', authMiddleware, getBeneficiariosVillamariana);

export default router;
