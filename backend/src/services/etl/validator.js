/**
 * ETL Validator — Fase 4: Validación de datos en Staging
 *
 * Responsabilidades:
 * - Aplicar reglas de validación por columna
 * - Marcar filas con _status: 'ok' | 'warning' | 'error'
 * - Generar error_log detallado por fila
 * - Calcular stats de calidad de datos
 */

import { pool } from '../../db/pool.js';

// ─────────────────────────────────────────────────────────────────────────────
// REGLAS DE VALIDACIÓN SQL
// Cada regla genera un UPDATE en la tabla staging
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aplica reglas de validación via SQL en la tabla staging
 * Para eficiencia, aplica reglas columna por columna en un solo UPDATE
 */
async function applyValidationRules(client, stagingTable, rules) {
  if (!rules || !rules.length) return { applied: 0 };

  // Agrupar reglas por campo para UPDATE eficiente
  const rulesByField = {};
  for (const rule of rules) {
    if (!rulesByField[rule.field]) rulesByField[rule.field] = [];
    rulesByField[rule.field].push(rule);
  }

  let applied = 0;

  for (const [field, fieldRules] of Object.entries(rulesByField)) {
    for (const rule of fieldRules) {
      let condition = '';
      let message = '';

      switch (rule.rule) {
        case 'required':
          condition = `"${field}" IS NULL OR trim("${field}"::TEXT) = ''`;
          message = `El campo "${field}" es obligatorio`;
          break;

        case 'min':
          condition = `"${field}" IS NOT NULL AND "${field}"::NUMERIC < ${parseFloat(rule.params.value)}`;
          message = `El campo "${field}" debe ser mayor o igual a ${rule.params.value}`;
          break;

        case 'max':
          condition = `"${field}" IS NOT NULL AND "${field}"::NUMERIC > ${parseFloat(rule.params.value)}`;
          message = `El campo "${field}" debe ser menor o igual a ${rule.params.value}`;
          break;

        case 'min_length':
          condition = `"${field}" IS NOT NULL AND length("${field}"::TEXT) < ${parseInt(rule.params.value, 10)}`;
          message = `El campo "${field}" debe tener al menos ${rule.params.value} caracteres`;
          break;

        case 'max_length':
          condition = `"${field}" IS NOT NULL AND length("${field}"::TEXT) > ${parseInt(rule.params.value, 10)}`;
          message = `El campo "${field}" no puede superar ${rule.params.value} caracteres`;
          break;

        case 'regex':
          // PELIGRO: escapar el patrón para evitar inyección SQL
          condition = `"${field}" IS NOT NULL AND "${field}"::TEXT !~ '^${rule.params.pattern.replace(/'/g, "''")}$'`;
          message = `El campo "${field}" no cumple el formato esperado`;
          break;

        case 'lat_range':
          // Validar que la latitud esté en rango válido Colombia: ~1-12 lat
          condition = `"${field}" IS NOT NULL AND ("${field}"::NUMERIC < -4.5 OR "${field}"::NUMERIC > 13.5)`;
          message = `La latitud en "${field}" está fuera del rango de Colombia`;
          break;

        case 'lon_range':
          // Validar que la longitud esté en rango válido Colombia: ~-80 a -66
          condition = `"${field}" IS NOT NULL AND ("${field}"::NUMERIC < -82 OR "${field}"::NUMERIC > -65)`;
          message = `La longitud en "${field}" está fuera del rango de Colombia`;
          break;

        default:
          continue; // Regla desconocida, saltar
      }

      if (!condition) continue;

      const severity = rule.severity || 'warning'; // 'warning' | 'error'

      await client.query(`
        UPDATE staging."${stagingTable}"
        SET _status        = CASE
              WHEN _status = 'error' OR $1 = 'error' THEN 'error'
              ELSE $1
            END,
            _status_detail = COALESCE(_status_detail || ' | ', '') || $2
        WHERE ${condition}
      `, [severity, message]);

      applied++;
    }
  }

  return { applied };
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDACIONES GEOESPACIALES AUTOMÁTICAS
// ─────────────────────────────────────────────────────────────────────────────

async function applyGeoValidations(client, stagingTable) {
  // Marcar geometrías inválidas
  await client.query(`
    UPDATE staging."${stagingTable}"
    SET _status        = CASE WHEN _status = 'error' THEN 'error' ELSE 'warning' END,
        _status_detail = COALESCE(_status_detail || ' | ', '') ||
                         'Geometría inválida (reparada automáticamente)'
    WHERE geom IS NOT NULL AND NOT ST_IsValid(geom)
  `);

  // Reparar geometrías inválidas
  await client.query(`
    UPDATE staging."${stagingTable}"
    SET geom = ST_MakeValid(geom)
    WHERE geom IS NOT NULL AND NOT ST_IsValid(geom)
  `);
}

// ─────────────────────────────────────────────────────────────────────────────
// CALCULAR ESTADÍSTICAS DE CALIDAD
// ─────────────────────────────────────────────────────────────────────────────

async function calcQualityStats(client, stagingTable) {
  const res = await client.query(`
    SELECT
      COUNT(*)                                          AS total,
      COUNT(*) FILTER (WHERE _status = 'ok')           AS ok_count,
      COUNT(*) FILTER (WHERE _status = 'warning')      AS warning_count,
      COUNT(*) FILTER (WHERE _status = 'error')        AS error_count,
      COUNT(*) FILTER (WHERE _matched = TRUE)          AS matched_count,
      COUNT(*) FILTER (WHERE _matched = FALSE)         AS unmatched_count,
      COUNT(*) FILTER (WHERE geom IS NOT NULL)         AS with_geom,
      COUNT(*) FILTER (WHERE geom IS NULL)             AS without_geom,
      ROUND(
        COUNT(*) FILTER (WHERE _status = 'ok')::NUMERIC /
        NULLIF(COUNT(*), 0) * 100, 1
      )                                                AS quality_pct
    FROM staging."${stagingTable}"
  `);
  return res.rows[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERAR ERROR LOG (muestra de filas con problemas)
// ─────────────────────────────────────────────────────────────────────────────

async function buildErrorLog(client, stagingTable) {
  const res = await client.query(`
    SELECT _row_id, _source_row, _status, _status_detail
    FROM staging."${stagingTable}"
    WHERE _status IN ('warning', 'error')
    ORDER BY _row_id
    LIMIT 100
  `);
  return res.rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL: validateStaging
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aplica validaciones a la tabla staging y actualiza el job con stats
 *
 * @param {object} params
 * @param {number} params.jobId           - ID del processing_job
 * @param {string} params.stagingTable    - Nombre: 'stg_42'
 * @param {Array}  params.validationRules - [{field, rule, params, severity}]
 *
 * @returns {object} Stats de calidad + error_log
 */
export async function validateStaging({ jobId, stagingTable, validationRules }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Aplicar reglas de usuario
    await applyValidationRules(client, stagingTable, validationRules || []);

    // Validaciones geoespaciales automáticas
    await applyGeoValidations(client, stagingTable);

    // Calcular stats
    const stats    = await calcQualityStats(client, stagingTable);
    const errorLog = await buildErrorLog(client, stagingTable);

    // Actualizar job: completado
    await client.query(`
      UPDATE staging.processing_jobs
      SET estado    = 'completado',
          stats     = $1::jsonb,
          error_log = $2::jsonb
      WHERE id = $3
    `, [
      JSON.stringify({
        total:         parseInt(stats.total, 10),
        ok:            parseInt(stats.ok_count, 10),
        warnings:      parseInt(stats.warning_count, 10),
        errors:        parseInt(stats.error_count, 10),
        matched:       parseInt(stats.matched_count, 10),
        unmatched:     parseInt(stats.unmatched_count, 10),
        with_geom:     parseInt(stats.with_geom, 10),
        without_geom:  parseInt(stats.without_geom, 10),
        quality_pct:   parseFloat(stats.quality_pct || 0),
      }),
      JSON.stringify(errorLog),
      jobId
    ]);

    // Actualizar etl_status del upload
    await client.query(`
      UPDATE public.uploads SET etl_status = 'staging' WHERE id = (
        SELECT upload_id FROM staging.processing_jobs WHERE id = $1
      )
    `, [jobId]);

    await client.query('COMMIT');

    return {
      stats: {
        total:        parseInt(stats.total, 10),
        ok:           parseInt(stats.ok_count, 10),
        warnings:     parseInt(stats.warning_count, 10),
        errors:       parseInt(stats.error_count, 10),
        matched:      parseInt(stats.matched_count, 10),
        unmatched:    parseInt(stats.unmatched_count, 10),
        withGeom:     parseInt(stats.with_geom, 10),
        withoutGeom:  parseInt(stats.without_geom, 10),
        qualityPct:   parseFloat(stats.quality_pct || 0),
      },
      errorLog,
    };

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
