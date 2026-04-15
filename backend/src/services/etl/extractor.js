/**
 * ETL Extractor — Fase 1: Upload → Raw
 *
 * Responsabilidades:
 * - Parsear el archivo (CSV, Excel, GeoJSON) con el fileParser existente
 * - Guardar cada fila como JSONB en raw.upload_{id}
 * - Detectar tipos de columnas
 * - Calcular hash del archivo para detectar duplicados
 * - Registrar metadata en raw.upload_metadata
 */

import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { pool } from '../../db/pool.js';
import { parseCSV, parseExcel } from '../../utils/fileParser.js';
import { detectLatLon } from '../../utils/tableUtils.js';
import { AppError } from '../../middleware/errorHandler.js';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────────────────────────────────────

/** Calcula SHA-256 de un archivo */
function calcFileHash(filePath) {
  try {
    const buf = readFileSync(filePath);
    return createHash('sha256').update(buf).digest('hex');
  } catch {
    return null;
  }
}

/** Infiere tipo SQL de una columna a partir de una muestra de valores */
function inferColumnType(samples) {
  const validSamples = samples.filter(s => s !== null && s !== undefined && String(s).trim() !== '');
  if (!validSamples.length) return 'TEXT';

  const strSamples = validSamples.map(s => String(s).trim());

  const isInteger = strSamples.every(s => /^-?\d+$/.test(s));
  if (isInteger) return 'INTEGER';

  const isNumeric = strSamples.every(s => /^-?\d+\.?\d*$|^-?\d*\.\d+$/.test(s));
  if (isNumeric) return 'NUMERIC';

  const isDate = strSamples.every(s =>
    /^\d{4}-\d{2}-\d{2}/.test(s) ||
    /^\d{2}\/\d{2}\/\d{4}/.test(s) ||
    /^\d{2}-\d{2}-\d{4}/.test(s)
  );
  if (isDate) return 'DATE';

  const isBool = strSamples.every(s =>
    ['true','false','si','sí','no','1','0','s','n','yes'].includes(s.toLowerCase())
  );
  if (isBool) return 'BOOLEAN';

  return 'TEXT';
}

/** Detecta coordenadas en las columnas */
function detectCoordColumns(columns) {
  return detectLatLon(columns);
}

