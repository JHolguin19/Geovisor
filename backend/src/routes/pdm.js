/**
 * routes/pdm.js  —  Plan de Desarrollo Municipal 2024-2027
 *
 * Conceptos financieros:
 *   Total Apropiación  = presupuesto asignado para ejecutar
 *   Neto Registros     = dinero comprometido (no desembolsado aún)
 *   Total Obligación   = dinero ya desembolsado
 *
 * Fórmula avance financiero:
 *   (neto_registros_2024 + neto_registros_2025) / total_apropiacion_4_años
 *
 * GET /api/pdm/overview      — Panel general completo
 * GET /api/pdm/secretarias   — KPIs por secretaría
 * GET /api/pdm/pilares        — KPIs por pilar
 * GET /api/pdm               — Lista de metas con filtros y paginación
 * GET /api/pdm/:id           — Detalle completo de una meta
 */

import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

// Fragmentos SQL reutilizables
const FINANCIERO_SQL = `
  ROUND(
    SUM(
      COALESCE((presupuesto_2024->>'neto_registros')::numeric, 0) +
      COALESCE((presupuesto_2025->>'neto_registros')::numeric, 0)
    ) / NULLIF(
      SUM(
        COALESCE((presupuesto_2024->>'total_apropiacion')::numeric, 0) +
        COALESCE((presupuesto_2025->>'total_apropiacion')::numeric, 0) +
        COALESCE((presupuesto_2026->>'total_apropiacion')::numeric, 0) +
        COALESCE((presupuesto_2027->>'total_apropiacion')::numeric, 0)
      ), 0
    ) * 100, 1
  )`;

