import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { pool } from '../db/pool.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// ── Whitelist de tablas permitidas ─────────────────────────────────────────
const LAYER_TABLE_MAP = {
  uso_estanco:             'uds_barestanco',
  uso_discotecas:          'uso_de_suelos_discotecas',
  uso_droguerias:          'uds2_droguerias',
  uso_ferreterias:         'uds_ferreterias',
  uso_ips:                 'uds_ips',
  uso_restaurantes:        'uds_restaurantes',
  uso_servicios:           'uds_otros',
  zonas_verdes:            'zonasverdes',
  gimnasios_biosaludables: 'Gimnasiosbiosaludables',
  predios_educativos:      'predios_educativos',
  equipo_institucional:    'predios_equipo_institucional',
  iglesias:                'predios_iglesias',
  luminarias_tradicionales:'luminariastradicionales_alumbradopublico',
  luminarias_led:          'luminariasled_alumbradopublico',
};

const UBA_TABLE_MAP = {
  uba1: 'BARR_UBA_1',
  uba2: 'BARR_UBA2',
  uba3: 'BARR_UBA3',
  uba4: 'BARR_UBA4',
  uba5: 'BARR_UBA5',
  ubac: 'BARRIOS_UBA_C',
};

// Datos estáticos de UBAs
const UBA_STATIC = {
  uba1: { predios: 2197, area: 718315, poblacion: 8500 },
  uba2: { predios: 5959, area: 1662210, poblacion: 15200 },
  uba3: { predios: 2805, area: 1054055, poblacion: 9800 },
  uba4: { predios: 3258, area: 902978, poblacion: 11200 },
  uba5: { predios: 1537, area: 608186, poblacion: 6400 },
  ubac: { predios: 2028, area: 1491423, poblacion: 4200 },
};

// ── GET /api/stats/uba/:ubaId ──────────────────────────────────────────────
router.get('/uba/:ubaId', authMiddleware, (req, res) => {
  const { ubaId } = req.params;
  if (UBA_STATIC[ubaId]) return res.json({ stats: UBA_STATIC[ubaId] });
  res.status(404).json({ error: 'UBA no encontrada' });
});

// ── GET /api/stats/general ─────────────────────────────────────────────────
router.get('/general', authMiddleware, (req, res) => {
  const totalPredios   = Object.values(UBA_STATIC).reduce((s, u) => s + u.predios, 0);
  const totalArea      = Object.values(UBA_STATIC).reduce((s, u) => s + u.area, 0);
  const totalPoblacion = Object.values(UBA_STATIC).reduce((s, u) => s + u.poblacion, 0);
  res.json({ stats: { totalPredios, totalArea, totalPoblacion, ubas: 6 } });
});

// ── GET /api/stats/uso-suelo — PostGIS espacial ───────────────────────────
// Query params:
//   layers=uso_estanco,uso_restaurantes   (whitelisted layer IDs)
//   ubas=uba1,uba2                        (whitelisted UBA IDs)
//
// Returns: { total: { uso_estanco: 145, ... }, porUba: { uba1: { uso_estanco: 45 }, ... } }

router.get('/uso-suelo', authMiddleware, asyncHandler(async (req, res) => {
  const rawLayers = String(req.query.layers || '').split(',').map(s => s.trim()).filter(Boolean);
  const rawUbas   = String(req.query.ubas   || '').split(',').map(s => s.trim()).filter(Boolean);

  // Validar contra whitelist
  const layers = rawLayers.filter(id => LAYER_TABLE_MAP[id]);
  const ubas   = rawUbas.filter(id => UBA_TABLE_MAP[id]);

  const result = { total: {}, porUba: {} };

  if (layers.length === 0) return res.json(result);

  // Totales por capa (COUNT simple)
  await Promise.all(layers.map(async (layerId) => {
    const t = LAYER_TABLE_MAP[layerId];
    try {
      const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM "${t}"`);
      result.total[layerId] = rows[0].n;
    } catch {
      result.total[layerId] = 0;
    }
  }));

  // Conteo espacial por UBA (ST_Within con transformación a 4326)
  for (const ubaId of ubas) {
    const ubaTable = UBA_TABLE_MAP[ubaId];
    result.porUba[ubaId] = {};

    await Promise.all(layers.map(async (layerId) => {
      const layerTable = LAYER_TABLE_MAP[layerId];
      try {
        const { rows } = await pool.query(`
          SELECT COUNT(l.*)::int AS n
          FROM "${layerTable}" l
          WHERE ST_Within(
            ST_Transform(l.geom, 4326),
            (SELECT ST_Union(ST_Transform(geom, 4326)) FROM "${ubaTable}")
          )
        `);
        result.porUba[ubaId][layerId] = rows[0].n;
      } catch {
        result.porUba[ubaId][layerId] = 0;
      }
    }));
  }

  res.json(result);
}));

export default router;
