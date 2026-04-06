import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Capas disponibles (configuración desde el frontend)
const LAYERS_CONFIG = {
  planeacion: {
    name: 'Secretaría de Planeación',
    layers: [
      { id: 'predios_urban', name: 'Predios Urbanos', geoserverLayer: 'pg_predios_urbanos_m' },
      { id: 'nomenclatura_vial', name: 'Nomenclatura Vial', geoserverLayer: 'SANTANDER IGAC 2025 — U_NOMENCLATURA_VIAL_2025' },
      { id: 'barrios_urban', name: 'Barrios Urbanos', geoserverLayer: 'pg_barriosurbanos' },
      { id: 'uba1', name: 'UBA 1', geoserverLayer: 'pg_uba1' },
      { id: 'uba2', name: 'UBA 2', geoserverLayer: 'pg_uba2' },
      { id: 'uba3', name: 'UBA 3', geoserverLayer: 'pg_uba3' },
      { id: 'uba4', name: 'UBA 4', geoserverLayer: 'pg_uba4' },
      { id: 'uba5', name: 'UBA 5', geoserverLayer: 'pg_uba5' },
      { id: 'ubac', name: 'UBA C', geoserverLayer: 'pg_ubac' },
      { id: 'uso_estanco', name: 'Estanco', geoserverLayer: 'pg_uds_bar_estanco' },
      { id: 'uso_discotecas', name: 'Discotecas', geoserverLayer: 'pg_uds_discos' },
      { id: 'uso_droguerias', name: 'Droguerías', geoserverLayer: 'pg_uds_droguerias' },
      { id: 'uso_ferreterias', name: 'Ferreterías', geoserverLayer: 'pg_uds_ferreterias' },
      { id: 'uso_ips', name: 'IPS', geoserverLayer: 'pg_uds_ips' },
      { id: 'uso_restaurantes', name: 'Restaurantes', geoserverLayer: 'pg_uds_restaurantes' },
      { id: 'uso_servicios', name: 'Servicios', geoserverLayer: 'pg_uds_otros' }
    ]
  },
  zonas_verdes: {
    name: 'Zonas Verdes',
    layers: [
      { id: 'zonas_verdes', name: 'Zonas Verdes', geoserverLayer: 'pg_zonasverdes' },
      { id: 'gimnasios_biosaludables', name: 'Gimnasios Bio Saludables', geoserverLayer: 'pg_Gimnasiosbiosaludables' }
    ]
  },
  sisben: {
    name: 'Información Sisben',
    layers: [
      { id: 'sisben_barrios', name: 'Sisben Barrios', geoserverLayer: 'pg_sisben_barrios' },
      { id: 'sisben_uba2', name: 'Sisben UBA 2', geoserverLayer: 'pg_uba2_datospoblaciones' },
      { id: 'sisben_uba4', name: 'Sisben UBA 4', geoserverLayer: 'sisben_uba4' }
    ]
  },
  educacion: {
    name: 'Secretaría de Educación',
    layers: [
      { id: 'predios_educativos', name: 'Predios Educativos', geoserverLayer: 'pg_predios_educativos' }
    ]
  },
  equipo_institucional: {
    name: 'Equipo Institucional',
    layers: [
      { id: 'equipo_institucional', name: 'Equipo Institucional', geoserverLayer: 'pg_predios_equipo_institucional' },
      { id: 'iglesias', name: 'Iglesias', geoserverLayer: 'pg_predios_iglesias' }
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