// ── GET /api/pdm/overview ─────────────────────────────────────────────────────
router.get('/overview', async (req, res) => {
  try {
    const [globalRes, pilaresRes, alertasRes] = await Promise.all([

      // ── KPIs globales ──
      pool.query(`
        SELECT
          COUNT(*)                                         AS total_metas,
          ROUND(AVG(avance_fisico) * 100, 1)              AS avance_fisico_pct,

          -- Avance financiero correcto: registro_2años / apropiacion_4años
          ${FINANCIERO_SQL}                                AS avance_financiero_pct,

          -- Obligación (desembolsado) 2 años / apropiacion 4 años
          ROUND(
            SUM(
              COALESCE((presupuesto_2024->>'total_obligacion')::numeric, 0) +
              COALESCE((presupuesto_2025->>'total_obligacion')::numeric, 0)
            ) / NULLIF(
              SUM(
                COALESCE((presupuesto_2024->>'total_apropiacion')::numeric, 0) +
                COALESCE((presupuesto_2025->>'total_apropiacion')::numeric, 0) +
                COALESCE((presupuesto_2026->>'total_apropiacion')::numeric, 0) +
                COALESCE((presupuesto_2027->>'total_apropiacion')::numeric, 0)
              ), 0
            ) * 100, 1
          )                                               AS avance_obligacion_pct,

          -- Presupuesto en millones COP
          ROUND(SUM(
            COALESCE((presupuesto_2024->>'total_apropiacion')::numeric,0) +
            COALESCE((presupuesto_2025->>'total_apropiacion')::numeric,0) +
            COALESCE((presupuesto_2026->>'total_apropiacion')::numeric,0) +
            COALESCE((presupuesto_2027->>'total_apropiacion')::numeric,0)
          ) / 1000000000, 2)                              AS presupuesto_total_B,

          ROUND(SUM(
            COALESCE((presupuesto_2024->>'neto_registros')::numeric,0) +
            COALESCE((presupuesto_2025->>'neto_registros')::numeric,0)
          ) / 1000000000, 2)                              AS comprometido_B,

          ROUND(SUM(
            COALESCE((presupuesto_2024->>'total_obligacion')::numeric,0) +
            COALESCE((presupuesto_2025->>'total_obligacion')::numeric,0)
          ) / 1000000000, 2)                              AS desembolsado_B,

          -- Estado de metas físicas
          COUNT(*) FILTER (WHERE avance_fisico >= 0.8)    AS metas_en_meta,
          COUNT(*) FILTER (WHERE avance_fisico >= 0.5 AND avance_fisico < 0.8) AS metas_en_proceso,
          COUNT(*) FILTER (WHERE avance_fisico < 0.5)     AS metas_rezagadas,

          -- Metas que superaron su meta física 2025
          COUNT(*) FILTER (WHERE meta_fisica_2025 > meta_pdm_2025 AND meta_pdm_2025 IS NOT NULL) AS metas_superaron,

          -- Metas no programadas en 2025
          COUNT(*) FILTER (WHERE meta_pdm_2025 IS NULL)   AS metas_np_2025,

          -- Brecha: financiero supera físico en >10pts (más gasto que resultado)
          COUNT(*) FILTER (WHERE avance_financiero > avance_fisico + 0.1) AS brecha_financiero_mayor,

          -- Eficiencia promedio (avances que sí tienen dato)
          ROUND(AVG(eficiencia_2025) FILTER (WHERE eficiencia_2025 IS NOT NULL) * 100, 1) AS eficiencia_2025_pct,
          ROUND(AVG(eficiencia_2024) FILTER (WHERE eficiencia_2024 IS NOT NULL) * 100, 1) AS eficiencia_2024_pct,

          -- Cumplimiento cuatrienio promedio
          ROUND(AVG(cumplimiento_cuatrienio) * 100, 1)    AS cumplimiento_cuatrienio_pct
        FROM pdm_metas
      `),

      // ── KPIs por pilar ──
      pool.query(`
        SELECT
          num_pilar,
          nom_pilar,
          COUNT(*)                                         AS total_metas,
          ROUND(AVG(avance_fisico) * 100, 1)              AS avance_fisico_pct,
          ${FINANCIERO_SQL}                                AS avance_financiero_pct,
          COUNT(*) FILTER (WHERE avance_fisico >= 0.8)    AS en_meta,
          COUNT(*) FILTER (WHERE avance_fisico >= 0.5 AND avance_fisico < 0.8) AS en_proceso,
          COUNT(*) FILTER (WHERE avance_fisico < 0.5)     AS rezagadas,
          ROUND(SUM(
            COALESCE((presupuesto_2024->>'total_apropiacion')::numeric,0) +
            COALESCE((presupuesto_2025->>'total_apropiacion')::numeric,0) +
            COALESCE((presupuesto_2026->>'total_apropiacion')::numeric,0) +
            COALESCE((presupuesto_2027->>'total_apropiacion')::numeric,0)
          ) / 1000000000, 2)                              AS presupuesto_B
        FROM pdm_metas
        WHERE num_pilar IS NOT NULL
        GROUP BY num_pilar, nom_pilar
        ORDER BY num_pilar
      `),

      // ── Alertas: top 5 más rezagadas con presupuesto alto ──
      pool.query(`
        SELECT
          id, meta_num, secretaria, descripcion_meta,
          ROUND(avance_fisico * 100, 1)           AS avance_fisico_pct,
          ROUND(avance_financiero * 100, 1)        AS avance_financiero_pct,
          ROUND((
            COALESCE((presupuesto_2024->>'total_apropiacion')::numeric,0) +
            COALESCE((presupuesto_2025->>'total_apropiacion')::numeric,0) +
            COALESCE((presupuesto_2026->>'total_apropiacion')::numeric,0) +
            COALESCE((presupuesto_2027->>'total_apropiacion')::numeric,0)
          ) / 1000000, 0)                          AS presupuesto_M
        FROM pdm_metas
        WHERE avance_fisico < 0.3
          AND (presupuesto_2024->>'total_apropiacion') IS NOT NULL
        ORDER BY (
          COALESCE((presupuesto_2024->>'total_apropiacion')::numeric,0) +
          COALESCE((presupuesto_2025->>'total_apropiacion')::numeric,0) +
          COALESCE((presupuesto_2026->>'total_apropiacion')::numeric,0) +
          COALESCE((presupuesto_2027->>'total_apropiacion')::numeric,0)
        ) DESC
        LIMIT 6
      `),
    ]);

    res.json({
      global:   globalRes.rows[0],
      pilares:  pilaresRes.rows,
      alertas:  alertasRes.rows,
    });
  } catch (err) {
    console.error('[PDM] /overview:', err.message);
    res.status(500).json({ error: 'Error al obtener overview' });
  }
});

