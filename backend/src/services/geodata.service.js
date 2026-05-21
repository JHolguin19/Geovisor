import ExcelJS from 'exceljs';
import { pool } from '../db/pool.js';
import { detectGeomColumn } from '../utils/geoUtils.js';
import { AppError } from '../middleware/errorHandler.js';

// Cache de tablas permitidas — se recarga cada 5 minutos
let allowedTablesCache = null;
let cacheExpiry = 0;

async function getAllowedTables() {
  if (allowedTablesCache && Date.now() < cacheExpiry) return allowedTablesCache;
  const result = await pool.query('SELECT nombre_tabla FROM geo_tablas');
  allowedTablesCache = new Set(result.rows.map(r => r.nombre_tabla));
  cacheExpiry = Date.now() + 5 * 60 * 1000;
  return allowedTablesCache;
}

// Valida que un identificador SQL sea seguro (solo letras, números, _ y espacios)
function isValidIdentifier(name) {
  return /^[a-zA-Z_][a-zA-Z0-9_ ]*$/.test(name);
}

export async function getGeoJsonForTable(tableName, { bbox, q, searchFields, simplify, cols, limit: limitParam }) {
  const allowed = await getAllowedTables();
  if (!allowed.has(tableName)) throw new AppError('Tabla no permitida', 403);

  const geomCol = await detectGeomColumn(tableName);
  if (!geomCol) throw new AppError(`No se encontró columna de geometría en "${tableName}"`, 500);
  if (!isValidIdentifier(geomCol)) throw new AppError('Columna de geometría inválida', 500);

  const simplifyVal = parseFloat(simplify) || 0;
  const geomExpr = simplifyVal > 0
    ? `ST_AsGeoJSON(ST_SimplifyPreserveTopology(ST_Transform("${geomCol}", 4326), ${simplifyVal}))::jsonb`
    : `ST_AsGeoJSON(ST_Transform("${geomCol}", 4326))::jsonb`;

  let innerSelect = '*';
  if (cols) {
    const colList = cols.split(',').map(c => c.trim()).filter(Boolean);
    const invalid = colList.find(c => !isValidIdentifier(c));
    if (invalid) throw new AppError(`Nombre de columna inválido: "${invalid}"`, 400);
    innerSelect = `${colList.map(c => `"${c}"`).join(', ')}, "${geomCol}"`;
  }

  let query;
  let params = [];

  if (q && searchFields) {
    const fields = searchFields.split(',').map(f => f.trim()).filter(Boolean);
    const invalidField = fields.find(f => !isValidIdentifier(f));
    if (invalidField) throw new AppError(`Campo de búsqueda inválido: "${invalidField}"`, 400);
    const limit = Math.min(parseInt(limitParam) || 50, 200);
    const conditions = fields.map((f, i) => `"${f}" ILIKE $${i + 1}`).join(' OR ');
    const searchParams = fields.map(() => `%${q}%`);
    query = `
      SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(jsonb_agg(
          jsonb_build_object(
            'type', 'Feature',
            'geometry', ${geomExpr},
            'properties', to_jsonb(t) - '${geomCol}'
          )
        ), '[]'::jsonb)
      ) AS geojson
      FROM (
        SELECT ${innerSelect} FROM "${tableName}"
        WHERE ${conditions}
        LIMIT ${limit}
      ) t`;
    params = searchParams;
  } else if (bbox) {
    const parts = bbox.split(',').map(Number);
    if (parts.length === 4 && parts.every(n => !isNaN(n))) {
      const [minx, miny, maxx, maxy] = parts;
      query = `
        SELECT jsonb_build_object(
          'type', 'FeatureCollection',
          'features', COALESCE(jsonb_agg(
            jsonb_build_object(
              'type', 'Feature',
              'geometry', ${geomExpr},
              'properties', to_jsonb(t) - '${geomCol}'
            )
          ), '[]'::jsonb)
        ) AS geojson
        FROM (
          SELECT ${innerSelect} FROM "${tableName}"
          WHERE ST_Intersects(
            "${geomCol}",
            ST_Transform(ST_MakeEnvelope($1, $2, $3, $4, 4326), ST_SRID("${geomCol}"))
          )
          LIMIT 50000
        ) t`;
      params = [minx, miny, maxx, maxy];
    }
  }

  if (!query) {
    query = `
      SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(jsonb_agg(
          jsonb_build_object(
            'type', 'Feature',
            'geometry', ${geomExpr},
            'properties', to_jsonb(t) - '${geomCol}'
          )
        ), '[]'::jsonb)
      ) AS geojson
      FROM (SELECT ${innerSelect} FROM "${tableName}" LIMIT 50000) t`;
  }

  const result = await pool.query(query, params);
  return result.rows[0]?.geojson ?? { type: 'FeatureCollection', features: [] };
}

/**
 * Exporta todos los datos de una tabla (sin geometría) como workbook Excel.
 * @returns {ExcelJS.Workbook}
 */
export async function exportTableAsExcel(tableName) {
  const allowed = await getAllowedTables();
  if (!allowed.has(tableName)) throw new AppError('Tabla no permitida', 403);

  // Obtener columnas (excluyendo geometría)
  const geomCol = await detectGeomColumn(tableName);
  const colsRes = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);

  const dataCols = colsRes.rows
    .filter(c => c.column_name !== geomCol && c.column_name !== 'gid')
    .map(c => c.column_name);

  if (!dataCols.length) throw new AppError('La tabla no tiene columnas exportables', 400);

  const colList = dataCols.map(c => `"${c}"`).join(', ');
  const rows = await pool.query(`SELECT ${colList} FROM "${tableName}" LIMIT 100000`);

  // Construir workbook
  const wb = new ExcelJS.Workbook();
  wb.creator = 'GeoVisor Alcaldía';
  wb.created = new Date();

  const ws = wb.addWorksheet(tableName.slice(0, 31)); // Excel limita nombres a 31 chars

  // Encabezados con estilo
  ws.columns = dataCols.map(col => ({
    header: col,
    key: col,
    width: Math.min(Math.max(col.length + 4, 12), 40),
  }));

  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 20;

  // Datos
  for (const row of rows.rows) {
    ws.addRow(dataCols.map(col => {
      const val = row[col];
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') return JSON.stringify(val);
      return val;
    }));
  }

  // Bordes en toda la tabla
  ws.eachRow((row, rowNumber) => {
    row.eachCell(cell => {
      cell.border = {
        top:    { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left:   { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right:  { style: 'thin', color: { argb: 'FFD1D5DB' } },
      };
      if (rowNumber > 1) {
        cell.alignment = { vertical: 'middle', wrapText: false };
        if (rowNumber % 2 === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }
      }
    });
  });

  return { workbook: wb, rowCount: rows.rows.length, colCount: dataCols.length };
}
