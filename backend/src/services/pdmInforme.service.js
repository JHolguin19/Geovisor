/**
 * pdmInforme.service.js — Informe ejecutivo PDM con OpenAI + PDF rico (PDFKit)
 */

import pool from '../db/pool.js';
import OpenAI from 'openai';
import PDFDocument from 'pdfkit';
import { AppError } from '../middleware/errorHandler.js';

// ── Lazy OpenAI ───────────────────────────────────────────────────────────────

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new AppError(
      'OPENAI_API_KEY no está configurada en las variables de entorno del servidor. ' +
      'Agrégala en el panel de Render → Environment.',
      503,
    );
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ── Recopilar datos de la BD ──────────────────────────────────────────────────

export async function recopilarDatosAnuales(year) {
  const y = parseInt(year);

  const [overview, secretarias, pilares, comparativo] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*)                                                                              AS total_metas,
        COUNT(*) FILTER (WHERE meta_pdm_${y} IS NOT NULL)                                    AS programadas,
        COUNT(*) FILTER (WHERE meta_pdm_${y} IS NULL)                                        AS no_programadas,
        COUNT(*) FILTER (WHERE meta_pdm_${y} IS NOT NULL
                           AND (meta_fisica_${y} IS NULL OR meta_fisica_${y} = 0))           AS sin_ejecucion,
        ROUND(AVG(eficiencia_${y}) FILTER (WHERE eficiencia_${y} IS NOT NULL) * 100, 1)  AS eficiencia_promedio,
        ROUND(AVG(ponderado_avance_${y})       FILTER (WHERE ponderado_avance_${y} IS NOT NULL) * 100, 1) AS avg_ponderado_avance,
        ROUND(AVG(avance_fisico)               FILTER (WHERE avance_fisico IS NOT NULL) * 100, 1)   AS avance_fisico_cuatrienio,
        ROUND(SUM(COALESCE((presupuesto_${y}->>'total_apropiacion')::numeric, 0)), 0)        AS total_apropiacion,
        ROUND(SUM(COALESCE((presupuesto_${y}->>'neto_registros')::numeric,    0)), 0)        AS total_neto_registros,
        ROUND(SUM(COALESCE((presupuesto_${y}->>'total_obligacion')::numeric,  0)), 0)        AS total_obligacion,
        COUNT(*) FILTER (WHERE eficiencia_${y} >= 0.8)                                      AS semaforo_verde,
        COUNT(*) FILTER (WHERE eficiencia_${y} >= 0.5 AND eficiencia_${y} < 0.8)            AS semaforo_amarillo,
        COUNT(*) FILTER (WHERE eficiencia_${y} IS NOT NULL AND eficiencia_${y} < 0.5)       AS semaforo_rojo,
        COUNT(*) FILTER (WHERE eficiencia_${y} IS NULL AND meta_pdm_${y} IS NOT NULL)       AS semaforo_sin_dato
      FROM pdm_metas
    `),
    pool.query(`
      SELECT
        secretaria,
        COUNT(*)                                                                              AS total_metas,
        COUNT(*) FILTER (WHERE meta_pdm_${y} IS NOT NULL)                                    AS programadas,
        COUNT(*) FILTER (WHERE meta_pdm_${y} IS NOT NULL
                           AND (meta_fisica_${y} IS NULL OR meta_fisica_${y} = 0))           AS sin_ejecucion,
        ROUND(AVG(eficiencia_${y}) FILTER (WHERE eficiencia_${y} IS NOT NULL) * 100, 1) AS eficiencia_promedio,
        ROUND(AVG(ponderado_avance_${y})       FILTER (WHERE ponderado_avance_${y} IS NOT NULL) * 100, 1) AS avg_ponderado,
        ROUND(SUM(COALESCE((presupuesto_${y}->>'total_apropiacion')::numeric, 0)) / 1000000, 0) AS apropiacion_m,
        ROUND(SUM(COALESCE((presupuesto_${y}->>'neto_registros')::numeric,    0)) / 1000000, 0) AS neto_registros_m,
        ROUND(
          SUM(COALESCE((presupuesto_${y}->>'neto_registros')::numeric, 0)) /
          NULLIF(SUM(COALESCE((presupuesto_${y}->>'total_apropiacion')::numeric, 0)), 0) * 100, 1
        ) AS pct_comprometido,
        COUNT(*) FILTER (WHERE eficiencia_${y} >= 0.8)                                      AS verde,
        COUNT(*) FILTER (WHERE eficiencia_${y} >= 0.5 AND eficiencia_${y} < 0.8)            AS amarillo,
        COUNT(*) FILTER (WHERE eficiencia_${y} IS NOT NULL AND eficiencia_${y} < 0.5)       AS rojo
      FROM pdm_metas
      GROUP BY secretaria
      ORDER BY eficiencia_promedio DESC NULLS LAST
    `),
    pool.query(`
      SELECT num_pilar, nom_pilar,
        COUNT(*)                                                                                    AS total_metas,
        ROUND(AVG(eficiencia_${y}) FILTER (WHERE eficiencia_${y} IS NOT NULL) * 100, 1) AS eficiencia_promedio,
        ROUND(SUM(COALESCE((presupuesto_${y}->>'total_apropiacion')::numeric, 0)) / 1000000, 0)    AS apropiacion_m
      FROM pdm_metas
      WHERE num_pilar IS NOT NULL
      GROUP BY num_pilar, nom_pilar
      ORDER BY num_pilar
    `),
    pool.query(`
      SELECT yr.year,
        ROUND(AVG(
          CASE yr.year
            WHEN 2024 THEN COALESCE(m.meta_pdm_2024,0)::numeric
            WHEN 2025 THEN COALESCE(m.meta_pdm_2025,0)::numeric
            WHEN 2026 THEN COALESCE(m.meta_pdm_2026,0)::numeric
            WHEN 2027 THEN COALESCE(m.meta_pdm_2027,0)::numeric
          END / NULLIF(
            (COALESCE(m.meta_pdm_2024,0)+COALESCE(m.meta_pdm_2025,0)+
             COALESCE(m.meta_pdm_2026,0)+COALESCE(m.meta_pdm_2027,0))::numeric, 0)
        ) FILTER (WHERE CASE yr.year
            WHEN 2024 THEN m.meta_pdm_2024 WHEN 2025 THEN m.meta_pdm_2025
            WHEN 2026 THEN m.meta_pdm_2026 WHEN 2027 THEN m.meta_pdm_2027
          END IS NOT NULL) * 100, 1) AS pct_esperado,
        ROUND(AVG(CASE yr.year
            WHEN 2024 THEN m.ponderado_avance_2024 WHEN 2025 THEN m.ponderado_avance_2025
            WHEN 2026 THEN m.ponderado_avance_2026 WHEN 2027 THEN m.ponderado_avance_2027
          END) FILTER (WHERE CASE yr.year
            WHEN 2024 THEN m.ponderado_avance_2024 WHEN 2025 THEN m.ponderado_avance_2025
            WHEN 2026 THEN m.ponderado_avance_2026 WHEN 2027 THEN m.ponderado_avance_2027
          END IS NOT NULL) * 100, 1) AS pct_realizado
      FROM pdm_metas m
      CROSS JOIN (VALUES (2024),(2025),(2026),(2027)) AS yr(year)
      GROUP BY yr.year ORDER BY yr.year
    `),
  ]);

  return {
    year: y,
    overview: overview.rows[0],
    secretarias: secretarias.rows,
    pilares: pilares.rows,
    comparativo: comparativo.rows,
  };
}

// ── Generar texto con OpenAI ──────────────────────────────────────────────────

export async function generarInformeIA(year, comentarios = '') {
  const datos = await recopilarDatosAnuales(year);
  const ov = datos.overview;

  const fmtM = (n) => {
    const v = parseFloat(n) || 0;
    if (v >= 1e9) return `$${(v / 1e9).toFixed(1)} mil millones`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(0)} millones`;
    return `$${v.toLocaleString('es-CO')}`;
  };

  const prompt = `Eres un analista experto en gestión pública municipal colombiana. Genera un INFORME EJECUTIVO profesional sobre el avance del Plan de Desarrollo Municipal (PDM) 2024-2027 de la Alcaldía Municipal de Santander de Quilichao (Cauca, Colombia) para el año ${year}.

DATOS DEL AÑO ${year}:
- Total metas del cuatrienio: ${ov.total_metas}
- Metas programadas para ${year}: ${ov.programadas}
- Metas no programadas: ${ov.no_programadas}
- Metas sin ejecución: ${ov.sin_ejecucion}
- Eficiencia física promedio: ${ov.eficiencia_promedio}%
- Ponderado avance ${year}: ${ov.avg_ponderado_avance}%
- Avance físico acumulado cuatrienio: ${ov.avance_fisico_cuatrienio}%
- Presupuesto apropiación: ${fmtM(ov.total_apropiacion)}
- Neto registros (comprometido): ${fmtM(ov.total_neto_registros)}
- Total obligado: ${fmtM(ov.total_obligacion)}
- Semáforo: ${ov.semaforo_verde} verdes (≥80%), ${ov.semaforo_amarillo} amarillas (50-79%), ${ov.semaforo_rojo} rojas (<50%), ${ov.semaforo_sin_dato} sin dato

COMPARATIVO POR AÑO:
${datos.comparativo.map(c => `  ${c.year}: Esperado ${c.pct_esperado}%, Realizado ${c.pct_realizado}%`).join('\n')}

POR SECRETARÍA:
${datos.secretarias.map(s => `  ${s.secretaria}: eficiencia ${s.eficiencia_promedio || 0}%, apropiación $${s.apropiacion_m}M, comprometido $${s.neto_registros_m}M (${s.pct_comprometido || 0}%), semáforo: ${s.verde}V/${s.amarillo}A/${s.rojo}R, sin ejecución: ${s.sin_ejecucion}`).join('\n')}

POR PILAR:
${datos.pilares.map(p => `  Pilar ${p.num_pilar} - ${p.nom_pilar}: ${p.total_metas} metas, eficiencia ${p.eficiencia_promedio || 0}%, apropiación $${p.apropiacion_m}M`).join('\n')}

${comentarios ? `COMENTARIOS ADICIONALES:\n${comentarios}\n` : ''}

ESTRUCTURA DEL INFORME:
1. RESUMEN EJECUTIVO (2-3 párrafos: estado general, logros, alertas)
2. AVANCE FÍSICO Y EFICIENCIA
3. ANÁLISIS PRESUPUESTAL
4. DESEMPEÑO POR SECRETARÍA (top 3 mejores, 3 más críticas)
5. ANÁLISIS POR PILAR ESTRATÉGICO
6. ALERTAS Y RIESGOS
7. RECOMENDACIONES (5-7 concretas)

INSTRUCCIONES: Redacta en español formal institucional. Usa solo los datos proporcionados. Sé directo y analítico. Entre 1500-2500 palabras.`;

  let completion;
  try {
    completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 4000,
    });
  } catch (err) {
    throw new AppError(`Error al contactar OpenAI: ${err?.message || err}`, 502);
  }

  const texto = completion.choices[0].message.content;
  return { texto, datos };
}

