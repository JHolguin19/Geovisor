/**
 * ETL Transformer — Fase 2: Raw → Staging
 *
 * Responsabilidades:
 * - Leer filas de raw.upload_{id} (JSONB)
 * - Aplicar column_mapping: renombrar columnas + castear tipos
 * - Crear tabla staging.stg_{jobId} con columnas tipadas
 * - Insertar datos transformados
 * - Marcar _status por fila (ok / warning / error)
 */

import { pool } from '../../db/pool.js';
import { AppError } from '../../middleware/errorHandler.js';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS: casteo de valores
// ─────────────────────────────────────────────────────────────────────────────

function castValue(value, type) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return { value: null, error: null };
  }

  const str = String(value).trim();

  try {
    switch (type) {
      case 'INTEGER': {
        const n = parseInt(str, 10);
        if (isNaN(n)) return { value: null, error: `No es un entero: "${str}"` };
        return { value: n, error: null };
      }
      case 'NUMERIC': {
        // Aceptar tanto punto como coma decimal
        const normalized = str.replace(',', '.');
        const n = parseFloat(normalized);
        if (isNaN(n)) return { value: null, error: `No es un número: "${str}"` };
        return { value: n, error: null };
      }
      case 'DATE': {
        // Formatos soportados: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY
        let d = str;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
          const [day, month, year] = str.split('/');
          d = `${year}-${month}-${day}`;
        } else if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
          const [day, month, year] = str.split('-');
          d = `${year}-${month}-${day}`;
        }
        if (isNaN(Date.parse(d))) return { value: null, error: `Fecha inválida: "${str}"` };
        return { value: d, error: null };
      }
      case 'BOOLEAN': {
        const truthy = ['true', 'si', 'sí', '1', 's', 'yes'];
        const falsy  = ['false', 'no', '0', 'n'];
        const lower  = str.toLowerCase();
        if (truthy.includes(lower)) return { value: true,  error: null };
        if (falsy.includes(lower))  return { value: false, error: null };
        return { value: null, error: `No es booleano: "${str}"` };
      }
      case 'BIGINT': {
        const n = parseInt(str, 10);
        if (isNaN(n)) return { value: null, error: `No es un entero largo: "${str}"` };
        return { value: n, error: null };
      }
      default: // TEXT y cualquier otro
        return { value: str, error: null };
    }
  } catch {
    return { value: null, error: `Error al convertir "${str}" a ${type}` };
  }
}

/** Mapeo de tipos JS/custom → tipos SQL de PostgreSQL */
function toPostgresType(type) {
  const map = {
    'INTEGER':  'INTEGER',
    'NUMERIC':  'NUMERIC(15,4)',
    'BIGINT':   'BIGINT',
    'DATE':     'DATE',
    'BOOLEAN':  'BOOLEAN',
    'TEXT':     'TEXT',
    'VARCHAR':  'VARCHAR(500)',
  };
  return map[type?.toUpperCase()] || 'TEXT';
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL: transformToStaging
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Transforma datos de raw → staging aplicando column_mapping
 *
 * @param {object} params
 * @param {number} params.jobId        - ID del processing_job en staging.processing_jobs
 * @param {number} params.uploadId     - ID en public.uploads
 * @param {string} params.rawTable     - Nombre completo: 'raw.upload_42'
 * @param {Array}  params.columnMapping - [{source, target, type}]
 *
 * @returns {object} Stats: { total, processed, errors, stagingTable }
 */
export async function transformToStaging({ jobId, uploadId, rawTable, columnMapping }) {
  if (!columnMapping || !columnMapping.length) {
    throw new AppError('Se requiere al menos una columna en el mapeo', 400);
  }

  const stagingTable = `stg_${jobId}`;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Actualizar estado del job
    await client.query(`
      UPDATE staging.processing_jobs
      SET estado = 'procesando', processed_at = NOW()
      WHERE id = $1
    `, [jobId]);

    // Actualizar etl_status del upload
    await client.query(`
      UPDATE public.uploads SET etl_status = 'processing' WHERE id = $1
    `, [uploadId]);

    // ── 1. Crear tabla staging.stg_{jobId} ──
    // Columnas fijas de control + columnas del mapping
    const colDefs = columnMapping.map(col =>
      `"${col.target}" ${toPostgresType(col.type)}`
    ).join(',\n  ');

    await client.query(`
      CREATE TABLE IF NOT EXISTS staging."${stagingTable}" (
        _row_id        SERIAL PRIMARY KEY,
        _source_row    INTEGER NOT NULL,
        _status        VARCHAR(20) NOT NULL DEFAULT 'ok'
          CHECK (_status IN ('ok', 'warning', 'error')),
        _status_detail TEXT,
        _matched       BOOLEAN NOT NULL DEFAULT FALSE,
        ${colDefs},
        geom           GEOMETRY(Geometry, 4326)
      )
    `);

    // ── 2. Leer filas de raw (en lotes de 1000) ──
    const countRes = await client.query(`SELECT COUNT(*) AS total FROM ${rawTable}`);
    const totalRows = parseInt(countRes.rows[0].total, 10);

    let processed = 0;
    let errors    = 0;
    const BATCH   = 1000;

    for (let offset = 0; offset < totalRows; offset += BATCH) {
      const rawRows = await client.query(`
        SELECT _row_id, _row_json, _row_number
        FROM ${rawTable}
        ORDER BY _row_number
        LIMIT $1 OFFSET $2
      `, [BATCH, offset]);

      for (const rawRow of rawRows.rows) {
        const rowData  = rawRow._row_json;
        const rowNum   = rawRow._row_number;
        const rowErrors = [];

        // Aplicar mapping: extraer valores, castear
        const transformedValues = {};
        for (const col of columnMapping) {
          const rawValue = rowData[col.source];
          const { value, error } = castValue(rawValue, col.type);
          transformedValues[col.target] = value;
          if (error) rowErrors.push(`[${col.target}]: ${error}`);
        }

        const status       = rowErrors.length === 0 ? 'ok' : 'warning';
        const statusDetail = rowErrors.length > 0 ? rowErrors.join('; ') : null;

        // Construir INSERT
        const cols     = columnMapping.map(c => `"${c.target}"`);
        const vals     = columnMapping.map(c => transformedValues[c.target]);
        const phs      = columnMapping.map((_, i) => `$${i + 4}`);

        await client.query(`
          INSERT INTO staging."${stagingTable}"
            (_source_row, _status, _status_detail, ${cols.join(', ')})
          VALUES ($1, $2, $3, ${phs.join(', ')})
        `, [rowNum, status, statusDetail, ...vals]);

        if (status === 'ok') processed++;
        else { processed++; errors++; } // warnings cuentan como procesadas
      }
    }

    // ── 3. Actualizar staging table en el job ──
    await client.query(`
      UPDATE staging.processing_jobs
      SET staging_table = $1,
          stats = $2::jsonb
      WHERE id = $3
    `, [
      `staging.${stagingTable}`,
      JSON.stringify({ total: totalRows, transformed: processed, warnings: errors }),
      jobId
    ]);

    await client.query('COMMIT');

    return {
      stagingTable: `staging.${stagingTable}`,
      total:   totalRows,
      transformed: processed,
      warnings: errors,
    };

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    // Marcar job como error
    await pool.query(`
      UPDATE staging.processing_jobs
      SET estado = 'error',
          error_log = $1::jsonb
      WHERE id = $2
    `, [JSON.stringify([{ error: err.message }]), jobId]).catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
