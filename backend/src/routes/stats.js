import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Datos estáticos para demo (se reemplazarán con consultas a la BD)
const UBA_STATS = {
  uba1: { predios: 2197, area: 718315, poblacion: 8500 },
  uba2: { predios: 5959, area: 1662210, poblacion: 15200 },
  uba3: { predios: 2805, area: 1054055, poblacion: 9800 },
  uba4: { predios: 3258, area: 902978, poblacion: 11200 },
  uba5: { predios: 1537, area: 608186, poblacion: 6400 },
  ubac: { predios: 2028, area: 1491423, poblacion: 4200 }
};

const USO_SUELO_STATS = [
  { nombre: 'Estanco', cantidad: 145 },
  { nombre: 'Discotecas', cantidad: 32 },
  { nombre: 'Droguerías', cantidad: 89 },
  { nombre: 'Ferreterías', cantidad: 67 },
  { nombre: 'IPS', cantidad: 45 },
  { nombre: 'Restaurantes', cantidad: 156 },
  { nombre: 'Servicios', cantidad: 234 }
];

// GET /api/stats/uba/:ubaId - Estadísticas por UBA
router.get('/uba/:ubaId', authMiddleware, (req, res) => {
  const ubaId = req.params.ubaId;

  if (UBA_STATS[ubaId]) {
    res.json({ stats: UBA_STATS[ubaId] });
  } else {
    res.status(404).json({ error: 'UBA no encontrada' });
  }
});

// GET /api/stats/uso-suelo - Conteo por uso de suelo
router.get('/uso-suelo', authMiddleware, (req, res) => {
  res.json({ stats: USO_SUELO_STATS });
});

// GET /api/stats/general - Estadísticas generales
router.get('/general', authMiddleware, (req, res) => {
  const totalPredios = Object.values(UBA_STATS).reduce((sum, uba) => sum + uba.predios, 0);
  const totalArea = Object.values(UBA_STATS).reduce((sum, uba) => sum + uba.area, 0);
  const totalPoblacion = Object.values(UBA_STATS).reduce((sum, uba) => sum + uba.poblacion, 0);

  res.json({
    stats: {
      totalPredios,
      totalArea,
      totalPoblacion,
      ubas: Object.keys(UBA_STATS).length,
      usosSuelo: USO_SUELO_STATS.length
    }
  });
});

export default router;