// ── Helpers de dibujo PDFKit ──────────────────────────────────────────────────

const C = {
  dark:    '#1a2332',
  blue:    '#2563eb',
  green:   '#16a34a',
  amber:   '#d97706',
  red:     '#dc2626',
  purple:  '#7c3aed',
  gray:    '#6b7280',
  light:   '#f1f5f9',
  border:  '#e2e8f0',
  white:   '#ffffff',
  muted:   '#94a3b8',
};

function colorPct(n) {
  if (n == null) return C.muted;
  if (n >= 80) return C.green;
  if (n >= 50) return C.amber;
  return C.red;
}

function fmtMoney(n) {
  const v = parseFloat(n) || 0;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)} MM`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)} M`;
  return `$${v.toLocaleString('es-CO')}`;
}

function drawRect(doc, x, y, w, h, color, radius = 0) {
  doc.save().roundedRect(x, y, w, h, radius).fill(color).restore();
}

function drawText(doc, text, x, y, opts = {}) {
  const { size = 10, color = C.dark, bold = false, align = 'left', width } = opts;
  doc.save()
    .font(bold ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(size)
    .fillColor(color);
  const textOpts = { align };
  if (width) textOpts.width = width;
  doc.text(text, x, y, textOpts);
  doc.restore();
}

function drawKpi(doc, x, y, w, h, label, value, color, sub = null) {
  drawRect(doc, x, y, w, h, C.white);
  // colored left border
  drawRect(doc, x, y, 4, h, color);
  // border
  doc.save().roundedRect(x, y, w, h, 4).stroke(C.border).restore();
  // value
  drawText(doc, String(value), x + 14, y + 10, { size: 20, color, bold: true });
  drawText(doc, label, x + 14, y + 34, { size: 8, color: C.gray, width: w - 20 });
  if (sub) drawText(doc, sub, x + 14, y + 46, { size: 7, color: C.muted, width: w - 20 });
}

function drawHBar(doc, x, y, w, label, pct, color) {
  const barW = w - 110;
  const fillW = Math.min(Math.max((pct / 100) * barW, 0), barW);
  drawText(doc, label, x, y + 2, { size: 8, color: C.dark, width: 100 });
  // track
  drawRect(doc, x + 105, y, barW, 10, C.light, 3);
  // fill
  if (fillW > 0) drawRect(doc, x + 105, y, fillW, 10, color, 3);
  drawText(doc, `${pct != null ? pct : '—'}%`, x + 105 + barW + 4, y + 1, { size: 8, color, bold: true });
}

function drawSemaforoBlock(doc, x, y, verde, amarillo, rojo, sinDato) {
  const total = (parseInt(verde) || 0) + (parseInt(amarillo) || 0) + (parseInt(rojo) || 0);
  const items = [
    { label: 'En meta',  n: verde,   color: C.green,  sub: '≥ 80%' },
    { label: 'Alerta',   n: amarillo, color: C.amber,  sub: '50-79%' },
    { label: 'Crítica',  n: rojo,     color: C.red,    sub: '< 50%' },
    { label: 'Sin dato', n: sinDato,  color: C.muted,  sub: '' },
  ];
  items.forEach((item, i) => {
    const bx = x + i * 120;
    const pct = total > 0 ? Math.round((parseInt(item.n) || 0) / total * 100) : 0;
    // circle
    doc.save().circle(bx + 18, y + 18, 18).fill(item.color).restore();
    drawText(doc, String(item.n || 0), bx + 18 - (item.n > 9 ? 8 : 5), y + 10, { size: 13, color: C.white, bold: true });
    drawText(doc, item.label, bx, y + 40, { size: 8, color: C.dark, bold: true, width: 80 });
    drawText(doc, item.sub, bx, y + 51, { size: 7, color: C.muted, width: 80 });
    if (total > 0) drawText(doc, `${pct}%`, bx + 40, y + 40, { size: 8, color: item.color, bold: true });
  });
}

function drawPresupuestoRow(doc, x, y, w, label, aprop, comp, pctC, pctO) {
  const labelW = 160;
  const colW   = (w - labelW) / 4;

  drawText(doc, label, x, y + 3, { size: 8, color: C.dark, width: labelW - 4 });

  // Apropiación
  drawText(doc, fmtMoney(aprop), x + labelW, y + 3, { size: 8, color: C.dark, width: colW - 4, align: 'right' });

  // Comprometido
  drawText(doc, fmtMoney(comp), x + labelW + colW, y + 3, { size: 8, color: colorPct(pctC), width: colW - 4, align: 'right' });

  // % Comprometido bar
  const barX = x + labelW + colW * 2;
  const barW2 = colW * 2 - 8;
  const fillW = Math.min(Math.max(((pctC || 0) / 100) * barW2, 0), barW2);
  drawRect(doc, barX, y + 4, barW2, 8, C.light, 2);
  if (fillW > 0) drawRect(doc, barX, y + 4, fillW, 8, colorPct(pctC), 2);
  drawText(doc, `${pctC != null ? pctC : '—'}%`, barX + barW2 + 2, y + 3, { size: 7, color: colorPct(pctC), bold: true });
}

// ── Generar PDF ───────────────────────────────────────────────────────────────

export async function generarPDF(texto, year, comentarios = '') {
  // Re-fetch data from DB (source of truth)
  const datos = await recopilarDatosAnuales(year);
  const ov = datos.overview;
  const y = parseInt(year);

  const apropiacion    = parseFloat(ov.total_apropiacion)    || 0;
  const comprometido   = parseFloat(ov.total_neto_registros) || 0;
  const obligado       = parseFloat(ov.total_obligacion)     || 0;
  const pctComp        = apropiacion > 0 ? Math.round(comprometido / apropiacion * 100 * 10) / 10 : 0;
  const pctOblig       = apropiacion > 0 ? Math.round(obligado / apropiacion * 100 * 10) / 10 : 0;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 45, bottom: 45, left: 50, right: 50 },
      bufferPages: true,
      info: {
        Title: `Informe Ejecutivo PDM ${y} — Santander de Quilichao`,
        Author: 'GeoVisor Alcaldía — QuiliData SIG',
      },
    });

    const chunks = [];
    doc.on('data',  c => chunks.push(c));
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const L = 50;   // left margin
    const PW = 512; // page content width

    // ══════════════════════════════════════════════════════
    // PÁGINA 1 — PORTADA
    // ══════════════════════════════════════════════════════

    // Header bar
    drawRect(doc, 0, 0, 612, 70, C.dark);
    drawText(doc, 'ALCALDÍA MUNICIPAL DE SANTANDER DE QUILICHAO', 0, 16, { size: 11, color: C.white, bold: true, align: 'center', width: 612 });
    drawText(doc, 'Cauca, Colombia — Equipo QuiliData · Sistema de Información Geográfica', 0, 32, { size: 8, color: C.muted, align: 'center', width: 612 });
    drawText(doc, `PDM 2024–2027`, 0, 46, { size: 9, color: C.blue, bold: true, align: 'center', width: 612 });

    // Main title area
    doc.moveDown(5);
    drawRect(doc, L, 110, PW, 3, C.blue);

    drawText(doc, 'INFORME EJECUTIVO', L, 130, { size: 28, color: C.dark, bold: true, align: 'center', width: PW });
    drawText(doc, 'Plan de Desarrollo Municipal', L, 166, { size: 16, color: C.gray, align: 'center', width: PW });

    // Year pill
    drawRect(doc, 230, 195, 152, 36, C.blue, 8);
    drawText(doc, `Año ${y}`, 230, 204, { size: 16, color: C.white, bold: true, align: 'center', width: 152 });

    // Quick stats row on cover
    const statsY = 260;
    drawRect(doc, L, statsY, PW, 90, C.light, 6);
    const cols = [
      { label: 'Total metas',         val: ov.total_metas },
      { label: 'Metas programadas',   val: ov.programadas },
      { label: 'Eficiencia promedio', val: `${ov.eficiencia_promedio || '—'}%` },
      { label: 'Avance físico PDM',   val: `${ov.avance_fisico_cuatrienio || '—'}%` },
    ];
    cols.forEach((c, i) => {
      const cx = L + 10 + i * 127;
      drawText(doc, String(c.val), cx, statsY + 14, { size: 20, color: C.blue, bold: true, width: 120, align: 'center' });
      drawText(doc, c.label,        cx, statsY + 42, { size: 8,  color: C.gray, width: 120, align: 'center' });
    });

    // Semáforo mini on cover
    const semY = 380;
    drawText(doc, 'SEMÁFORO DE EFICIENCIA', L, semY, { size: 9, color: C.gray, bold: true, width: PW });
    drawRect(doc, L, semY + 14, PW, 3, C.border);
    drawSemaforoBlock(doc, L + 10, semY + 22, ov.semaforo_verde, ov.semaforo_amarillo, ov.semaforo_rojo, ov.semaforo_sin_dato);

    // Date / footer
    const dateStr = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
    drawRect(doc, 0, 720, 612, 72, C.dark);
    drawText(doc, `Generado el ${dateStr}`, 0, 730, { size: 9, color: C.muted, align: 'center', width: 612 });
    drawText(doc, 'GeoVisor Alcaldía · Sistema QuiliData SIG · Santander de Quilichao', 0, 746, { size: 8, color: C.muted, align: 'center', width: 612 });
    drawRect(doc, 0, 762, 612, 6, C.blue);

    // ══════════════════════════════════════════════════════
    // PÁGINA 2 — DASHBOARD DE MÉTRICAS
    // ══════════════════════════════════════════════════════
    doc.addPage();

    // Section header
    drawRect(doc, 0, 0, 612, 36, C.dark);
    drawText(doc, `DASHBOARD DE MÉTRICAS — AÑO ${y}`, 0, 11, { size: 12, color: C.white, bold: true, align: 'center', width: 612 });

    // KPI cards row
    const kpiY = 55;
    const kpiW = 118;
    const kpiH = 70;
    const kpiGap = 8;
    [
      { label: 'Metas programadas',   val: ov.programadas,              color: C.blue   },
      { label: 'Sin ejecución',        val: ov.sin_ejecucion,            color: C.red    },
      { label: 'Eficiencia física',    val: `${ov.eficiencia_promedio || '—'}%`, color: colorPct(parseFloat(ov.eficiencia_promedio)) },
      { label: `Avance físico ${y}`,   val: `${ov.avg_ponderado_avance || '—'}%`, color: colorPct(parseFloat(ov.avg_ponderado_avance)) },
    ].forEach((k, i) => {
      drawKpi(doc, L + i * (kpiW + kpiGap), kpiY, kpiW, kpiH, k.label, k.val, k.color);
    });

    // Semáforo
    const s2Y = kpiY + kpiH + 20;
    drawText(doc, 'SEMÁFORO DE EFICIENCIA POR META', L, s2Y, { size: 9, color: C.gray, bold: true });
    drawRect(doc, L, s2Y + 12, PW, 2, C.border);
    drawSemaforoBlock(doc, L + 20, s2Y + 20, ov.semaforo_verde, ov.semaforo_amarillo, ov.semaforo_rojo, ov.semaforo_sin_dato);

    // Presupuesto bloques
    const pbY = s2Y + 100;
    drawText(doc, 'EJECUCIÓN PRESUPUESTAL', L, pbY, { size: 9, color: C.gray, bold: true });
    drawRect(doc, L, pbY + 12, PW, 2, C.border);

    const budItems = [
      { label: 'Total Apropiación',         val: fmtMoney(apropiacion),  color: C.dark,   pct: null      },
      { label: 'Neto Registros (Comprometido)', val: fmtMoney(comprometido), color: colorPct(pctComp), pct: pctComp  },
      { label: 'Total Obligado',            val: fmtMoney(obligado),     color: colorPct(pctOblig), pct: pctOblig },
    ];
    budItems.forEach((b, i) => {
      const bx = L + i * (PW / 3 + 4);
      const bw = PW / 3 - 4;
      drawRect(doc, bx, pbY + 18, bw, 60, C.light, 5);
      drawRect(doc, bx, pbY + 18, 4, 60, b.color, 0);
      drawText(doc, b.label, bx + 12, pbY + 24, { size: 7, color: C.gray, width: bw - 16 });
      drawText(doc, b.val,   bx + 12, pbY + 36, { size: 14, color: b.color, bold: true, width: bw - 16 });
      if (b.pct != null) {
        const barW = bw - 20;
        const fillW = Math.min((b.pct / 100) * barW, barW);
        drawRect(doc, bx + 12, pbY + 56, barW, 8, C.border, 3);
        if (fillW > 0) drawRect(doc, bx + 12, pbY + 56, fillW, 8, b.color, 3);
        drawText(doc, `${b.pct}%`, bx + 12 + barW + 3, pbY + 55, { size: 7, color: b.color, bold: true });
      }
    });

    // Comparativo esperado vs realizado
    const compY = pbY + 100;
    drawText(doc, `COMPARATIVO ESPERADO VS REALIZADO — TODOS LOS AÑOS`, L, compY, { size: 9, color: C.gray, bold: true });
    drawRect(doc, L, compY + 12, PW, 2, C.border);

    datos.comparativo.forEach((c, i) => {
      const rowY = compY + 20 + i * 38;
      const esp   = parseFloat(c.pct_esperado)  || 0;
      const real  = parseFloat(c.pct_realizado) || 0;
      const cumpl = esp > 0 ? Math.min(Math.round(real / esp * 100), 999) : 0;
      const isActive = c.year === y;

      if (isActive) drawRect(doc, L - 4, rowY - 2, PW + 8, 34, '#eff6ff', 4);

      drawText(doc, String(c.year), L, rowY + 8, { size: 10, color: isActive ? C.blue : C.gray, bold: isActive, width: 42 });

      drawHBar(doc, L + 46, rowY,      PW - 120, `Esperado`, esp,  C.muted);
      drawHBar(doc, L + 46, rowY + 16, PW - 120, `Realizado`, real, colorPct(cumpl));

      drawText(doc, `${cumpl}%`, L + PW - 55, rowY + 6, { size: 11, color: colorPct(cumpl), bold: true, width: 50, align: 'right' });
      drawText(doc, 'cumpl.', L + PW - 55, rowY + 19, { size: 7, color: C.muted, width: 50, align: 'right' });
    });

    // ══════════════════════════════════════════════════════
    // PÁGINA 3 — EFICIENCIA POR SECRETARÍA
    // ══════════════════════════════════════════════════════
    doc.addPage();

    drawRect(doc, 0, 0, 612, 36, C.dark);
    drawText(doc, `DESEMPEÑO POR SECRETARÍA — AÑO ${y}`, 0, 11, { size: 12, color: C.white, bold: true, align: 'center', width: 612 });

    // Table header
    const thY = 46;
    drawRect(doc, L, thY, PW, 14, C.blue, 3);
    drawText(doc, 'Secretaría',        L + 4,       thY + 3, { size: 7, color: C.white, bold: true, width: 155 });
    drawText(doc, 'Eficiencia',        L + 160,     thY + 3, { size: 7, color: C.white, bold: true, width: 90 });
    drawText(doc, 'Apropiación',       L + 255,     thY + 3, { size: 7, color: C.white, bold: true, width: 70, align: 'right' });
    drawText(doc, '% Comprometido',    L + 328,     thY + 3, { size: 7, color: C.white, bold: true, width: 90 });
    drawText(doc, '🟢🟡🔴',            L + 422,     thY + 3, { size: 7, color: C.white, bold: true, width: 80 });

    let rowY2 = thY + 18;
    datos.secretarias.forEach((s, i) => {
      if (rowY2 > 700) { doc.addPage(); rowY2 = 50; }
      const bg = i % 2 === 0 ? C.white : C.light;
      drawRect(doc, L, rowY2, PW, 20, bg);
      const eff = parseFloat(s.eficiencia_promedio) || 0;
      const pC  = parseFloat(s.pct_comprometido)    || 0;

      // Secretaría name (truncate)
      const secName = (s.secretaria || '').length > 28 ? s.secretaria.substring(0, 26) + '…' : s.secretaria;
      drawText(doc, secName, L + 4, rowY2 + 5, { size: 7, color: C.dark, width: 155 });

      // Eficiencia bar
      const effBarW = 85;
      const effFill = Math.min((eff / 100) * effBarW, effBarW);
      drawRect(doc, L + 160, rowY2 + 6, effBarW, 8, C.border, 2);
      if (effFill > 0) drawRect(doc, L + 160, rowY2 + 6, effFill, 8, colorPct(eff), 2);
      drawText(doc, `${eff}%`, L + 160 + effBarW + 2, rowY2 + 5, { size: 7, color: colorPct(eff), bold: true });

      // Apropiación
      drawText(doc, fmtMoney(parseFloat(s.apropiacion_m) * 1e6), L + 255, rowY2 + 5, { size: 7, color: C.dark, width: 70, align: 'right' });

      // % comprometido bar
      const cBarW = 82;
      const cFill = Math.min((pC / 100) * cBarW, cBarW);
      drawRect(doc, L + 328, rowY2 + 6, cBarW, 8, C.border, 2);
      if (cFill > 0) drawRect(doc, L + 328, rowY2 + 6, cFill, 8, colorPct(pC), 2);
      drawText(doc, `${pC}%`, L + 328 + cBarW + 2, rowY2 + 5, { size: 7, color: colorPct(pC), bold: true });

      // Semáforo chips
      const sv = parseInt(s.verde) || 0;
      const sa = parseInt(s.amarillo) || 0;
      const sr = parseInt(s.rojo) || 0;
      if (sv > 0) { drawRect(doc, L + 422,     rowY2 + 5, 22, 10, C.green,  3); drawText(doc, `${sv}`, L + 422 + 3, rowY2 + 6, { size: 7, color: C.white, bold: true }); }
      if (sa > 0) { drawRect(doc, L + 422 + 26, rowY2 + 5, 22, 10, C.amber,  3); drawText(doc, `${sa}`, L + 448 + 3, rowY2 + 6, { size: 7, color: C.white, bold: true }); }
      if (sr > 0) { drawRect(doc, L + 422 + 52, rowY2 + 5, 22, 10, C.red,    3); drawText(doc, `${sr}`, L + 474 + 3, rowY2 + 6, { size: 7, color: C.white, bold: true }); }

      rowY2 += 22;
    });

    // ══════════════════════════════════════════════════════
    // PÁGINA 4 — PILARES ESTRATÉGICOS
    // ══════════════════════════════════════════════════════
    doc.addPage();

    drawRect(doc, 0, 0, 612, 36, C.dark);
    drawText(doc, `PILARES ESTRATÉGICOS — AÑO ${y}`, 0, 11, { size: 12, color: C.white, bold: true, align: 'center', width: 612 });

    const pilW  = (PW - 8) / 2;
    const pilH  = 80;
    datos.pilares.forEach((p, i) => {
      const px = L + (i % 2) * (pilW + 8);
      const py = 50 + Math.floor(i / 2) * (pilH + 8);
      if (py > 680) return;

      const eff = parseFloat(p.eficiencia_promedio) || 0;
      drawRect(doc, px, py, pilW, pilH, C.light, 5);
      drawRect(doc, px, py, 4,     pilH, colorPct(eff), 0);

      drawText(doc, `Pilar ${p.num_pilar}`, px + 12, py + 8, { size: 8, color: C.blue, bold: true });
      const nomTxt = (p.nom_pilar || '').length > 45 ? p.nom_pilar.substring(0, 43) + '…' : p.nom_pilar;
      drawText(doc, nomTxt, px + 12, py + 20, { size: 7, color: C.dark, width: pilW - 18 });

      // Eficiencia bar
      const eBarW = pilW - 80;
      const eFill = Math.min((eff / 100) * eBarW, eBarW);
      drawText(doc, 'Eficiencia', px + 12, py + 46, { size: 7, color: C.gray });
      drawRect(doc, px + 12, py + 57, eBarW, 9, C.border, 3);
      if (eFill > 0) drawRect(doc, px + 12, py + 57, eFill, 9, colorPct(eff), 3);
      drawText(doc, `${eff}%`, px + 12 + eBarW + 3, py + 56, { size: 8, color: colorPct(eff), bold: true });

      drawText(doc, `${p.total_metas} metas · ${fmtMoney(parseFloat(p.apropiacion_m) * 1e6)}`, px + 12, py + 68, { size: 7, color: C.muted });
    });

    // ══════════════════════════════════════════════════════
    // PÁGINAS SIGUIENTES — TEXTO IA
    // ══════════════════════════════════════════════════════
    doc.addPage();

    drawRect(doc, 0, 0, 612, 36, C.dark);
    drawText(doc, `ANÁLISIS NARRATIVO — GPT-4o`, 0, 11, { size: 12, color: C.white, bold: true, align: 'center', width: 612 });

    let curY = 50;

    const lines = texto.split('\n');
    for (const line of lines) {
      if (curY > 720) {
        doc.addPage();
        curY = 45;
      }

      const trimmed = line.trim();
      if (!trimmed) { curY += 6; continue; }

      // ## o numerado tipo "1. TÍTULO"
      if (/^#{1,3}\s/.test(trimmed) || /^\d+\.\s+[A-ZÁÉÍÓÚÑ]/.test(trimmed)) {
        const headerText = trimmed.replace(/^#{1,3}\s*/, '').replace(/^\d+\.\s+/, '');
        if (curY > 680) { doc.addPage(); curY = 45; }
        curY += 8;
        drawRect(doc, L, curY, PW, 18, '#eff6ff', 3);
        drawRect(doc, L, curY, 4,   18, C.blue, 0);
        drawText(doc, headerText.toUpperCase(), L + 10, curY + 4, { size: 9, color: C.blue, bold: true, width: PW - 14 });
        curY += 24;
        continue;
      }

      // Bullet
      if (/^[-•*]\s/.test(trimmed)) {
        const bulletText = trimmed.replace(/^[-•*]\s*/, '').replace(/\*\*(.*?)\*\*/g, '$1');
        drawRect(doc, L + 10, curY + 4, 4, 4, C.blue, 2);
        doc.save().font('Helvetica').fontSize(9).fillColor(C.dark);
        doc.text(bulletText, L + 20, curY, { width: PW - 20, align: 'justify', lineGap: 1 });
        curY = doc.y + 3;
        doc.restore();
        continue;
      }

      // Párrafo normal
      const parsed = trimmed.replace(/\*\*(.*?)\*\*/g, '$1');
      doc.save().font('Helvetica').fontSize(9).fillColor('#374151');
      doc.text(parsed, L, curY, { width: PW, align: 'justify', lineGap: 1 });
      curY = doc.y + 4;
      doc.restore();
    }

    // Comentarios adicionales
    if (comentarios) {
      if (curY > 650) { doc.addPage(); curY = 45; }
      curY += 12;
      drawRect(doc, L, curY, PW, 18, C.light, 3);
      drawText(doc, 'COMENTARIOS ADICIONALES', L + 8, curY + 4, { size: 9, color: C.dark, bold: true });
      curY += 24;
      doc.save().font('Helvetica').fontSize(9).fillColor(C.gray);
      doc.text(comentarios, L, curY, { width: PW, align: 'justify', lineGap: 1 });
      curY = doc.y;
      doc.restore();
    }

    // ── Numeración de páginas ──────────────────────────────
    const range   = doc.bufferedPageRange();
    const totalPg = range.count;
    for (let i = 0; i < totalPg; i++) {
      doc.switchToPage(i);
      doc.save()
        .font('Helvetica').fontSize(7).fillColor(C.muted)
        .text(`Página ${i + 1} de ${totalPg}  ·  GeoVisor Alcaldía — QuiliData SIG  ·  Santander de Quilichao`,
              L, 770, { width: PW, align: 'center' });
      doc.restore();
    }

    doc.end();
  });
}