// ── GET /api/pdm/secretarias ─────────────────────────────────────────────────
router.get('/secretarias', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        secretaria,
        COUNT(*)                                         AS total_metas,
        ROUND(AVG(avance_fisico) * 100, 1)              AS avance_fisico_pct,
        ${FINANCIERO_SQL}                                AS avance_financiero_pct,
        ROUND(AVG(cumplimiento_cuatrienio) * 100, 1)    AS cumplimiento_pct,
        COUNT(*) FILTER (WHERE avance_fisico >= 0.8)    AS metas_en_meta,
        COUNT(*) FILTER (WHERE avance_fisico >= 0.5 AND avance_fisico < 0.8) AS metas_en_proceso,
        COUNT(*) FILTER (WHERE avance_fisico < 0.5)     AS metas_rezagadas,
        ROUND(SUM(
          COALESCE((presupuesto_2024->>'total_apropiacion')::numeric,0) +
          COALESCE((presupuesto_2025->>'total_apropiacion')::numeric,0) +
          COALESCE((presupuesto_2026->>'total_apropiacion')::numeric,0) +
          COALESCE((presupuesto_2027->>'total_apropiacion')::numeric,0)
        ) / 1000000, 0)                                 AS presupuesto_M,
        ROUND(SUM(
          COALESCE((presupuesto_2024->>'neto_registros')::numeric,0) +
          COALESCE((presupuesto_2025->>'neto_registros')::numeric,0)
        ) / 1000000, 0)                                 AS comprometido_M
      FROM pdm_metas
      GROUP BY secretaria
      ORDER BY presupuesto_M DESC NULLS LAST
    `);
    res.json(rows);
  } catch (err) {
    console.error('[PDM] /secretarias:', err.message);
    res.status(500).json({ error: 'Error al obtener secretarías' });
  }
});

// ── GET /api/pdm/pilares ─────────────────────────────────────────────────────
router.get('/pilares', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT num_pilar, nom_pilar
      FROM pdm_metas
      WHERE nom_pilar IS NOT NULL AND num_pilar IS NOT NULL
      ORDER BY num_pilar
    `);
    res.json(rows);
  } catch (err) {
    console.error('[PDM] /pilares:', err.message);
    res.status(500).json({ error: 'Error al obtener pilares' });
  }
});

