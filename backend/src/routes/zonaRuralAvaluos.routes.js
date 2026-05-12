import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { stats, brackets, pareto, veredaImpact, geojson, propertyGeojson } from '../controllers/zonaRuralAvaluos.controller.js';

const router = express.Router();

router.get('/stats',            authMiddleware, stats);
router.get('/brackets',         authMiddleware, brackets);
router.get('/pareto',           authMiddleware, pareto);
router.get('/veredas',          authMiddleware, veredaImpact);
router.get('/geojson',          authMiddleware, geojson);
router.get('/geojson/predios',  authMiddleware, propertyGeojson);

export default router;
