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
