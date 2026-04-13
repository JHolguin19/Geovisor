import { pool } from '../db/pool.js';
import { detectGeomColumn } from '../utils/geoUtils.js';

const UBA_TABLE_MAP = {
  uba1: 'planeacion_uba1',
  uba2: 'planeacion_uba2',
  uba3: 'planeacion_uba3',
  uba4: 'planeacion_uba4',
  uba5: 'planeacion_uba5',
  ubac: 'planeacion_ubac'
};

const UBA_LABELS = {
  uba1: 'UBA 1', uba2: 'UBA 2', uba3: 'UBA 3',
  uba4: 'UBA 4', uba5: 'UBA 5', ubac: 'UBA C'
};

export const ALUMBRADO_LAYERS = [
  { id: 'alumbrado_publico',        table: 'obras_transformadores',           label: 'Transformadores',          color: '#2563EB' },
  { id: 'luminarias_tradicionales', table: 'obras_luminarias_tradicionales', label: 'Luminarias Tradicionales', color: '#FBBF24' },
  { id: 'apoyos_alumbrado_publico', table: 'obras_apoyos_alumbrado',                  label: 'Apoyos',                   color: '#F97316' },
  { id: 'luminarias_led',           table: 'obras_luminarias_led',           label: 'Luminarias LED',           color: '#A3E635' },
];

export async function getStats() {
  const [layerGeoms, ubaGeoms] = await Promise.all([
    Promise.all(ALUMBRADO_LAYERS.map(async l => ({
      id: l.id, table: l.table,
      geomCol: await detectGeomColumn(l.table)
    }))),
    Promise.all(Object.entries(UBA_TABLE_MAP).map(async ([ubaId, ubaTable]) => ({
      ubaId, ubaTable,
      geomCol: await detectGeomColumn(ubaTable)
    })))
  ]);

  const layerGeomMap = Object.fromEntries(layerGeoms.map(l => [l.id, l]));

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

  // Conteo por UBA
  const porUba = {};
  await Promise.all(ubaGeoms.map(async ({ ubaId, ubaTable, geomCol: ubaGeomCol }) => {
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

  return { layers: ALUMBRADO_LAYERS, totals, porUba };
}
