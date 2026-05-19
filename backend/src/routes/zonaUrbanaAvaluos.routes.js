import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  barrios, stats, brackets, pareto,
  barrioImpact, barrioGeojson, propertyGeojson, refresh,
} from '../controllers/zonaUrbanaAvaluos.controller.js';

const router = express.Router();

router.get('/barrios',          authMiddleware, barrios);
router.get('/stats',            authMiddleware, stats);
router.get('/brackets',         authMiddleware, brackets);
router.get('/pareto',           authMiddleware, pareto);
router.get('/barrio-impact',    authMiddleware, barrioImpact);
router.get('/geojson',          authMiddleware, barrioGeojson);
router.get('/geojson/predios',  authMiddleware, propertyGeojson);
router.post('/refresh',         authMiddleware, refresh);

export default router;