// ── GET /api/pdm/resumen  (para panel de secretaría individual) ───────────────
router.get('/resumen', async (req, res) => {
  const { secretaria, pilar } = req.query;
  const params  = [];
  const filters = [];

  if (secretaria) { params.push(secretaria); filters.push(`secretaria = $${params.length}`); }
  if (pilar)      { params.push(parseInt(pilar)); filters.push(`num_pilar = $${params.length}`); }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)                                         AS total_metas,
        ROUND(AVG(avance_fisico) * 100, 1)              AS avance_fisico_pct,
        ${FINANCIERO_SQL}                                AS avance_financiero_pct,
        ROUND(AVG(cumplimiento_cuatrienio) * 100, 1)    AS cumplimiento_pct,
        ROUND(AVG(eficiencia_2025) FILTER (WHERE eficiencia_2025 IS NOT NULL) * 100, 1) AS eficiencia_2025_pct,
        COUNT(*) FILTER (WHERE avance_fisico >= 0.8)    AS metas_en_meta,
        COUNT(*) FILTER (WHERE avance_fisico >= 0.5 AND avance_fisico < 0.8) AS metas_en_proceso,
        COUNT(*) FILTER (WHERE avance_fisico < 0.5)     AS metas_rezagadas,
        COUNT(*) FILTER (WHERE meta_pdm_2025 IS NULL)   AS metas_np_2025,
        ROUND(SUM(
          COALESCE((presupuesto_2024->>'total_apropiacion')::numeric,0) +
          COALESCE((presupuesto_2025->>'total_apropiacion')::numeric,0) +
          COALESCE((presupuesto_2026->>'total_apropiacion')::numeric,0) +
          COALESCE((presupuesto_2027->>'total_apropiacion')::numeric,0)
        ) / 1000000, 0)                                 AS presupuesto_M,
        ROUND(SUM(
          COALESCE((presupuesto_2024->>'neto_registros')::numeric,0) +
          COALESCE((presupuesto_2025->>'neto_registros')::numeric,0)
        ) / 1000000, 0)                                 AS comprometido_M,
        ROUND(SUM(
          COALESCE((presupuesto_2024->>'total_obligacion')::numeric,0) +
          COALESCE((presupuesto_2025->>'total_obligacion')::numeric,0)
        ) / 1000000, 0)                                 AS desembolsado_M
      FROM pdm_metas ${where}
    `, params);
    res.json(rows[0]);
  } catch (err) {
    console.error('[PDM] /resumen:', err.message);
    res.status(500).json({ error: 'Error al obtener resumen' });
  }
});

// ── GET /api/pdm ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { secretaria, pilar, busqueda, page = 1, limit = 50, orden = 'meta_num', dir = 'ASC' } = req.query;

  const params  = [];
  const filters = [];

  if (secretaria) { params.push(secretaria); filters.push(`secretaria = $${params.length}`); }
  if (pilar)      { params.push(parseInt(pilar)); filters.push(`num_pilar = $${params.length}`); }
  if (busqueda)   {
    params.push(`%${busqueda}%`);
    filters.push(`(descripcion_meta ILIKE $${params.length} OR secretaria ILIKE $${params.length} OR nom_pilar ILIKE $${params.length} OR macrometa ILIKE $${params.length})`);
  }

  const where  = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const colsSeguras = ['meta_num','secretaria','descripcion_meta','nom_pilar','num_pilar',
    'macrometa','unidad_medida','tipo_ponderado','meta_cuatrienio',
    'meta_pdm_2024','meta_fisica_2024','meta_pdm_2025','meta_fisica_2025',
    'meta_pdm_2026','meta_pdm_2027','avance_fisico','avance_financiero',
    'cumplimiento_cuatrienio','eficiencia_2024','eficiencia_2025','ponderado_cuatrienio',
    'presupuesto_2024','presupuesto_2025'];

  const ordenSeguro = colsSeguras.includes(orden) ? orden : 'meta_num';
  const dirSegura   = dir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  try {
    const [dataRes, countRes] = await Promise.all([
      pool.query(`
        SELECT id, ${colsSeguras.join(', ')}
        FROM pdm_metas ${where}
        ORDER BY ${ordenSeguro} ${dirSegura} NULLS LAST
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, [...params, parseInt(limit), offset]),
      pool.query(`SELECT COUNT(*) FROM pdm_metas ${where}`, params),
    ]);

    res.json({ data: dataRes.rows, total: parseInt(countRes.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[PDM] /:', err.message);
    res.status(500).json({ error: 'Error al obtener metas' });
  }
});

// ── GET /api/pdm/:id ─────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  try {
    const { rows } = await pool.query('SELECT * FROM pdm_metas WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Meta no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[PDM] /:id:', err.message);
    res.status(500).json({ error: 'Error al obtener meta' });
  }
});

export default router;
