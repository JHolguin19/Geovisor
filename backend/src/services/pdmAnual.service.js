/**
 * pdmAnual.service.js — Lógica de negocio para seguimiento PDM por año
 */

import pool from '../db/pool.js';
import { parseExcel, parseCSV } from '../utils/fileParser.js';

const VALID_YEARS = [2024, 2025, 2026, 2027];

function assertYear(year) {
  const y = parseInt(year);
  if (!VALID_YEARS.includes(y)) throw new Error('Año inválido');
  return y;
}

// ── Pipeline de limpieza (currency, %, numeric) ───────────────────────────────

function cleanCurrency(val) {
  if (val == null) return null;
  let s = String(val).trim();
  if (!s || s === '-' || s === '$-' || s === '$ -') return null;
  s = s.replace(/\$/g, '').replace(/\s/g, '');
  if (!s || s === '-') return null;
  if (s.includes(',') && s.includes('.')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.'))
      s = s.replace(/\./g, '').replace(',', '.');
    else
      s = s.replace(/,/g, '');
  } else if (s.includes(',') && !s.includes('.')) {
    const parts = s.split(',');
    s = parts[parts.length - 1].length <= 2
      ? s.replace(',', '.')
      : s.replace(/,/g, '');
  } else if (s.includes('.') && s.split('.').length > 2) {
    s = s.replace(/\./g, '');
  }
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function cleanPct(val) {
  if (val == null) return null;
  let s = String(val).trim();
  if (!s || s === '-') return null;
  const hasPct = s.includes('%');
  s = s.replace(/%/g, '').replace(/,/g, '.').trim();
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return hasPct ? n / 100 : n;
}

function cleanNum(val) {
  if (val == null) return null;
  let s = String(val).trim();
  if (!s || s === '-') return null;
  s = s.replace(/\s/g, '');
  if (s.includes(',') && s.includes('.')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.'))
      s = s.replace(/\./g, '').replace(',', '.');
    else
      s = s.replace(/,/g, '');
  } else if (s.includes(',')) {
    const parts = s.split(',');
    s = parts[parts.length - 1].length <= 2
      ? s.replace(',', '.')
      : s.replace(/,/g, '');
  }
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

/**
 * Detecta si los datos vienen en formato crudo (INFORME.csv con columnas duplicadas)
 * y los normaliza al formato esperado por uploadPdmExcel.
 */
function normalizeRawPdmRows(rows) {
  if (!rows.length) return rows;
  const keys = Object.keys(rows[0]);

  // Detect raw format: has "META PDM" (duplicated) and "TOTAL APROPIACION 2026"
  const hasRawCols = keys.some(k => k === 'META PDM' || k === 'META PDM.2') &&
    keys.some(k => k.includes('TOTAL APROPIACION'));
  if (!hasRawCols) return rows;

  // Find column indices for duplicated headers
  const metaPdmCols = keys.filter(k => /^META PDM(\.\d+)?$/.test(k)).sort();
  const metaFisCols = keys.filter(k => /^Meta Fisica Realizada(\.\d+)?$/.test(k)).sort();
  const obsCols = keys.filter(k => /^OBSERVACIONES(\.\d+)?$/.test(k)).sort();
  const compCols = keys.filter(k => /^COMPROMISOS(\.\d+)?$/.test(k)).sort();
  const pctObligCols = keys.filter(k => /^PORCENTAJE DE EJECUCION \(respecto a lo obligado\)(\.\d+)?$/.test(k)).sort();
  const pctPagosCols = keys.filter(k => /^PORCENTAJE DE EJECUCION \(respecto los pagos\)(\.\d+)?$/.test(k)).sort();
  const presupCompCols = keys.filter(k => /^PRESUPUESTO A COMPROMETER(\.\d+)?$/.test(k)).sort();
  const saldoCols = keys.filter(k => /^SALDO \(RP\)(\.\d+)?$/.test(k)).sort();

  // R__ columns (by index suffix: año1=2024, año2=2025, año3=2026, año4=2027)
  const pondCols = keys.filter(k => /R__Pond\. Avance/.test(k));
  const pctAvCols = keys.filter(k => /R__%\s*avance\s*A/.test(k));

  return rows
    .filter(r => r['Metas'] != null && String(r['Metas']).trim() !== '')
    .map(r => {
      const out = {};
      out.meta_num = cleanNum(r['Metas']);

      // Scalar fields
      out.secretaria = r['SECRETARIA'];
      out.descripcion_meta = r['Descripcion Meta'];
      out.tipo_ponderado = r['TIPO DE PONDERADO'];

      // Per-year metas (META PDM, META PDM.1, META PDM.2, META PDM.3 = 2024..2027)
      for (let yi = 0; yi < 4; yi++) {
        const y = 2024 + yi;
        const pdmCol = metaPdmCols[yi];
        const fisCol = metaFisCols[yi];
        if (pdmCol) out[`meta_pdm_${y}`] = cleanNum(r[pdmCol]);
        if (fisCol) out[`meta_fisica_${y}`] = cleanNum(r[fisCol]);
      }

      // Presupuesto per year
      for (const y of VALID_YEARS) {
        const presObj = {};
        presObj.total_apropiacion = cleanCurrency(r[`TOTAL APROPIACION ${y}`]);
        presObj.neto_registros = cleanCurrency(r[`NETO REGISTROS ${y}`]);

        // TOTAL OBLIGACIÓN can have encoding issues, find by pattern
        const oblKey = keys.find(k => k.includes('OBLIGACI') && k.includes(String(y)));
        presObj.total_obligacion = oblKey ? cleanCurrency(r[oblKey]) : null;

        // % ejecucion (indexed: .0=2024, .1=2025, .2=2026, .3=2027)
        const yi = y - 2024;
        if (pctObligCols[yi]) presObj.pct_ejecucion_obligado = cleanPct(r[pctObligCols[yi]]);
        if (pctPagosCols[yi]) presObj.pct_ejecucion_pagos = cleanPct(r[pctPagosCols[yi]]);
        if (presupCompCols[yi]) presObj.presupuesto_comprometer = cleanCurrency(r[presupCompCols[yi]]);

        // IMDER has a separate appropriation column
        const imderKey = keys.find(k => k.includes('APROPIACION IMDER') && k.includes(String(y)));
        if (imderKey) {
          const imderVal = cleanCurrency(r[imderKey]);
          if (imderVal && imderVal > 0) {
            presObj.total_apropiacion = (presObj.total_apropiacion || 0) + imderVal;
          }
        }

        // Only include if has any value
        const hasAny = Object.values(presObj).some(v => v != null);
        out[`total_apropiacion_${y}`] = presObj.total_apropiacion;
        out[`neto_registros_${y}`] = presObj.neto_registros;
        out[`total_obligacion_${y}`] = presObj.total_obligacion;
        out[`pct_ejecucion_obligado_${y}`] = presObj.pct_ejecucion_obligado;
        out[`pct_ejecucion_pagos_${y}`] = presObj.pct_ejecucion_pagos;
        out[`presupuesto_comprometer_${y}`] = presObj.presupuesto_comprometer;
      }

      // Eficiencia columns
      for (const y of VALID_YEARS) {
        out[`eficiencia_${y}`] = cleanPct(r[`Eficiencia ${y}`]);
      }

      // R__ Ponderado avance (año1=2024..año4=2027)
      for (let yi = 0; yi < 4; yi++) {
        const y = 2024 + yi;
        const col = pondCols.find(k => k.includes(`o${yi + 1}`) || k.includes(`año${yi + 1}`));
        if (col) out[`ponderado_avance_${y}`] = cleanPct(r[col]);
      }

      // Observaciones / compromisos
      for (let yi = 0; yi < 4; yi++) {
        const y = 2024 + yi;
        if (obsCols[yi]) out[`observaciones_${y}`] = r[obsCols[yi]] || null;
        if (compCols[yi]) out[`compromisos_${y}`] = r[compCols[yi]] || null;
      }

      // Avance fisico / cumplimiento
      out.avance_fisico = cleanPct(r['Avance fisico']);
      out.cumplimiento_cuatrienio = cleanPct(r['% de Cumplimiento Cuatrienio']);

      return out;
    });
}

// ── Overview anual ────────────────────────────────────────────────────────────

export async function getYearOverview(year) {
  const y = assertYear(year);

  // Avance físico: capped at MIN(meta_fisica_Y, meta_pdm_Y) / meta_cuatrienio.
  // Guarantees over-achievement doesn't inflate indicators.
  const { rows } = await pool.query(`
    WITH caps AS (
      SELECT *,
        LEAST(COALESCE(meta_fisica_2024::numeric,0), CASE WHEN COALESCE(meta_pdm_2024::numeric,0)>0 THEN meta_pdm_2024::numeric ELSE COALESCE(meta_fisica_2024::numeric,0) END) AS c24,
        LEAST(COALESCE(meta_fisica_2025::numeric,0), CASE WHEN COALESCE(meta_pdm_2025::numeric,0)>0 THEN meta_pdm_2025::numeric ELSE COALESCE(meta_fisica_2025::numeric,0) END) AS c25,
        LEAST(COALESCE(meta_fisica_2026::numeric,0), CASE WHEN COALESCE(meta_pdm_2026::numeric,0)>0 THEN meta_pdm_2026::numeric ELSE COALESCE(meta_fisica_2026::numeric,0) END) AS c26,
        LEAST(COALESCE(meta_fisica_2027::numeric,0), CASE WHEN COALESCE(meta_pdm_2027::numeric,0)>0 THEN meta_pdm_2027::numeric ELSE COALESCE(meta_fisica_2027::numeric,0) END) AS c27
      FROM pdm_metas
    )
    SELECT
      COUNT(*)                                                              AS total_metas,
      COUNT(*) FILTER (WHERE meta_pdm_${y} IS NOT NULL)                    AS programadas,
      COUNT(*) FILTER (WHERE meta_pdm_${y} IS NULL)                        AS no_programadas,
      COUNT(*) FILTER (WHERE presupuesto_${y} IS NOT NULL
                         AND (presupuesto_${y}->>'total_apropiacion')::numeric > 0) AS con_presupuesto,
      COUNT(*) FILTER (WHERE meta_pdm_${y} IS NOT NULL
                         AND presupuesto_${y} IS NOT NULL
                         AND (presupuesto_${y}->>'total_apropiacion')::numeric > 0) AS activas_con_presupuesto,
      COUNT(*) FILTER (WHERE meta_pdm_${y} IS NOT NULL
                         AND (meta_fisica_${y} IS NULL OR meta_fisica_${y}::numeric = 0)) AS sin_ejecucion,
      -- Programadas sin presupuesto asignado (scheduled but zero budget)
      COUNT(*) FILTER (WHERE meta_pdm_${y} IS NOT NULL
                         AND (presupuesto_${y} IS NULL
                              OR COALESCE((presupuesto_${y}->>'total_apropiacion')::numeric, 0) = 0))
                                                                            AS programadas_sin_presupuesto,

      ROUND(AVG(LEAST(eficiencia_${y}, 1.0)) FILTER (WHERE eficiencia_${y} IS NOT NULL) * 100, 1) AS eficiencia_promedio,

      -- avance_fisico_pct: SUM(all capped years) / SUM(meta_cuatrienio), global cap at 100%
      ROUND(
        LEAST(SUM(c24+c25+c26+c27), SUM(COALESCE(meta_cuatrienio::numeric,0)))
        / NULLIF(SUM(COALESCE(meta_cuatrienio::numeric,0)), 0) * 100, 1
      ) AS avance_fisico_pct,

      -- avance_fisico_anio_pct: AVG(min(realizado_Y/meta_cuatrienio, 1)) × 100 — matches Spreadsheet col R
      LEAST(ROUND(
        AVG(LEAST(COALESCE(meta_fisica_${y}::numeric,0) / NULLIF(meta_cuatrienio::numeric,0), 1.0))
        FILTER (WHERE meta_cuatrienio::numeric > 0) * 100, 1
      ), 100) AS avg_ponderado_anio,
      LEAST(ROUND(
        AVG(LEAST(COALESCE(meta_fisica_${y}::numeric,0) / NULLIF(meta_cuatrienio::numeric,0), 1.0))
        FILTER (WHERE meta_cuatrienio::numeric > 0) * 100, 1
      ), 100) AS avance_fisico_anio_pct,

      -- % del cuatrienio esperado para este año (usa incremento para acumulativas)
      ROUND(
        SUM(CASE WHEN tipo_ponderado = 'Acumulativo'
                 THEN GREATEST(COALESCE(meta_pdm_${y}::numeric, 0) - COALESCE(${y > 2024 ? `meta_pdm_${y - 1}::numeric` : '0'}, 0), 0)
                 ELSE COALESCE(meta_pdm_${y}::numeric, 0) END
        ) FILTER (WHERE meta_pdm_${y} IS NOT NULL AND meta_cuatrienio::numeric > 0)
        / NULLIF(SUM(meta_cuatrienio::numeric) FILTER (WHERE meta_pdm_${y} IS NOT NULL AND meta_cuatrienio::numeric > 0), 0) * 100, 1
      ) AS pct_programado_del_cuatrienio,

      ROUND(SUM(COALESCE((presupuesto_${y}->>'total_apropiacion')::numeric, 0)) / 1000000, 0) AS apropiacion_m,
      ROUND(SUM(COALESCE((presupuesto_${y}->>'neto_registros')::numeric, 0)) / 1000000, 0)    AS comprometido_m,
      ROUND(SUM(COALESCE((presupuesto_${y}->>'total_obligacion')::numeric, 0)) / 1000000, 0)  AS obligado_m,

      ROUND(
        SUM(COALESCE((presupuesto_${y}->>'neto_registros')::numeric, 0)) /
        NULLIF(SUM(COALESCE((presupuesto_${y}->>'total_apropiacion')::numeric, 0)), 0) * 100, 1
      ) AS avance_financiero_comprometido_pct,
      ROUND(
        SUM(COALESCE((presupuesto_${y}->>'total_obligacion')::numeric, 0)) /
        NULLIF(SUM(COALESCE((presupuesto_${y}->>'total_apropiacion')::numeric, 0)), 0) * 100, 1
      ) AS avance_financiero_obligado_pct,

      COUNT(*) FILTER (WHERE eficiencia_${y} IS NOT NULL AND eficiencia_${y} >= 0.8)                             AS semaforo_verde,
      COUNT(*) FILTER (WHERE eficiencia_${y} IS NOT NULL AND eficiencia_${y} >= 0.5 AND eficiencia_${y} < 0.8)  AS semaforo_amarillo,
      COUNT(*) FILTER (WHERE eficiencia_${y} IS NOT NULL AND eficiencia_${y} < 0.5)                              AS semaforo_rojo,
      COUNT(*) FILTER (WHERE eficiencia_${y} IS NULL AND meta_pdm_${y} IS NOT NULL)                              AS semaforo_sin_dato
    FROM caps
  `);

  return rows[0];
}

// ── Por secretaría ────────────────────────────────────────────────────────────

export async function getYearBySecretaria(year) {
  const y = assertYear(year);

  const { rows } = await pool.query(`
    SELECT
      secretaria,
      COUNT(*)                                                             AS total_metas,
      COUNT(*) FILTER (WHERE meta_pdm_${y} IS NOT NULL)                    AS programadas,
      COUNT(*) FILTER (WHERE meta_pdm_${y} IS NULL)                        AS no_programadas,
      ROUND(AVG(LEAST(eficiencia_${y}, 1.0)) FILTER (WHERE eficiencia_${y} IS NOT NULL) * 100, 1) AS eficiencia_promedio,
      -- avance_fisico cuatrienio: SUM(capped all years) / SUM(mc), capped at 100%
      ROUND(
        LEAST(
          SUM(
            LEAST(COALESCE(meta_fisica_2024::numeric,0), CASE WHEN COALESCE(meta_pdm_2024::numeric,0)>0 THEN meta_pdm_2024::numeric ELSE COALESCE(meta_fisica_2024::numeric,0) END) +
            LEAST(COALESCE(meta_fisica_2025::numeric,0), CASE WHEN COALESCE(meta_pdm_2025::numeric,0)>0 THEN meta_pdm_2025::numeric ELSE COALESCE(meta_fisica_2025::numeric,0) END) +
            LEAST(COALESCE(meta_fisica_2026::numeric,0), CASE WHEN COALESCE(meta_pdm_2026::numeric,0)>0 THEN meta_pdm_2026::numeric ELSE COALESCE(meta_fisica_2026::numeric,0) END) +
            LEAST(COALESCE(meta_fisica_2027::numeric,0), CASE WHEN COALESCE(meta_pdm_2027::numeric,0)>0 THEN meta_pdm_2027::numeric ELSE COALESCE(meta_fisica_2027::numeric,0) END)
          ),
          SUM(COALESCE(meta_cuatrienio::numeric,0))
        ) / NULLIF(SUM(COALESCE(meta_cuatrienio::numeric,0)), 0) * 100, 1
      ) AS avance_fisico_pct,
      -- avance_fisico año: AVG(min(realizado_Y/mc, 1)) × 100 — matches Spreadsheet col R
      LEAST(ROUND(
        AVG(LEAST(COALESCE(meta_fisica_${y}::numeric,0) / NULLIF(meta_cuatrienio::numeric,0), 1.0))
        FILTER (WHERE meta_cuatrienio::numeric > 0) * 100, 1
      ), 100) AS avance_fisico_anio_pct,
      ROUND(SUM(COALESCE((presupuesto_${y}->>'total_apropiacion')::numeric, 0)) / 1000000, 0) AS apropiacion_m,
      ROUND(SUM(COALESCE((presupuesto_${y}->>'neto_registros')::numeric, 0)) / 1000000, 0)    AS comprometido_m,
      ROUND(SUM(COALESCE((presupuesto_${y}->>'total_obligacion')::numeric, 0)) / 1000000, 0)  AS obligado_m,
      SUM(COALESCE(meta_pdm_${y}::numeric, 0))    AS sum_meta_pdm,
      SUM(COALESCE(meta_fisica_${y}::numeric, 0)) AS sum_meta_fisica,
      COUNT(*) FILTER (WHERE eficiencia_${y} IS NOT NULL AND eficiencia_${y} >= 0.8)                             AS semaforo_verde,
      COUNT(*) FILTER (WHERE eficiencia_${y} IS NOT NULL AND eficiencia_${y} >= 0.5 AND eficiencia_${y} < 0.8)  AS semaforo_amarillo,
      COUNT(*) FILTER (WHERE eficiencia_${y} IS NOT NULL AND eficiencia_${y} < 0.5)                              AS semaforo_rojo
    FROM pdm_metas
    GROUP BY secretaria
    ORDER BY apropiacion_m DESC NULLS LAST
  `);

  return rows;
}

// ── Por pilar ─────────────────────────────────────────────────────────────────

export async function getYearByPilar(year) {
  const y = assertYear(year);

  const { rows } = await pool.query(`
    SELECT
      num_pilar, nom_pilar,
      COUNT(*)                                                             AS total_metas,
      COUNT(*) FILTER (WHERE meta_pdm_${y} IS NOT NULL)                    AS programadas,
      COUNT(*) FILTER (WHERE meta_pdm_${y} IS NULL)                        AS no_programadas,
      ROUND(AVG(LEAST(eficiencia_${y}, 1.0)) FILTER (WHERE eficiencia_${y} IS NOT NULL) * 100, 1) AS eficiencia_promedio,
      -- avance_fisico cuatrienio: SUM(capped all years) / SUM(mc), capped at 100%
      ROUND(
        LEAST(
          SUM(
            LEAST(COALESCE(meta_fisica_2024::numeric,0), CASE WHEN COALESCE(meta_pdm_2024::numeric,0)>0 THEN meta_pdm_2024::numeric ELSE COALESCE(meta_fisica_2024::numeric,0) END) +
            LEAST(COALESCE(meta_fisica_2025::numeric,0), CASE WHEN COALESCE(meta_pdm_2025::numeric,0)>0 THEN meta_pdm_2025::numeric ELSE COALESCE(meta_fisica_2025::numeric,0) END) +
            LEAST(COALESCE(meta_fisica_2026::numeric,0), CASE WHEN COALESCE(meta_pdm_2026::numeric,0)>0 THEN meta_pdm_2026::numeric ELSE COALESCE(meta_fisica_2026::numeric,0) END) +
            LEAST(COALESCE(meta_fisica_2027::numeric,0), CASE WHEN COALESCE(meta_pdm_2027::numeric,0)>0 THEN meta_pdm_2027::numeric ELSE COALESCE(meta_fisica_2027::numeric,0) END)
          ),
          SUM(COALESCE(meta_cuatrienio::numeric,0))
        ) / NULLIF(SUM(COALESCE(meta_cuatrienio::numeric,0)), 0) * 100, 1
      ) AS avance_fisico_pct,
      -- avance_fisico año: AVG(min(realizado_Y/mc, 1)) × 100 — matches Spreadsheet col R
      LEAST(ROUND(
        AVG(LEAST(COALESCE(meta_fisica_${y}::numeric,0) / NULLIF(meta_cuatrienio::numeric,0), 1.0))
        FILTER (WHERE meta_cuatrienio::numeric > 0) * 100, 1
      ), 100) AS avance_fisico_anio_pct,
      ROUND(SUM(COALESCE((presupuesto_${y}->>'total_apropiacion')::numeric, 0)) / 1000000, 0) AS apropiacion_m,
      ROUND(SUM(COALESCE((presupuesto_${y}->>'neto_registros')::numeric, 0)) / 1000000, 0)    AS comprometido_m,
      ROUND(SUM(COALESCE((presupuesto_${y}->>'total_obligacion')::numeric, 0)) / 1000000, 0)  AS obligado_m,
      SUM(COALESCE(meta_pdm_${y}::numeric, 0))    AS sum_meta_pdm,
      SUM(COALESCE(meta_fisica_${y}::numeric, 0)) AS sum_meta_fisica,
      COUNT(*) FILTER (WHERE eficiencia_${y} IS NOT NULL AND eficiencia_${y} >= 0.8)                             AS semaforo_verde,
      COUNT(*) FILTER (WHERE eficiencia_${y} IS NOT NULL AND eficiencia_${y} >= 0.5 AND eficiencia_${y} < 0.8)  AS semaforo_amarillo,
      COUNT(*) FILTER (WHERE eficiencia_${y} IS NOT NULL AND eficiencia_${y} < 0.5)                              AS semaforo_rojo
    FROM pdm_metas
    WHERE num_pilar IS NOT NULL
    GROUP BY num_pilar, nom_pilar
    ORDER BY num_pilar
  `);

  return rows;
}

// ── Lista de metas del año ────────────────────────────────────────────────────

export async function getYearMetas(year, { secretaria, pilar, semaforo, busqueda, page = 1, limit = 50 }) {
  const y = assertYear(year);
  const params = [];
  const filters = [];

  if (secretaria) { params.push(secretaria); filters.push(`secretaria = $${params.length}`); }
  if (pilar)      { params.push(parseInt(pilar)); filters.push(`num_pilar = $${params.length}`); }
  if (busqueda)   {
    params.push(`%${busqueda}%`);
    filters.push(`(descripcion_meta ILIKE $${params.length} OR secretaria ILIKE $${params.length})`);
  }

  // Filtro semáforo
  if (semaforo === 'verde')          filters.push(`eficiencia_${y} >= 0.8`);
  if (semaforo === 'amarillo')       filters.push(`eficiencia_${y} >= 0.5 AND eficiencia_${y} < 0.8`);
  if (semaforo === 'rojo')           filters.push(`eficiencia_${y} < 0.5`);
  if (semaforo === 'sin_dato')       filters.push(`eficiencia_${y} IS NULL AND meta_pdm_${y} IS NOT NULL`);
  // Alert filters
  if (semaforo === 'sin_programar')  filters.push(`meta_pdm_${y} IS NULL`);
  if (semaforo === 'sin_presupuesto') filters.push(
    `(presupuesto_${y} IS NULL OR COALESCE((presupuesto_${y}->>'total_apropiacion')::numeric, 0) = 0)`
  );
  if (semaforo === 'programada_sin_presupuesto') filters.push(
    `meta_pdm_${y} IS NOT NULL AND (presupuesto_${y} IS NULL OR COALESCE((presupuesto_${y}->>'total_apropiacion')::numeric, 0) = 0)`
  );

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const [dataRes, countRes] = await Promise.all([
    pool.query(`
      SELECT
        id, meta_num, secretaria, descripcion_meta, num_pilar, nom_pilar,
        meta_pdm_${y}                                                                AS meta_pdm,
        meta_fisica_${y}                                                             AS meta_fisica,
        LEAST(COALESCE(eficiencia_${y}, 0), 1.0)                                    AS eficiencia,
        presupuesto_${y}                                                             AS presupuesto,
        observaciones_${y}                                                           AS observaciones,
        compromisos_${y}                                                             AS compromisos
      FROM pdm_metas ${where}
      ORDER BY meta_num ASC NULLS LAST
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, parseInt(limit), offset]),
    pool.query(`SELECT COUNT(*) FROM pdm_metas ${where}`, params),
  ]);

  return {
    data: dataRes.rows,
    total: parseInt(countRes.rows[0].count),
    page: parseInt(page),
    limit: parseInt(limit),
  };
}

// ── Upload Excel/CSV ─────────────────────────────────────────────────────────

export async function uploadPdmExcel(filePath, year) {
  const y = assertYear(year);

  // Support CSV and Excel
  const isCSV = filePath.toLowerCase().endsWith('.csv');
  let rawRows = isCSV ? await parseCSV(filePath) : await parseExcel(filePath);

  // Apply cleaning pipeline if raw format detected (INFORME.csv style)
  rawRows = normalizeRawPdmRows(rawRows);

  if (!rawRows.length) return { actualizados: 0, errores: [], sin_cambios: 0 };

  const client = await pool.connect();
  let actualizados = 0;
  let sin_cambios = 0;
  let hasPondFromCSV = false;
  let hasEffFromCSV = false;
  const errores = [];

  try {
    await client.query('BEGIN');

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const metaNum = row.meta_num ?? row.META_NUM ?? row['Meta Num'] ?? row['meta num'] ?? row['Metas'];

      if (!metaNum) {
        errores.push({ fila: i + 2, error: 'meta_num no encontrado' });
        continue;
      }

      // Build dynamic SET clauses
      const sets = [];
      const vals = [metaNum];
      let idx = 2;

      // Meta PDM del año
      const metaPdm = row[`meta_pdm_${y}`] ?? row[`META_PDM_${y}`] ?? row[`Meta PDM ${y}`];
      if (metaPdm != null && metaPdm !== '') {
        sets.push(`meta_pdm_${y} = $${idx}`);
        vals.push(parseFloat(metaPdm));
        idx++;
      }

      // Meta física del año
      const metaFisica = row[`meta_fisica_${y}`] ?? row[`META_FISICA_${y}`] ?? row[`Meta Fisica ${y}`];
      if (metaFisica != null && metaFisica !== '') {
        sets.push(`meta_fisica_${y} = $${idx}`);
        vals.push(parseFloat(metaFisica));
        idx++;
      }

      // Presupuesto JSONB
      const presupuestoKeys = ['total_apropiacion', 'neto_registros', 'total_obligacion', 'pct_ejecucion_obligado', 'pct_ejecucion_pagos', 'presupuesto_comprometer'];
      const presupuestoObj = {};
      let hasPresupuesto = false;
      for (const key of presupuestoKeys) {
        const val = row[`${key}_${y}`] ?? row[`${key.toUpperCase()}_${y}`];
        if (val != null && val !== '') {
          presupuestoObj[key] = parseFloat(val);
          hasPresupuesto = true;
        }
      }
      if (hasPresupuesto) {
        sets.push(`presupuesto_${y} = COALESCE(presupuesto_${y}, '{}'::jsonb) || $${idx}::jsonb`);
        vals.push(JSON.stringify(presupuestoObj));
        idx++;
      }

      // Observaciones
      const obs = row[`observaciones_${y}`] ?? row[`OBSERVACIONES_${y}`] ?? row[`Observaciones ${y}`];
      if (obs != null && obs !== '') {
        sets.push(`observaciones_${y} = $${idx}`);
        vals.push(String(obs));
        idx++;
      }

      // Compromisos
      const comp = row[`compromisos_${y}`] ?? row[`COMPROMISOS_${y}`] ?? row[`Compromisos ${y}`];
      if (comp != null && comp !== '') {
        sets.push(`compromisos_${y} = $${idx}`);
        vals.push(String(comp));
        idx++;
      }

      // Ponderado avance del año (from CSV R__Pond. Avance añoN)
      const pondVal = row[`ponderado_avance_${y}`];
      if (pondVal != null && pondVal !== '') {
        sets.push(`ponderado_avance_${y} = $${idx}`);
        vals.push(parseFloat(pondVal));
        idx++;
        hasPondFromCSV = true;
      }

      // Eficiencia del año (from CSV Eficiencia YYYY)
      const effVal = row[`eficiencia_${y}`];
      if (effVal != null && effVal !== '') {
        sets.push(`eficiencia_${y} = $${idx}`);
        vals.push(parseFloat(effVal));
        idx++;
        hasEffFromCSV = true;
      }

      // Avance fisico global
      const avFis = row.avance_fisico;
      if (avFis != null && avFis !== '') {
        sets.push(`avance_fisico = $${idx}`);
        vals.push(parseFloat(avFis));
        idx++;
      }

      // Cumplimiento cuatrienio
      const cumpl = row.cumplimiento_cuatrienio;
      if (cumpl != null && cumpl !== '') {
        sets.push(`cumplimiento_cuatrienio = $${idx}`);
        vals.push(parseFloat(cumpl));
        idx++;
      }

      // Ponderado cuatrienio
      const pondCuat = row.ponderado_cuatrienio;
      if (pondCuat != null && pondCuat !== '') {
        sets.push(`ponderado_cuatrienio = $${idx}`);
        vals.push(parseFloat(pondCuat));
        idx++;
      }

      if (sets.length === 0) {
        sin_cambios++;
        continue;
      }

      try {
        const result = await client.query(
          `UPDATE pdm_metas SET ${sets.join(', ')} WHERE meta_num = $1`,
          vals
        );
        if (result.rowCount > 0) actualizados++;
        else sin_cambios++;
      } catch (err) {
        errores.push({ fila: i + 2, meta_num: metaNum, error: err.message });
      }
    }

    // ── Recálculo de métricas derivadas ───────────────────────────────────
    // REGLA CLAVE: si meta_fisica > meta_pdm → se capea a meta_pdm.
    // La sobre-ejecución indica mala planeación, no mayor progreso.
    //
    // TIPOS DE PONDERADO:
    // - Acumulativo: meta_pdm_Y es el acumulado hasta ese año (2024=100, 2025=200, 2026=300, 2027=400).
    //   El avance cuatrienal = max(capped por año) / meta_cuatrienio (solo el último valor importa).
    //   El aporte anual (ponderado_avance_Y) = incremento capeado / meta_cuatrienio.
    // - No acumulativo: meta_pdm_Y es independiente por año.
    //   El avance cuatrienal = sum(capped por año) / sum(meta_pdm por año).

    // Helper: "valor efectivo" capeado — meta_fisica no supera meta_pdm
    // SQL inline: LEAST(COALESCE(meta_fisica_Y, 0), CASE WHEN meta_pdm_Y > 0 THEN meta_pdm_Y ELSE COALESCE(meta_fisica_Y, 0) END)
    const cap = (fy, py) =>
      `LEAST(COALESCE(${fy}, 0), CASE WHEN ${py} IS NOT NULL AND ${py} > 0 THEN ${py} ELSE COALESCE(${fy}, 0) END)`;

    const capY  = cap(`meta_fisica_${y}`, `meta_pdm_${y}`);
    const cap24 = cap('meta_fisica_2024', 'meta_pdm_2024');
    const cap25 = cap('meta_fisica_2025', 'meta_pdm_2025');
    const cap26 = cap('meta_fisica_2026', 'meta_pdm_2026');
    const cap27 = cap('meta_fisica_2027', 'meta_pdm_2027');

    // 1. Eficiencia del año: siempre recalcular capeada a 1.0 (100%)
    await client.query(`
      UPDATE pdm_metas
      SET eficiencia_${y} = LEAST(
        meta_fisica_${y}::numeric / NULLIF(meta_pdm_${y}::numeric, 0),
        1.0
      )
      WHERE meta_pdm_${y} IS NOT NULL AND meta_pdm_${y} != 0
    `);

    // 2. Ponderado avance del año (contribución al cuatrienio, capeada) — siempre recalcular
    // WHERE cubre ambos tipos: Acumulativo (necesita meta_cuatrienio > 0) y
    // No Acumulativo (necesita sum(meta_pdm) > 0, meta_cuatrienio puede ser NULL).
    await client.query(`
      UPDATE pdm_metas
      SET ponderado_avance_${y} = CASE
        WHEN tipo_ponderado = 'Acumulativo'
          THEN ${capY}::numeric / NULLIF(meta_cuatrienio::numeric, 0)
        ELSE
          ${capY}::numeric / NULLIF(
            (COALESCE(meta_pdm_2024, 0) + COALESCE(meta_pdm_2025, 0) +
             COALESCE(meta_pdm_2026, 0) + COALESCE(meta_pdm_2027, 0))::numeric, 0)
      END
      WHERE (
        (tipo_ponderado = 'Acumulativo' AND meta_cuatrienio IS NOT NULL AND meta_cuatrienio::numeric != 0)
        OR (tipo_ponderado != 'Acumulativo' AND
            COALESCE(meta_pdm_2024::numeric,0)+COALESCE(meta_pdm_2025::numeric,0)+
            COALESCE(meta_pdm_2026::numeric,0)+COALESCE(meta_pdm_2027::numeric,0) > 0)
      )
    `);

    // 3. Avance cuatrienal, ponderado cuatrienal y cumplimiento (todos capeados)
    // WHERE cubre ambos tipos: Acumulativo y No Acumulativo (ver paso 2 para explicación).
    await client.query(`
      UPDATE pdm_metas
      SET
        avance_fisico = LEAST(CASE
          WHEN tipo_ponderado = 'Acumulativo'
            THEN GREATEST(${cap24}, ${cap25}, ${cap26}, ${cap27})::numeric
                 / NULLIF(meta_cuatrienio::numeric, 0)
          ELSE
            (${cap24} + ${cap25} + ${cap26} + ${cap27})::numeric
            / NULLIF(
                (COALESCE(meta_pdm_2024,0) + COALESCE(meta_pdm_2025,0) +
                 COALESCE(meta_pdm_2026,0) + COALESCE(meta_pdm_2027,0))::numeric, 0)
        END, 1.0),
        ponderado_cuatrienio = LEAST(CASE
          WHEN tipo_ponderado = 'Acumulativo'
            THEN GREATEST(${cap24}, ${cap25}, ${cap26}, ${cap27})::numeric
                 / NULLIF(meta_cuatrienio::numeric, 0)
          ELSE
            (${cap24} + ${cap25} + ${cap26} + ${cap27})::numeric
            / NULLIF(
                (COALESCE(meta_pdm_2024,0) + COALESCE(meta_pdm_2025,0) +
                 COALESCE(meta_pdm_2026,0) + COALESCE(meta_pdm_2027,0))::numeric, 0)
        END, 1.0),
        cumplimiento_cuatrienio = LEAST(CASE
          WHEN tipo_ponderado = 'Acumulativo'
            THEN GREATEST(${cap24}, ${cap25}, ${cap26}, ${cap27})::numeric
                 / NULLIF(meta_cuatrienio::numeric, 0) * 100
          ELSE
            (${cap24} + ${cap25} + ${cap26} + ${cap27})::numeric
            / NULLIF(
                (COALESCE(meta_pdm_2024,0) + COALESCE(meta_pdm_2025,0) +
                 COALESCE(meta_pdm_2026,0) + COALESCE(meta_pdm_2027,0))::numeric, 0) * 100
        END, 100)
      WHERE (
        (tipo_ponderado = 'Acumulativo' AND meta_cuatrienio IS NOT NULL AND meta_cuatrienio::numeric != 0)
        OR (tipo_ponderado != 'Acumulativo' AND
            COALESCE(meta_pdm_2024::numeric,0)+COALESCE(meta_pdm_2025::numeric,0)+
            COALESCE(meta_pdm_2026::numeric,0)+COALESCE(meta_pdm_2027::numeric,0) > 0)
      )
    `);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return { actualizados, sin_cambios, errores, total_filas: rawRows.length };
}

// ── Comparativo esperado vs realizado (todos los años) ────────────────────

export async function getComparativoAnual() {
  // Para metas Acumulativas, meta_pdm_Y es acumulado → usamos INCREMENTO para que la suma ~100%.
  //   incremento_Y = meta_pdm_Y - meta_pdm_{Y-1}  (2024 no tiene anterior → meta_pdm_2024).
  // Para No acumulativas, meta_pdm_Y ya es independiente.
  // Realizado se capea: meta_fisica no puede superar meta_pdm (sobre-ejecución = mala planeación).
  const { rows } = await pool.query(`
    WITH metas_calc AS (
      SELECT
        m.*,
        -- Incremento esperado por año (acumulativo → incremento, no-acum → meta_pdm directo)
        CASE WHEN m.tipo_ponderado = 'Acumulativo'
             THEN COALESCE(m.meta_pdm_2024, 0)
             ELSE COALESCE(m.meta_pdm_2024, 0) END AS inc_pdm_2024,
        CASE WHEN m.tipo_ponderado = 'Acumulativo'
             THEN GREATEST(COALESCE(m.meta_pdm_2025, 0) - COALESCE(m.meta_pdm_2024, 0), 0)
             ELSE COALESCE(m.meta_pdm_2025, 0) END AS inc_pdm_2025,
        CASE WHEN m.tipo_ponderado = 'Acumulativo'
             THEN GREATEST(COALESCE(m.meta_pdm_2026, 0) - COALESCE(m.meta_pdm_2025, 0), 0)
             ELSE COALESCE(m.meta_pdm_2026, 0) END AS inc_pdm_2026,
        CASE WHEN m.tipo_ponderado = 'Acumulativo'
             THEN GREATEST(COALESCE(m.meta_pdm_2027, 0) - COALESCE(m.meta_pdm_2026, 0), 0)
             ELSE COALESCE(m.meta_pdm_2027, 0) END AS inc_pdm_2027,
        -- Realizado capeado por año (no supera meta_pdm)
        LEAST(COALESCE(m.meta_fisica_2024,0), CASE WHEN m.meta_pdm_2024 > 0 THEN m.meta_pdm_2024 ELSE COALESCE(m.meta_fisica_2024,0) END) AS cap_fis_2024,
        LEAST(COALESCE(m.meta_fisica_2025,0), CASE WHEN m.meta_pdm_2025 > 0 THEN m.meta_pdm_2025 ELSE COALESCE(m.meta_fisica_2025,0) END) AS cap_fis_2025,
        LEAST(COALESCE(m.meta_fisica_2026,0), CASE WHEN m.meta_pdm_2026 > 0 THEN m.meta_pdm_2026 ELSE COALESCE(m.meta_fisica_2026,0) END) AS cap_fis_2026,
        LEAST(COALESCE(m.meta_fisica_2027,0), CASE WHEN m.meta_pdm_2027 > 0 THEN m.meta_pdm_2027 ELSE COALESCE(m.meta_fisica_2027,0) END) AS cap_fis_2027
      FROM pdm_metas m
    )
    SELECT
      yr.year,

      -- % esperado: SUM(inc_Y) / SUM(total_inc) → garantiza que los 4 años sumen exactamente 100%
      ROUND(
        SUM(CASE yr.year
          WHEN 2024 THEN mc.inc_pdm_2024
          WHEN 2025 THEN mc.inc_pdm_2025
          WHEN 2026 THEN mc.inc_pdm_2026
          WHEN 2027 THEN mc.inc_pdm_2027
        END)::numeric /
        NULLIF(SUM(mc.inc_pdm_2024 + mc.inc_pdm_2025 + mc.inc_pdm_2026 + mc.inc_pdm_2027)::numeric, 0)
        * 100, 1) AS pct_esperado,

      -- % realizado: SUM(inc_realizado_Y) / SUM(total_inc) — misma base que pct_esperado
      ROUND(
        SUM(CASE WHEN mc.tipo_ponderado = 'Acumulativo' THEN
          CASE yr.year
            WHEN 2024 THEN mc.cap_fis_2024
            WHEN 2025 THEN GREATEST(mc.cap_fis_2025 - mc.cap_fis_2024, 0)
            WHEN 2026 THEN GREATEST(mc.cap_fis_2026 - mc.cap_fis_2025, 0)
            WHEN 2027 THEN GREATEST(mc.cap_fis_2027 - mc.cap_fis_2026, 0)
          END
        ELSE
          CASE yr.year
            WHEN 2024 THEN mc.cap_fis_2024
            WHEN 2025 THEN mc.cap_fis_2025
            WHEN 2026 THEN mc.cap_fis_2026
            WHEN 2027 THEN mc.cap_fis_2027
          END
        END)::numeric /
        NULLIF(SUM(mc.inc_pdm_2024 + mc.inc_pdm_2025 + mc.inc_pdm_2026 + mc.inc_pdm_2027)::numeric, 0)
        * 100, 1) AS pct_realizado,

      -- Eficiencia promedio del año capped
      ROUND(AVG(LEAST(CASE yr.year
        WHEN 2024 THEN mc.eficiencia_2024
        WHEN 2025 THEN mc.eficiencia_2025
        WHEN 2026 THEN mc.eficiencia_2026
        WHEN 2027 THEN mc.eficiencia_2027
      END, 1.0)) FILTER (WHERE CASE yr.year
        WHEN 2024 THEN mc.eficiencia_2024
        WHEN 2025 THEN mc.eficiencia_2025
        WHEN 2026 THEN mc.eficiencia_2026
        WHEN 2027 THEN mc.eficiencia_2027
      END IS NOT NULL) * 100, 1) AS eficiencia_promedio,

      -- Metas programadas ese año
      COUNT(*) FILTER (WHERE CASE yr.year
        WHEN 2024 THEN mc.meta_pdm_2024
        WHEN 2025 THEN mc.meta_pdm_2025
        WHEN 2026 THEN mc.meta_pdm_2026
        WHEN 2027 THEN mc.meta_pdm_2027
      END IS NOT NULL) AS programadas

    FROM metas_calc mc
    CROSS JOIN (VALUES (2024),(2025),(2026),(2027)) AS yr(year)
    GROUP BY yr.year
    ORDER BY yr.year
  `);

  return rows;
}

// ── Trayectoria cuatrienal ─────────────────────────────────────────────────

export async function getTrayectoriaCuatrienal() {
  // cumplimiento_cuatrienio está guardado en escala 0-100 (= avance_fisico * 100).
  // Los umbrales se comparan en escala 0-100 (80/50) y NO se multiplica por 100.
  const [globalRes, pilaresRes, secRes] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*)                                                                                                                     AS total_metas,
        ROUND(AVG(LEAST(cumplimiento_cuatrienio, 100)) FILTER (WHERE cumplimiento_cuatrienio IS NOT NULL), 1)                       AS pct_cuatrienio,
        COUNT(*) FILTER (WHERE cumplimiento_cuatrienio IS NOT NULL AND LEAST(cumplimiento_cuatrienio, 100) >= 80)                   AS en_meta,
        COUNT(*) FILTER (WHERE cumplimiento_cuatrienio IS NOT NULL AND LEAST(cumplimiento_cuatrienio, 100) >= 50
                           AND LEAST(cumplimiento_cuatrienio, 100) < 80)                                                           AS en_riesgo,
        COUNT(*) FILTER (WHERE cumplimiento_cuatrienio IS NOT NULL AND LEAST(cumplimiento_cuatrienio, 100) < 50)                   AS critico,
        COUNT(*) FILTER (WHERE cumplimiento_cuatrienio IS NULL)                                                                    AS sin_dato,
        ROUND(AVG(LEAST(eficiencia_2024, 1.0)) FILTER (WHERE eficiencia_2024 IS NOT NULL) * 100, 1)  AS eff_2024,
        ROUND(AVG(LEAST(eficiencia_2025, 1.0)) FILTER (WHERE eficiencia_2025 IS NOT NULL) * 100, 1)  AS eff_2025,
        ROUND(AVG(LEAST(eficiencia_2026, 1.0)) FILTER (WHERE eficiencia_2026 IS NOT NULL) * 100, 1)  AS eff_2026,
        ROUND(AVG(LEAST(eficiencia_2027, 1.0)) FILTER (WHERE eficiencia_2027 IS NOT NULL) * 100, 1)  AS eff_2027
      FROM pdm_metas
    `),
    pool.query(`
      SELECT
        num_pilar, nom_pilar,
        COUNT(*) AS total_metas,
        COUNT(*) FILTER (WHERE meta_cuatrienio IS NOT NULL) AS con_meta_cuatrienio,
        ROUND(AVG(LEAST(cumplimiento_cuatrienio, 100)) FILTER (WHERE cumplimiento_cuatrienio IS NOT NULL), 1) AS pct_cuatrienio,
        ROUND(AVG(LEAST(eficiencia_2024, 1.0)) FILTER (WHERE eficiencia_2024 IS NOT NULL) * 100, 1) AS eff_2024,
        ROUND(AVG(LEAST(eficiencia_2025, 1.0)) FILTER (WHERE eficiencia_2025 IS NOT NULL) * 100, 1) AS eff_2025,
        ROUND(AVG(LEAST(eficiencia_2026, 1.0)) FILTER (WHERE eficiencia_2026 IS NOT NULL) * 100, 1) AS eff_2026,
        ROUND(AVG(LEAST(eficiencia_2027, 1.0)) FILTER (WHERE eficiencia_2027 IS NOT NULL) * 100, 1) AS eff_2027,
        COUNT(*) FILTER (WHERE cumplimiento_cuatrienio IS NOT NULL AND LEAST(cumplimiento_cuatrienio, 100) < 50) AS en_riesgo,
        ROUND(SUM(
          COALESCE((presupuesto_2024->>'total_apropiacion')::numeric,0) +
          COALESCE((presupuesto_2025->>'total_apropiacion')::numeric,0) +
          COALESCE((presupuesto_2026->>'total_apropiacion')::numeric,0) +
          COALESCE((presupuesto_2027->>'total_apropiacion')::numeric,0)
        ) / 1000000, 0) AS total_apropiacion_m
      FROM pdm_metas
      WHERE num_pilar IS NOT NULL
      GROUP BY num_pilar, nom_pilar
      ORDER BY num_pilar
    `),
    pool.query(`
      SELECT
        secretaria,
        COUNT(*) AS total_metas,
        ROUND(AVG(LEAST(eficiencia_2024, 1.0)) FILTER (WHERE eficiencia_2024 IS NOT NULL) * 100, 1) AS eff_2024,
        ROUND(AVG(LEAST(eficiencia_2025, 1.0)) FILTER (WHERE eficiencia_2025 IS NOT NULL) * 100, 1) AS eff_2025,
        ROUND(AVG(LEAST(eficiencia_2026, 1.0)) FILTER (WHERE eficiencia_2026 IS NOT NULL) * 100, 1) AS eff_2026,
        ROUND(AVG(LEAST(eficiencia_2027, 1.0)) FILTER (WHERE eficiencia_2027 IS NOT NULL) * 100, 1) AS eff_2027,
        ROUND(AVG(LEAST(cumplimiento_cuatrienio, 100)) FILTER (WHERE cumplimiento_cuatrienio IS NOT NULL), 1) AS pct_cuatrienio,
        COUNT(*) FILTER (WHERE cumplimiento_cuatrienio IS NOT NULL AND LEAST(cumplimiento_cuatrienio, 100) < 50) AS en_riesgo
      FROM pdm_metas
      GROUP BY secretaria
      ORDER BY pct_cuatrienio DESC NULLS LAST
    `),
  ]);

  return {
    global: globalRes.rows[0],
    pilares: pilaresRes.rows,
    secretarias: secRes.rows,
  };
}

// ── Divergencia físico-financiero ──────────────────────────────────────────

export async function getDivergenciaFisFinan(year) {
  const y = assertYear(year);

  const { rows } = await pool.query(`
    SELECT
      id,
      meta_num,
      secretaria,
      LEFT(descripcion_meta, 90) AS descripcion_meta,
      meta_pdm_${y},
      meta_fisica_${y},
      ROUND(LEAST(eficiencia_${y}, 1.0) * 100, 1) AS eficiencia_pct,
      ROUND(COALESCE((presupuesto_${y}->>'total_apropiacion')::numeric, 0) / 1000000, 2) AS apropiacion_m,
      ROUND(COALESCE((presupuesto_${y}->>'neto_registros')::numeric, 0) / 1000000, 2) AS comprometido_m,
      ROUND(COALESCE((presupuesto_${y}->>'total_obligacion')::numeric, 0) / 1000000, 2) AS obligado_m,
      -- Ejecución comprometida = Total Registro / Total Apropiación
      ROUND(
        COALESCE((presupuesto_${y}->>'neto_registros')::numeric, 0) /
        NULLIF((presupuesto_${y}->>'total_apropiacion')::numeric, 0) * 100, 1
      ) AS ejec_comprometida_pct,
      -- Avance físico del año (capped)
      ROUND(
        LEAST(
          COALESCE(ponderado_avance_${y}, 0),
          COALESCE(meta_pdm_${y}::numeric / NULLIF(meta_cuatrienio::numeric, 0), 0)
        ) * 100, 1
      ) AS avance_fisico_anio_pct,
      -- Divergencia = comprometido% - avance físico%
      ROUND(
        (
          COALESCE((presupuesto_${y}->>'neto_registros')::numeric, 0) /
          NULLIF((presupuesto_${y}->>'total_apropiacion')::numeric, 0)
          - LEAST(
              COALESCE(ponderado_avance_${y}, 0),
              COALESCE(meta_pdm_${y}::numeric / NULLIF(meta_cuatrienio::numeric, 0), 0)
            )
        ) * 100, 1
      ) AS divergencia_pct
    FROM pdm_metas
    WHERE
      meta_pdm_${y} IS NOT NULL
      AND (presupuesto_${y}->>'total_apropiacion')::numeric > 0
      AND (
        (
          COALESCE((presupuesto_${y}->>'neto_registros')::numeric, 0) /
          NULLIF((presupuesto_${y}->>'total_apropiacion')::numeric, 0)
          - LEAST(
              COALESCE(ponderado_avance_${y}, 0),
              COALESCE(meta_pdm_${y}::numeric / NULLIF(meta_cuatrienio::numeric, 0), 0)
            )
        ) > 0.2
        OR (
          LEAST(
            COALESCE(ponderado_avance_${y}, 0),
            COALESCE(meta_pdm_${y}::numeric / NULLIF(meta_cuatrienio::numeric, 0), 0)
          ) < 0.05
          AND (presupuesto_${y}->>'neto_registros')::numeric > 0
        )
      )
    ORDER BY divergencia_pct DESC NULLS LAST
    LIMIT 30
  `);

  return rows;
}

// ── Comparativo financiero (todos los años) ────────────────────────────────

export async function getComparativoFinanciero() {
  // Retorna presupuesto agregado por año (4 filas: 2024–2027)
  // + desglose por secretaría para cada año
  const [porAnio, porSecretaria] = await Promise.all([
    pool.query(`
      SELECT
        yr.year,
        ROUND(SUM(CASE yr.year
          WHEN 2024 THEN COALESCE((m.presupuesto_2024->>'total_apropiacion')::numeric, 0)
          WHEN 2025 THEN COALESCE((m.presupuesto_2025->>'total_apropiacion')::numeric, 0)
          WHEN 2026 THEN COALESCE((m.presupuesto_2026->>'total_apropiacion')::numeric, 0)
          WHEN 2027 THEN COALESCE((m.presupuesto_2027->>'total_apropiacion')::numeric, 0)
        END) / 1000000, 0) AS apropiacion_m,

        ROUND(SUM(CASE yr.year
          WHEN 2024 THEN COALESCE((m.presupuesto_2024->>'neto_registros')::numeric, 0)
          WHEN 2025 THEN COALESCE((m.presupuesto_2025->>'neto_registros')::numeric, 0)
          WHEN 2026 THEN COALESCE((m.presupuesto_2026->>'neto_registros')::numeric, 0)
          WHEN 2027 THEN COALESCE((m.presupuesto_2027->>'neto_registros')::numeric, 0)
        END) / 1000000, 0) AS comprometido_m,

        ROUND(SUM(CASE yr.year
          WHEN 2024 THEN COALESCE((m.presupuesto_2024->>'total_obligacion')::numeric, 0)
          WHEN 2025 THEN COALESCE((m.presupuesto_2025->>'total_obligacion')::numeric, 0)
          WHEN 2026 THEN COALESCE((m.presupuesto_2026->>'total_obligacion')::numeric, 0)
          WHEN 2027 THEN COALESCE((m.presupuesto_2027->>'total_obligacion')::numeric, 0)
        END) / 1000000, 0) AS obligado_m,

        -- % ejecución comprometido (neto_registros / total_apropiacion)
        ROUND(
          SUM(CASE yr.year
            WHEN 2024 THEN COALESCE((m.presupuesto_2024->>'neto_registros')::numeric, 0)
            WHEN 2025 THEN COALESCE((m.presupuesto_2025->>'neto_registros')::numeric, 0)
            WHEN 2026 THEN COALESCE((m.presupuesto_2026->>'neto_registros')::numeric, 0)
            WHEN 2027 THEN COALESCE((m.presupuesto_2027->>'neto_registros')::numeric, 0)
          END) /
          NULLIF(SUM(CASE yr.year
            WHEN 2024 THEN COALESCE((m.presupuesto_2024->>'total_apropiacion')::numeric, 0)
            WHEN 2025 THEN COALESCE((m.presupuesto_2025->>'total_apropiacion')::numeric, 0)
            WHEN 2026 THEN COALESCE((m.presupuesto_2026->>'total_apropiacion')::numeric, 0)
            WHEN 2027 THEN COALESCE((m.presupuesto_2027->>'total_apropiacion')::numeric, 0)
          END), 0) * 100, 1
        ) AS pct_comprometido,

        -- % ejecución obligado
        ROUND(
          SUM(CASE yr.year
            WHEN 2024 THEN COALESCE((m.presupuesto_2024->>'total_obligacion')::numeric, 0)
            WHEN 2025 THEN COALESCE((m.presupuesto_2025->>'total_obligacion')::numeric, 0)
            WHEN 2026 THEN COALESCE((m.presupuesto_2026->>'total_obligacion')::numeric, 0)
            WHEN 2027 THEN COALESCE((m.presupuesto_2027->>'total_obligacion')::numeric, 0)
          END) /
          NULLIF(SUM(CASE yr.year
            WHEN 2024 THEN COALESCE((m.presupuesto_2024->>'total_apropiacion')::numeric, 0)
            WHEN 2025 THEN COALESCE((m.presupuesto_2025->>'total_apropiacion')::numeric, 0)
            WHEN 2026 THEN COALESCE((m.presupuesto_2026->>'total_apropiacion')::numeric, 0)
            WHEN 2027 THEN COALESCE((m.presupuesto_2027->>'total_apropiacion')::numeric, 0)
          END), 0) * 100, 1
        ) AS pct_obligado,

        -- Saldo por ejecutar
        ROUND((
          SUM(CASE yr.year
            WHEN 2024 THEN COALESCE((m.presupuesto_2024->>'total_apropiacion')::numeric, 0)
            WHEN 2025 THEN COALESCE((m.presupuesto_2025->>'total_apropiacion')::numeric, 0)
            WHEN 2026 THEN COALESCE((m.presupuesto_2026->>'total_apropiacion')::numeric, 0)
            WHEN 2027 THEN COALESCE((m.presupuesto_2027->>'total_apropiacion')::numeric, 0)
          END) -
          SUM(CASE yr.year
            WHEN 2024 THEN COALESCE((m.presupuesto_2024->>'neto_registros')::numeric, 0)
            WHEN 2025 THEN COALESCE((m.presupuesto_2025->>'neto_registros')::numeric, 0)
            WHEN 2026 THEN COALESCE((m.presupuesto_2026->>'neto_registros')::numeric, 0)
            WHEN 2027 THEN COALESCE((m.presupuesto_2027->>'neto_registros')::numeric, 0)
          END)
        ) / 1000000, 0) AS saldo_m,

        -- Metas con presupuesto ese año
        COUNT(*) FILTER (WHERE CASE yr.year
          WHEN 2024 THEN (m.presupuesto_2024->>'total_apropiacion')::numeric
          WHEN 2025 THEN (m.presupuesto_2025->>'total_apropiacion')::numeric
          WHEN 2026 THEN (m.presupuesto_2026->>'total_apropiacion')::numeric
          WHEN 2027 THEN (m.presupuesto_2027->>'total_apropiacion')::numeric
        END > 0) AS con_presupuesto,

        -- Avance físico del año: SUM(capped_Y) / SUM(meta_cuatrienio)
        ROUND(
          SUM(CASE yr.year
            WHEN 2024 THEN LEAST(COALESCE(m.meta_fisica_2024::numeric,0), CASE WHEN COALESCE(m.meta_pdm_2024::numeric,0)>0 THEN m.meta_pdm_2024::numeric ELSE COALESCE(m.meta_fisica_2024::numeric,0) END)
            WHEN 2025 THEN LEAST(COALESCE(m.meta_fisica_2025::numeric,0), CASE WHEN COALESCE(m.meta_pdm_2025::numeric,0)>0 THEN m.meta_pdm_2025::numeric ELSE COALESCE(m.meta_fisica_2025::numeric,0) END)
            WHEN 2026 THEN LEAST(COALESCE(m.meta_fisica_2026::numeric,0), CASE WHEN COALESCE(m.meta_pdm_2026::numeric,0)>0 THEN m.meta_pdm_2026::numeric ELSE COALESCE(m.meta_fisica_2026::numeric,0) END)
            WHEN 2027 THEN LEAST(COALESCE(m.meta_fisica_2027::numeric,0), CASE WHEN COALESCE(m.meta_pdm_2027::numeric,0)>0 THEN m.meta_pdm_2027::numeric ELSE COALESCE(m.meta_fisica_2027::numeric,0) END)
          END) /
          NULLIF(SUM(COALESCE(m.meta_cuatrienio::numeric, 0)), 0) * 100, 1
        ) AS avance_fisico_pct

      FROM pdm_metas m
      CROSS JOIN (VALUES (2024),(2025),(2026),(2027)) AS yr(year)
      GROUP BY yr.year
      ORDER BY yr.year
    `),
    pool.query(`
      SELECT
        yr.year,
        m.secretaria,
        ROUND(SUM(CASE yr.year
          WHEN 2024 THEN COALESCE((m.presupuesto_2024->>'total_apropiacion')::numeric, 0)
          WHEN 2025 THEN COALESCE((m.presupuesto_2025->>'total_apropiacion')::numeric, 0)
          WHEN 2026 THEN COALESCE((m.presupuesto_2026->>'total_apropiacion')::numeric, 0)
          WHEN 2027 THEN COALESCE((m.presupuesto_2027->>'total_apropiacion')::numeric, 0)
        END) / 1000000, 0) AS apropiacion_m,
        ROUND(SUM(CASE yr.year
          WHEN 2024 THEN COALESCE((m.presupuesto_2024->>'neto_registros')::numeric, 0)
          WHEN 2025 THEN COALESCE((m.presupuesto_2025->>'neto_registros')::numeric, 0)
          WHEN 2026 THEN COALESCE((m.presupuesto_2026->>'neto_registros')::numeric, 0)
          WHEN 2027 THEN COALESCE((m.presupuesto_2027->>'neto_registros')::numeric, 0)
        END) / 1000000, 0) AS comprometido_m,
        ROUND(SUM(CASE yr.year
          WHEN 2024 THEN COALESCE((m.presupuesto_2024->>'total_obligacion')::numeric, 0)
          WHEN 2025 THEN COALESCE((m.presupuesto_2025->>'total_obligacion')::numeric, 0)
          WHEN 2026 THEN COALESCE((m.presupuesto_2026->>'total_obligacion')::numeric, 0)
          WHEN 2027 THEN COALESCE((m.presupuesto_2027->>'total_obligacion')::numeric, 0)
        END) / 1000000, 0) AS obligado_m,
        ROUND(
          SUM(CASE yr.year
            WHEN 2024 THEN COALESCE((m.presupuesto_2024->>'neto_registros')::numeric, 0)
            WHEN 2025 THEN COALESCE((m.presupuesto_2025->>'neto_registros')::numeric, 0)
            WHEN 2026 THEN COALESCE((m.presupuesto_2026->>'neto_registros')::numeric, 0)
            WHEN 2027 THEN COALESCE((m.presupuesto_2027->>'neto_registros')::numeric, 0)
          END) /
          NULLIF(SUM(CASE yr.year
            WHEN 2024 THEN COALESCE((m.presupuesto_2024->>'total_apropiacion')::numeric, 0)
            WHEN 2025 THEN COALESCE((m.presupuesto_2025->>'total_apropiacion')::numeric, 0)
            WHEN 2026 THEN COALESCE((m.presupuesto_2026->>'total_apropiacion')::numeric, 0)
            WHEN 2027 THEN COALESCE((m.presupuesto_2027->>'total_apropiacion')::numeric, 0)
          END), 0) * 100, 1
        ) AS pct_comprometido
      FROM pdm_metas m
      CROSS JOIN (VALUES (2024),(2025),(2026),(2027)) AS yr(year)
      WHERE CASE yr.year
        WHEN 2024 THEN (m.presupuesto_2024->>'total_apropiacion')::numeric
        WHEN 2025 THEN (m.presupuesto_2025->>'total_apropiacion')::numeric
        WHEN 2026 THEN (m.presupuesto_2026->>'total_apropiacion')::numeric
        WHEN 2027 THEN (m.presupuesto_2027->>'total_apropiacion')::numeric
      END > 0
      GROUP BY yr.year, m.secretaria
      ORDER BY yr.year, apropiacion_m DESC NULLS LAST
    `),
  ]);

  return {
    porAnio: porAnio.rows,
    porSecretaria: porSecretaria.rows,
  };
}

// ── Export Excel ───────────────────────────────────────────────────────────

export async function exportYearExcel(year) {
  const y = assertYear(year);

  const [overviewRes, secRes, metasRes] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*) AS total_metas,
        COUNT(*) FILTER (WHERE meta_pdm_${y} IS NOT NULL) AS programadas,
        COUNT(*) FILTER (WHERE meta_pdm_${y} IS NULL) AS no_programadas,
        COUNT(*) FILTER (WHERE meta_pdm_${y} IS NOT NULL AND (meta_fisica_${y} IS NULL OR meta_fisica_${y} = 0)) AS sin_ejecucion,
        ROUND(AVG(eficiencia_${y}) FILTER (WHERE eficiencia_${y} IS NOT NULL) * 100, 1) AS eficiencia_promedio,
        ROUND(SUM(COALESCE((presupuesto_${y}->>'total_apropiacion')::numeric,0))/1000000, 0) AS apropiacion_m,
        ROUND(SUM(COALESCE((presupuesto_${y}->>'neto_registros')::numeric,0))/1000000, 0) AS comprometido_m,
        ROUND(SUM(COALESCE((presupuesto_${y}->>'total_obligacion')::numeric,0))/1000000, 0) AS obligado_m,
        COUNT(*) FILTER (WHERE eficiencia_${y} >= 0.8) AS semaforo_verde,
        COUNT(*) FILTER (WHERE eficiencia_${y} >= 0.5 AND eficiencia_${y} < 0.8) AS semaforo_amarillo,
        COUNT(*) FILTER (WHERE eficiencia_${y} < 0.5 AND eficiencia_${y} IS NOT NULL) AS semaforo_rojo
      FROM pdm_metas
    `),
    pool.query(`
      SELECT secretaria,
        COUNT(*) FILTER (WHERE meta_pdm_${y} IS NOT NULL) AS programadas,
        ROUND(AVG(eficiencia_${y}) FILTER (WHERE eficiencia_${y} IS NOT NULL)*100,1) AS eficiencia_pct,
        ROUND(SUM(COALESCE((presupuesto_${y}->>'total_apropiacion')::numeric,0))/1000000,0) AS apropiacion_m,
        ROUND(SUM(COALESCE((presupuesto_${y}->>'neto_registros')::numeric,0))/1000000,0) AS comprometido_m,
        ROUND(SUM(COALESCE((presupuesto_${y}->>'total_obligacion')::numeric,0))/1000000,0) AS obligado_m,
        COUNT(*) FILTER (WHERE eficiencia_${y} >= 0.8) AS verde,
        COUNT(*) FILTER (WHERE eficiencia_${y} >= 0.5 AND eficiencia_${y} < 0.8) AS amarillo,
        COUNT(*) FILTER (WHERE eficiencia_${y} < 0.5 AND eficiencia_${y} IS NOT NULL) AS rojo
      FROM pdm_metas
      GROUP BY secretaria ORDER BY apropiacion_m DESC NULLS LAST
    `),
    pool.query(`
      SELECT meta_num, secretaria, nom_pilar, descripcion_meta,
        meta_pdm_${y} AS meta_pdm,
        meta_fisica_${y} AS meta_fisica,
        ROUND(eficiencia_${y}*100,1) AS eficiencia_pct,
        ROUND(COALESCE((presupuesto_${y}->>'total_apropiacion')::numeric,0)/1000000,2) AS apropiacion_m,
        ROUND(COALESCE((presupuesto_${y}->>'neto_registros')::numeric,0)/1000000,2) AS comprometido_m,
        ROUND(COALESCE((presupuesto_${y}->>'total_obligacion')::numeric,0)/1000000,2) AS obligado_m,
        CASE
          WHEN eficiencia_${y} >= 0.8 THEN 'EN META'
          WHEN eficiencia_${y} >= 0.5 THEN 'ALERTA'
          WHEN eficiencia_${y} IS NOT NULL THEN 'CRITICA'
          ELSE 'SIN DATO'
        END AS semaforo,
        observaciones_${y} AS observaciones,
        compromisos_${y} AS compromisos
      FROM pdm_metas
      WHERE meta_pdm_${y} IS NOT NULL
      ORDER BY meta_num ASC NULLS LAST
    `),
  ]);

  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'GeoVisor Alcaldía';
  wb.created = new Date();

  // ── Hoja 1: Resumen ──
  const sh1 = wb.addWorksheet('Resumen');
  const ov = overviewRes.rows[0];
  sh1.addRow(['SEGUIMIENTO PDM — AÑO ' + y]);
  sh1.addRow([]);
  sh1.addRow(['Indicador', 'Valor']);
  sh1.addRow(['Total metas', ov.total_metas]);
  sh1.addRow(['Programadas', ov.programadas]);
  sh1.addRow(['No programadas', ov.no_programadas]);
  sh1.addRow(['Sin ejecución', ov.sin_ejecucion]);
  sh1.addRow(['Eficiencia promedio (%)', ov.eficiencia_promedio]);
  sh1.addRow(['Apropiación (M$)', ov.apropiacion_m]);
  sh1.addRow(['Comprometido (M$)', ov.comprometido_m]);
  sh1.addRow(['Obligado (M$)', ov.obligado_m]);
  sh1.addRow(['Semáforo verde', ov.semaforo_verde]);
  sh1.addRow(['Semáforo amarillo', ov.semaforo_amarillo]);
  sh1.addRow(['Semáforo rojo', ov.semaforo_rojo]);

  // ── Hoja 2: Por Secretaría ──
  const sh2 = wb.addWorksheet('Por Secretaría');
  sh2.addRow(['Secretaría','Programadas','Eficiencia (%)','Apropiación M$','Comprometido M$','Obligado M$','Verde','Amarillo','Rojo']);
  secRes.rows.forEach(r => sh2.addRow([r.secretaria, r.programadas, r.eficiencia_pct, r.apropiacion_m, r.comprometido_m, r.obligado_m, r.verde, r.amarillo, r.rojo]));

  // ── Hoja 3: Detalle Metas ──
  const sh3 = wb.addWorksheet('Metas');
  sh3.addRow(['N° Meta','Secretaría','Pilar','Descripción','Meta PDM','Meta Física','Eficiencia (%)','Apropiación M$','Comprometido M$','Obligado M$','Semáforo','Observaciones','Compromisos']);
  metasRes.rows.forEach(r => sh3.addRow([r.meta_num, r.secretaria, r.nom_pilar, r.descripcion_meta, r.meta_pdm, r.meta_fisica, r.eficiencia_pct, r.apropiacion_m, r.comprometido_m, r.obligado_m, r.semaforo, r.observaciones, r.compromisos]));

  const buffer = await wb.xlsx.writeBuffer();
  return buffer;
}
