/**
 * pdmAnual.service.js — Lógica de negocio para seguimiento PDM por año
 */

import pool from '../db/pool.js';
import { parseExcel } from '../utils/fileParser.js';

const VALID_YEARS = [2024, 2025, 2026, 2027];

function assertYear(year) {
  const y = parseInt(year);
  if (!VALID_YEARS.includes(y)) throw new Error('Año inválido');
  return y;
}

// ── Overview anual ────────────────────────────────────────────────────────────

export async function getYearOverview(year) {
  const y = assertYear(year);

  const { rows } = await pool.query(`
    SELECT
      COUNT(*)                                                             AS total_metas,
      COUNT(*) FILTER (WHERE meta_pdm_${y} IS NOT NULL)                    AS programadas,
      COUNT(*) FILTER (WHERE meta_pdm_${y} IS NULL)                        AS no_programadas,
      COUNT(*) FILTER (WHERE presupuesto_${y} IS NOT NULL
                         AND (presupuesto_${y}->>'total_apropiacion')::numeric > 0) AS con_presupuesto,
      COUNT(*) FILTER (WHERE meta_pdm_${y} IS NOT NULL
                         AND presupuesto_${y} IS NOT NULL
                         AND (presupuesto_${y}->>'total_apropiacion')::numeric > 0) AS activas_con_presupuesto,
      COUNT(*) FILTER (WHERE meta_pdm_${y} IS NOT NULL
                         AND (meta_fisica_${y} IS NULL OR meta_fisica_${y} = 0)) AS sin_ejecucion,
      ROUND(AVG(eficiencia_${y}) FILTER (WHERE eficiencia_${y} IS NOT NULL) * 100, 1) AS eficiencia_promedio,

      -- Presupuesto del año
      ROUND(SUM(COALESCE((presupuesto_${y}->>'total_apropiacion')::numeric, 0)) / 1000000, 0) AS apropiacion_m,
      ROUND(SUM(COALESCE((presupuesto_${y}->>'neto_registros')::numeric, 0)) / 1000000, 0)    AS comprometido_m,
      ROUND(SUM(COALESCE((presupuesto_${y}->>'total_obligacion')::numeric, 0)) / 1000000, 0)  AS obligado_m,

      -- Semáforo
      COUNT(*) FILTER (WHERE eficiencia_${y} IS NOT NULL AND eficiencia_${y} >= 0.8)                             AS semaforo_verde,
      COUNT(*) FILTER (WHERE eficiencia_${y} IS NOT NULL AND eficiencia_${y} >= 0.5 AND eficiencia_${y} < 0.8)  AS semaforo_amarillo,
      COUNT(*) FILTER (WHERE eficiencia_${y} IS NOT NULL AND eficiencia_${y} < 0.5)                              AS semaforo_rojo,
      COUNT(*) FILTER (WHERE eficiencia_${y} IS NULL AND meta_pdm_${y} IS NOT NULL)                              AS semaforo_sin_dato
    FROM pdm_metas
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
      ROUND(AVG(eficiencia_${y}) FILTER (WHERE eficiencia_${y} IS NOT NULL) * 100, 1) AS eficiencia_promedio,
      ROUND(SUM(COALESCE((presupuesto_${y}->>'total_apropiacion')::numeric, 0)) / 1000000, 0) AS apropiacion_m,
      ROUND(SUM(COALESCE((presupuesto_${y}->>'neto_registros')::numeric, 0)) / 1000000, 0)    AS comprometido_m,
      ROUND(SUM(COALESCE((presupuesto_${y}->>'total_obligacion')::numeric, 0)) / 1000000, 0)  AS obligado_m,
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
      ROUND(AVG(eficiencia_${y}) FILTER (WHERE eficiencia_${y} IS NOT NULL) * 100, 1) AS eficiencia_promedio,
      ROUND(SUM(COALESCE((presupuesto_${y}->>'total_apropiacion')::numeric, 0)) / 1000000, 0) AS apropiacion_m,
      ROUND(SUM(COALESCE((presupuesto_${y}->>'neto_registros')::numeric, 0)) / 1000000, 0)    AS comprometido_m,
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
  if (semaforo === 'verde')    filters.push(`eficiencia_${y} >= 0.8`);
  if (semaforo === 'amarillo') filters.push(`eficiencia_${y} >= 0.5 AND eficiencia_${y} < 0.8`);
  if (semaforo === 'rojo')     filters.push(`eficiencia_${y} < 0.5`);
  if (semaforo === 'sin_dato') filters.push(`eficiencia_${y} IS NULL AND meta_pdm_${y} IS NOT NULL`);

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const [dataRes, countRes] = await Promise.all([
    pool.query(`
      SELECT
        id, meta_num, secretaria, descripcion_meta, num_pilar, nom_pilar,
        meta_pdm_${y}      AS meta_pdm,
        meta_fisica_${y}   AS meta_fisica,
        eficiencia_${y}    AS eficiencia,
        presupuesto_${y}   AS presupuesto,
        observaciones_${y} AS observaciones,
        compromisos_${y}   AS compromisos
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

// ── Upload Excel ──────────────────────────────────────────────────────────────

export async function uploadPdmExcel(filePath, year) {
  const y = assertYear(year);
  const rows = await parseExcel(filePath);

  if (!rows.length) return { actualizados: 0, errores: [], sin_cambios: 0 };

  const client = await pool.connect();
  let actualizados = 0;
  let sin_cambios = 0;
  const errores = [];

  try {
    await client.query('BEGIN');

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const metaNum = row.meta_num ?? row.META_NUM ?? row['Meta Num'] ?? row['meta num'];

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
      const presupuestoKeys = ['total_apropiacion', 'neto_registros', 'total_obligacion', 'pct_ejecucion_obligado'];
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

    // Recalcular eficiencia del año
    await client.query(`
      UPDATE pdm_metas
      SET eficiencia_${y} = meta_fisica_${y}::numeric / NULLIF(meta_pdm_${y}::numeric, 0)
      WHERE meta_pdm_${y} IS NOT NULL AND meta_pdm_${y} != 0
    `);

    // Recalcular avance_fisico y cumplimiento_cuatrienio globales
    await client.query(`
      UPDATE pdm_metas
      SET avance_fisico = (
        COALESCE(meta_fisica_2024, 0) + COALESCE(meta_fisica_2025, 0) +
        COALESCE(meta_fisica_2026, 0) + COALESCE(meta_fisica_2027, 0)
      )::numeric / NULLIF(meta_cuatrienio::numeric, 0),
      cumplimiento_cuatrienio = (
        COALESCE(meta_fisica_2024, 0) + COALESCE(meta_fisica_2025, 0) +
        COALESCE(meta_fisica_2026, 0) + COALESCE(meta_fisica_2027, 0)
      )::numeric / NULLIF(meta_cuatrienio::numeric, 0)
      WHERE meta_cuatrienio IS NOT NULL AND meta_cuatrienio != 0
    `);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return { actualizados, sin_cambios, errores, total_filas: rows.length };
}

// ── Trayectoria cuatrienal ─────────────────────────────────────────────────

export async function getTrayectoriaCuatrienal() {
  // Resumen global
  const [globalRes, pilaresRes, secRes] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*)                                                                                        AS total_metas,
        ROUND(AVG(cumplimiento_cuatrienio) FILTER (WHERE cumplimiento_cuatrienio IS NOT NULL) * 100, 1) AS pct_cuatrienio,
        COUNT(*) FILTER (WHERE cumplimiento_cuatrienio IS NOT NULL AND cumplimiento_cuatrienio >= 0.8)  AS en_meta,
        COUNT(*) FILTER (WHERE cumplimiento_cuatrienio IS NOT NULL AND cumplimiento_cuatrienio >= 0.5
                           AND cumplimiento_cuatrienio < 0.8)                                          AS en_riesgo,
        COUNT(*) FILTER (WHERE cumplimiento_cuatrienio IS NOT NULL AND cumplimiento_cuatrienio < 0.5)  AS critico,
        COUNT(*) FILTER (WHERE cumplimiento_cuatrienio IS NULL)                                        AS sin_dato,
        ROUND(AVG(eficiencia_2024) FILTER (WHERE eficiencia_2024 IS NOT NULL) * 100, 1)                AS eff_2024,
        ROUND(AVG(eficiencia_2025) FILTER (WHERE eficiencia_2025 IS NOT NULL) * 100, 1)                AS eff_2025,
        ROUND(AVG(eficiencia_2026) FILTER (WHERE eficiencia_2026 IS NOT NULL) * 100, 1)                AS eff_2026,
        ROUND(AVG(eficiencia_2027) FILTER (WHERE eficiencia_2027 IS NOT NULL) * 100, 1)                AS eff_2027
      FROM pdm_metas
    `),
    pool.query(`
      SELECT
        num_pilar, nom_pilar,
        COUNT(*) AS total_metas,
        COUNT(*) FILTER (WHERE meta_cuatrienio IS NOT NULL) AS con_meta_cuatrienio,
        ROUND(AVG(cumplimiento_cuatrienio) FILTER (WHERE cumplimiento_cuatrienio IS NOT NULL) * 100, 1) AS pct_cuatrienio,
        ROUND(AVG(eficiencia_2024) FILTER (WHERE eficiencia_2024 IS NOT NULL) * 100, 1) AS eff_2024,
        ROUND(AVG(eficiencia_2025) FILTER (WHERE eficiencia_2025 IS NOT NULL) * 100, 1) AS eff_2025,
        ROUND(AVG(eficiencia_2026) FILTER (WHERE eficiencia_2026 IS NOT NULL) * 100, 1) AS eff_2026,
        ROUND(AVG(eficiencia_2027) FILTER (WHERE eficiencia_2027 IS NOT NULL) * 100, 1) AS eff_2027,
        COUNT(*) FILTER (WHERE cumplimiento_cuatrienio IS NOT NULL AND cumplimiento_cuatrienio < 0.5) AS en_riesgo,
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
        ROUND(AVG(eficiencia_2024) FILTER (WHERE eficiencia_2024 IS NOT NULL) * 100, 1) AS eff_2024,
        ROUND(AVG(eficiencia_2025) FILTER (WHERE eficiencia_2025 IS NOT NULL) * 100, 1) AS eff_2025,
        ROUND(AVG(eficiencia_2026) FILTER (WHERE eficiencia_2026 IS NOT NULL) * 100, 1) AS eff_2026,
        ROUND(AVG(eficiencia_2027) FILTER (WHERE eficiencia_2027 IS NOT NULL) * 100, 1) AS eff_2027,
        ROUND(AVG(cumplimiento_cuatrienio) FILTER (WHERE cumplimiento_cuatrienio IS NOT NULL) * 100, 1) AS pct_cuatrienio,
        COUNT(*) FILTER (WHERE cumplimiento_cuatrienio IS NOT NULL AND cumplimiento_cuatrienio < 0.5) AS en_riesgo
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
      meta_num,
      secretaria,
      LEFT(descripcion_meta, 90) AS descripcion_meta,
      meta_pdm_${y},
      meta_fisica_${y},
      ROUND(eficiencia_${y} * 100, 1) AS eficiencia_pct,
      ROUND(COALESCE((presupuesto_${y}->>'total_apropiacion')::numeric, 0) / 1000000, 2) AS apropiacion_m,
      ROUND(COALESCE((presupuesto_${y}->>'neto_registros')::numeric, 0) / 1000000, 2) AS comprometido_m,
      ROUND(COALESCE((presupuesto_${y}->>'total_obligacion')::numeric, 0) / 1000000, 2) AS obligado_m,
      ROUND(
        COALESCE((presupuesto_${y}->>'total_obligacion')::numeric, 0) /
        NULLIF((presupuesto_${y}->>'total_apropiacion')::numeric, 0) * 100, 1
      ) AS ejec_financiera_pct,
      ROUND(
        (
          COALESCE((presupuesto_${y}->>'total_obligacion')::numeric, 0) /
          NULLIF((presupuesto_${y}->>'total_apropiacion')::numeric, 0)
          - COALESCE(eficiencia_${y}, 0)
        ) * 100, 1
      ) AS divergencia_pct
    FROM pdm_metas
    WHERE
      meta_pdm_${y} IS NOT NULL
      AND (presupuesto_${y}->>'total_apropiacion')::numeric > 0
      AND (
        (
          COALESCE((presupuesto_${y}->>'total_obligacion')::numeric, 0) /
          NULLIF((presupuesto_${y}->>'total_apropiacion')::numeric, 0)
          - COALESCE(eficiencia_${y}, 0)
        ) > 0.25
        OR (
          COALESCE(eficiencia_${y}, 0) < 0.05
          AND (presupuesto_${y}->>'neto_registros')::numeric > 0
        )
      )
    ORDER BY divergencia_pct DESC NULLS LAST
    LIMIT 25
  `);

  return rows;
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
