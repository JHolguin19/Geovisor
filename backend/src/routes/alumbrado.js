import express from 'express';
import { pool } from '../db/pool.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

const UBA_TABLE_MAP = {
  uba1: 'BARR_UBA_1',
  uba2: 'BARR_UBA2',
  uba3: 'BARR_UBA3',
  uba4: 'BARR_UBA4',
  uba5: 'BARR_UBA5',
  ubac: 'BARRIOS_UBA_C'
};

const UBA_LABELS = {
  uba1: 'UBA 1', uba2: 'UBA 2', uba3: 'UBA 3',
  uba4: 'UBA 4', uba5: 'UBA 5', ubac: 'UBA C'
};

const ALUMBRADO_LAYERS = [
  { id: 'alumbrado_publico',        table: 'subestaciones_alumbradopublico',            label: 'Transformadores',           color: '#2563EB' },
  { id: 'luminarias_tradicionales', table: 'luminariastradicionales_alumbradopublico',  label: 'Luminarias Tradicionales',  color: '#FBBF24' },
  { id: 'apoyos_alumbrado_publico', table: 'apoyos_alumbradopublico',                   label: 'Apoyos',                    color: '#F97316' },
  { id: 'luminarias_led',           table: 'luminariasled_alumbradopublico',            label: 'Luminarias LED',            color: '#A3E635' },
];

async function detectGeomColumn(tableName) {
  try {
    const res = await pool.query(
      `SELECT f_geometry_column FROM geometry_columns
       WHERE f_table_schema = 'public' AND f_table_name = $1 LIMIT 1`,
      [tableName]
    );
    if (res.rows.length > 0) return res.rows[0].f_geometry_column;
  } catch { /* ignorar */ }
  for (const col of ['geom', 'the_geom', 'geometry', 'shape', 'wkb_geometry']) {
    try { await pool.query(`SELECT "${col}" FROM "${tableName}" LIMIT 0`); return col; }
    catch { /* siguiente */ }
  }
  return null;
}

// GET /api/alumbrado/stats
// Devuelve totales municipio + conteo por UBA (intersección espacial)
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    // Detectar columnas de geometría en paralelo
    const [layerGeoms, ubaGeoms] = await Promise.all([
      Promise.all(ALUMBRADO_LAYERS.map(async l => ({
        id: l.id,
        table: l.table,
        geomCol: await detectGeomColumn(l.table)
      }))),
      Promise.all(Object.entries(UBA_TABLE_MAP).map(async ([ubaId, ubaTable]) => ({
        ubaId,
        ubaTable,
        geomCol: await detectGeomColumn(ubaTable)
      })))
    ]);

    const layerGeomMap = Object.fromEntries(layerGeoms.map(l => [l.id, l]));
    const ubaGeomList  = ubaGeoms;

    // Totales municipio
    const totals = {};
    await Promise.all(ALUMBRADO_LAYERS.map(async layer => {
      const { geomCol } = layerGeomMap[layer.id];
      if (!geomCol) { totals[layer.id] = 0; return; }
      try {
        const r = await pool.query(`SELECT COUNT(*) FROM "${layer.table}"`);
        totals[layer.id] = parseInt(r.rows[0].count, 10);
      } catch { totals[layer.id] = 0; }
    }));

    // Conteo por UBA usando intersección espacial
    const porUba = {};
    await Promise.all(ubaGeomList.map(async ({ ubaId, ubaTable, geomCol: ubaGeomCol }) => {
      porUba[ubaId] = { label: UBA_LABELS[ubaId] };

      await Promise.all(ALUMBRADO_LAYERS.map(async layer => {
        const { geomCol: layerGeomCol } = layerGeomMap[layer.id];
        if (!layerGeomCol || !ubaGeomCol) { porUba[ubaId][layer.id] = 0; return; }
        try {
          const r = await pool.query(`
            SELECT COUNT(a.*) AS count
            FROM "${layer.table}" a
            WHERE ST_Intersects(
              a."${layerGeomCol}",
              (SELECT ST_Union(u."${ubaGeomCol}") FROM "${ubaTable}" u)
            )
          `);
          porUba[ubaId][layer.id] = parseInt(r.rows[0].count, 10);
        } catch {
          porUba[ubaId][layer.id] = 0;
        }
      }));
    }));

    res.json({ layers: ALUMBRADO_LAYERS, totals, porUba });
  } catch (err) {
    console.error('[Alumbrado stats error]', err);
    res.status(500).json({ error: 'Error al obtener estadísticas de alumbrado' });
  }
});

export default router;
