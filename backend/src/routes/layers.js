import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Capas disponibles (configuración desde el frontend)
const LAYERS_CONFIG = {
  planeacion: {
    name: 'Secretaría de Planeación',
    layers: [
      { id: 'predios_urban', name: 'Predios Urbanos', tableName: 'planeacion_predios_2025' },
      { id: 'nomenclatura_vial', name: 'Nomenclatura Vial', tableName: 'SANTANDER IGAC 2025 — U_NOMENCLATURA_VIAL_2025' },
      { id: 'barrios_urban', name: 'Barrios Urbanos', tableName: 'planeacion_barrios_urbanos' },
      { id: 'uba1', name: 'UBA 1', tableName: 'planeacion_uba1' },
      { id: 'uba2', name: 'UBA 2', tableName: 'planeacion_uba2' },
      { id: 'uba3', name: 'UBA 3', tableName: 'planeacion_uba3' },
      { id: 'uba4', name: 'UBA 4', tableName: 'planeacion_uba4' },
      { id: 'uba5', name: 'UBA 5', tableName: 'planeacion_uba5' },
      { id: 'ubac', name: 'UBA C', tableName: 'planeacion_ubac' },
      { id: 'uso_estanco', name: 'Estanco', tableName: 'planeacion_estanco' },
      { id: 'uso_discotecas', name: 'Discotecas', tableName: 'planeacion_discotecas' },
      { id: 'uso_droguerias', name: 'Droguerías', tableName: 'planeacion_droguerias' },
      { id: 'uso_ferreterias', name: 'Ferreterías', tableName: 'planeacion_ferreterias' },
      { id: 'uso_ips', name: 'IPS', tableName: 'planeacion_ips' },
      { id: 'uso_restaurantes', name: 'Restaurantes', tableName: 'planeacion_restaurantes' },
      { id: 'uso_servicios', name: 'Servicios', tableName: 'planeacion_servicios' }
    ]
  },
  zonas_verdes: {
    name: 'Zonas Verdes',
    layers: [
      { id: 'zonas_verdes', name: 'Zonas Verdes', tableName: 'planeacion_zonas_verdes' },
      { id: 'gimnasios_biosaludables', name: 'Gimnasios Bio Saludables', tableName: 'planeacion_gimnasios_biosaludables' }
    ]
  },
  sisben: {
    name: 'Información Sisben',
    layers: [
      { id: 'sisben_barrios', name: 'Sisben Barrios', tableName: 'planeacion_sisben_barrios' },
      { id: 'sisben_uba2', name: 'Sisben UBA 2', tableName: 'planeacion_sisben_uba2' },
      { id: 'sisben_uba4', name: 'Sisben UBA 4', tableName: 'planeacion_sisben_uba4' }
    ]
  },
  educacion: {
    name: 'Secretaría de Educación',
    layers: [
      { id: 'predios_educativos', name: 'Predios Educativos', tableName: 'educacion_predios_educativos' }
    ]
  },
  equipo_institucional: {
    name: 'Equipo Institucional',
    layers: [
      { id: 'equipo_institucional', name: 'Equipo Institucional', tableName: 'planeacion_equipo_institucional' },
      { id: 'iglesias', name: 'Iglesias', tableName: 'planeacion_iglesias' }
    ]
  }
};

// GET /api/layers - Obtener todas las capas
router.get('/', authMiddleware, (req, res) => {
  // Admin y editor_geo ven todas las capas
  if (req.user.role === 'admin' || req.user.role === 'editor_geo') {
    return res.json({ layers: LAYERS_CONFIG });
  }

  // Secretaria y lector solo ven sus capas
  const userSecretaria = req.user.secretaria;
  if (LAYERS_CONFIG[userSecretaria]) {
    return res.json({
      layers: {
        [userSecretaria]: LAYERS_CONFIG[userSecretaria]
      }
    });
  }

  res.json({ layers: {} });
});

// GET /api/layers/secretaria/:secretariaId - Obtener capas por secretaría
router.get('/secretaria/:secretariaId', authMiddleware, (req, res) => {
  const secretariaId = req.params.secretariaId;

  // Admin y editor_geo pueden ver cualquier secretaría
  if (req.user.role !== 'admin' && req.user.role !== 'editor_geo') {
    if (req.user.secretaria !== secretariaId) {
      return res.status(403).json({ error: 'No tiene acceso a esta secretaría' });
    }
  }

  if (LAYERS_CONFIG[secretariaId]) {
    res.json({ layers: LAYERS_CONFIG[secretariaId] });
  } else {
    res.status(404).json({ error: 'Secretaría no encontrada' });
  }
});

// GET /api/layers/:layerId - Obtener información de una capa
router.get('/:layerId', authMiddleware, (req, res) => {
  const layerId = req.params.layerId;

  // Buscar capa en todas las secretarías
  for (const secretaria of Object.values(LAYERS_CONFIG)) {
    const layer = secretaria.layers.find(l => l.id === layerId);
    if (layer) {
      return res.json({ layer });
    }
  }

  res.status(404).json({ error: 'Capa no encontrada' });
});

export default router;
