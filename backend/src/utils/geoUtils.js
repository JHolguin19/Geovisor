import { pool } from '../db/pool.js';

/**
 * Detecta la columna de geometría de una tabla PostGIS.
 * Primero consulta geometry_columns, luego prueba nombres comunes.
 */
export async function detectGeomColumn(tableName) {
  try {
    const res = await pool.query(
      `SELECT f_geometry_column FROM geometry_columns
       WHERE f_table_schema = 'public' AND f_table_name = $1 LIMIT 1`,
      [tableName]
    );
    if (res.rows.length > 0) return res.rows[0].f_geometry_column;
  } catch { /* ignorar */ }

  for (const col of ['geom', 'the_geom', 'geometry', 'shape', 'wkb_geometry']) {
    try {
      await pool.query(`SELECT "${col}" FROM "${tableName}" LIMIT 0`);
      return col;
    } catch { /* columna no existe */ }
  }
  return null;
}

/**
 * Detecta la columna de nombre de barrio de una tabla.
 * Prueba nombres comunes en orden.
 */
export async function detectNameColumn(tableName) {
  for (const col of ['nombre', 'NOMBRE', 'nombre_barrio', 'barrio', 'nom_barrio', 'name', 'NAME']) {
    try {
      await pool.query(`SELECT "${col}" FROM "${tableName}" LIMIT 0`);
      return col;
    } catch { /* columna no existe */ }
  }
  return null;
}

/**
 * Busca la tabla Sisben barrios (puede tener distintos nombres según el deploy).
 */
export async function findSisbenTable() {
  for (const t of ['planeacion_sisben_barrios', 'sisben_barrios', 'pg_sisben_barrios', 'sisbenbarrios', 'sisben_barr']) {
    try {
      await pool.query(`SELECT 1 FROM "${t}" LIMIT 0`);
      return t;
    } catch { /* tabla no existe */ }
  }
  return null;
}