/** Construye el metadata de columnas con muestras y tipos detectados */
function buildColumnsMetadata(rows, columns) {
  return columns.map(col => {
    const samples = rows.slice(0, 10).map(r => r[col] ?? null);
    const strSamples = samples.filter(s => s !== null).map(s => String(s));
    const detectedType = inferColumnType(strSamples);
    return {
      name: col,
      original_name: col,
      detected_type: detectedType,
      sample: strSamples.slice(0, 5),
      nullable: samples.some(s => s === null || s === ''),
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL: extractToRaw
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extrae el archivo y lo guarda en raw.upload_{uploadId}
 *
 * @param {object} params
 * @param {object} params.file     - Archivo de multer (path, originalname, etc.)
 * @param {number} params.uploadId - ID en public.uploads
 * @param {object} [params.client] - Cliente de BD para transacción externa (opcional)
 *
 * @returns {object} Metadata de extracción:
 *   { rawTable, columns, totalRows, fileHash, detectedLat, detectedLon, hasCoords }
 */
export async function extractToRaw({ file, uploadId, client: externalClient }) {
  const ext = file.originalname.split('.').pop().toLowerCase();
  const rawTable = `upload_${uploadId}`;
  const useClient = externalClient || (await pool.connect());
  const ownClient = !externalClient;

  try {
    if (ownClient) await useClient.query('BEGIN');

    // ── 1. Parsear archivo ──
    let rows = [];
    let isGeoJSON = false;
    let geojsonFeatures = [];

    if (ext === 'csv') {
      rows = await parseCSV(file.path);
    } else if (['xls', 'xlsx'].includes(ext)) {
      rows = await parseExcel(file.path);
    } else if (['json', 'geojson'].includes(ext)) {
      const raw = readFileSync(file.path, 'utf8');
      const geo = JSON.parse(raw);
      geojsonFeatures = geo.features || (geo.type === 'Feature' ? [geo] : []);
      isGeoJSON = true;
      // Para GeoJSON, las "filas" son las propiedades de cada feature
      rows = geojsonFeatures.map(f => ({
        ...(f.properties || {}),
        __geojson_geometry: JSON.stringify(f.geometry),
      }));
    } else {
      throw new AppError(`Formato '${ext}' no soportado`, 400);
    }

    if (!rows.length) throw new AppError('El archivo está vacío o no tiene filas de datos', 400);

    // ── 2. Calcular hash del archivo ──
    const fileHash = calcFileHash(file.path);

    // ── 3. Detectar columnas y tipos ──
    const columns = Object.keys(rows[0]);
    const columnsMetadata = buildColumnsMetadata(rows, columns);
    const { latCol, lonCol } = detectCoordColumns(columns);

    // ── 4. Crear tabla raw.upload_{id} ──
    await useClient.query(`
      CREATE TABLE IF NOT EXISTS raw."${rawTable}" (
        _row_id     SERIAL PRIMARY KEY,
        _row_json   JSONB  NOT NULL,
        _row_number INTEGER NOT NULL
      )
    `);

    // ── 5. Insertar filas como JSONB en lotes de 500 ──
    const BATCH = 500;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      // Construir multi-insert
      const values = [];
      const placeholders = [];
      batch.forEach((row, idx) => {
        const rowNum = i + idx + 1;
        values.push(JSON.stringify(row), rowNum);
        const base = idx * 2;
        placeholders.push(`($${base + 1}::jsonb, $${base + 2})`);
      });

      await useClient.query(
        `INSERT INTO raw."${rawTable}" (_row_json, _row_number) VALUES ${placeholders.join(', ')}`,
        values
      );
    }

    // ── 6. Registrar en raw.upload_metadata ──
    await useClient.query(`
      INSERT INTO raw.upload_metadata (upload_id, raw_table, columns_json, total_rows, file_hash)
      VALUES ($1, $2, $3::jsonb, $4, $5)
      ON CONFLICT (upload_id) DO UPDATE SET
        raw_table    = EXCLUDED.raw_table,
        columns_json = EXCLUDED.columns_json,
        total_rows   = EXCLUDED.total_rows,
        file_hash    = EXCLUDED.file_hash,
        created_at   = NOW()
    `, [uploadId, `raw.${rawTable}`, JSON.stringify(columnsMetadata), rows.length, fileHash]);

    // ── 7. Actualizar uploads.etl_status = 'raw' ──
    await useClient.query(`
      UPDATE public.uploads
      SET etl_status = 'raw', etl_mode = 'etl'
      WHERE id = $1
    `, [uploadId]);

    if (ownClient) await useClient.query('COMMIT');

    return {
      rawTable: `raw.${rawTable}`,
      columns: columnsMetadata,
      totalRows: rows.length,
      fileHash,
      detectedLat: latCol || null,
      detectedLon: lonCol || null,
      hasCoords: !!(latCol && lonCol),
      isGeoJSON,
      preview: rows.slice(0, 5).map(r => {
        // Excluir __geojson_geometry del preview
        const { __geojson_geometry, ...clean } = r;
        return clean;
      }),
    };
  } catch (err) {
    if (ownClient) {
      await useClient.query('ROLLBACK').catch(() => {});
    }
    throw err;
  } finally {
    if (ownClient) useClient.release();
  }
}

/**
 * Verifica si un upload ya fue extraído a raw (para re-procesamientos)
 * @returns {object|null} Metadata del raw o null si no existe
 */
export async function getRawMetadata(uploadId) {
  const result = await pool.query(`
    SELECT * FROM raw.upload_metadata WHERE upload_id = $1
  `, [uploadId]);
  return result.rows[0] || null;
}
