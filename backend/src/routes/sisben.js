import express from 'express';
import { pool } from '../db/pool.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Mapa de UBA IDs a tablas PostGIS
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

// Detectar columna de geometría de una tabla
async function detectGeomColumn(tableName) {
  const res = await pool.query(
    `SELECT f_geometry_column FROM geometry_columns
     WHERE f_table_schema = 'public' AND f_table_name = $1 LIMIT 1`,
    [tableName]
  );
  if (res.rows.length > 0) return res.rows[0].f_geometry_column;
  for (const col of ['geom', 'the_geom', 'geometry', 'shape', 'wkb_geometry']) {
    try {
      await pool.query(`SELECT "${col}" FROM "${tableName}" LIMIT 0`);
      return col;
    } catch { /* no existe */ }
  }
  return null;
}

// GET /api/sisben/uba/:ubaId
// Devuelve los barrios de una UBA con su información del Sisben (join espacial)
router.get('/uba/:ubaId', authMiddleware, async (req, res) => {
  const { ubaId } = req.params;
  const ubaTable = UBA_TABLE_MAP[ubaId];

  if (!ubaTable) {
    return res.status(400).json({ error: `UBA no válida. Valores: ${Object.keys(UBA_TABLE_MAP).join(', ')}` });
  }

  try {
    const [sbGeom, ubaGeom] = await Promise.all([
      detectGeomColumn('sisben_barrios'),
      detectGeomColumn(ubaTable)
    ]);

    if (!sbGeom) return res.status(500).json({ error: 'No se encontró columna de geometría en sisben_barrios' });
    if (!ubaGeom) return res.status(500).json({ error: `No se encontró columna de geometría en ${ubaTable}` });

    // Join espacial: barrios del Sisben que intersectan con la UBA
    const query = `
      SELECT to_jsonb(t) - '${sbGeom}' AS data
      FROM (
        SELECT sb.*
        FROM sisben_barrios sb
        WHERE ST_Intersects(
          ST_Transform(sb."${sbGeom}", 4326),
          ST_Transform(
            (SELECT ST_Union("${ubaGeom}") FROM "${ubaTable}"),
            4326
          )
        )
        ORDER BY sb.nombre NULLS LAST
      ) t
    `;

    const result = await pool.query(query);
    const barrios = result.rows.map(r => r.data);

    // Totales numéricos
    const NUM_FIELDS = [
      'poblacion_total', 'poblacion_hombre', 'poblacion_mujer',
      'cantidad_hogares', 'cantidad_viviendas', 'personas_sisben'
    ];
    const totals = NUM_FIELDS.reduce((acc, f) => {
      acc[f] = barrios.reduce((sum, b) => sum + (Number(b[f]) || 0), 0);
      return acc;
    }, {});

    res.json({
      ubaId,
      ubaLabel: UBA_LABELS[ubaId],
      totalBarrios: barrios.length,
      barrios,
      totals
    });
  } catch (err) {
    console.error(`[Sisben UBA] Error en ${ubaId}:`, err.message);
    res.status(500).json({ error: 'Error al consultar datos Sisben', detail: err.message });
  }
});

export default router;
