/**
 * pdmInforme.service.js — Generación de informe ejecutivo PDM con OpenAI + PDF
 */

import pool from '../db/pool.js';
import OpenAI from 'openai';
import PDFDocument from 'pdfkit';
import { AppError } from '../middleware/errorHandler.js';

// Instanciación lazy — lanza AppError (operacional) para que el mensaje llegue al cliente
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

// ── Recopilar datos para el informe ─────────────────────────────────────────

async function recopilarDatosAnuales(year) {
  const y = parseInt(year);

  const [overview, secretarias, pilares, comparativo] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*) AS total_metas,
        COUNT(*) FILTER (WHERE meta_pdm_${y} IS NOT NULL) AS programadas,
        COUNT(*) FILTER (WHERE meta_pdm_${y} IS NULL) AS no_programadas,
        COUNT(*) FILTER (WHERE meta_pdm_${y} IS NOT NULL AND (meta_fisica_${y} IS NULL OR meta_fisica_${y} = 0)) AS sin_ejecucion,
        ROUND(AVG(LEAST(eficiencia_${y}, 1.0)) FILTER (WHERE eficiencia_${y} IS NOT NULL) * 100, 1) AS eficiencia_promedio,
        ROUND(AVG(ponderado_avance_${y}) FILTER (WHERE ponderado_avance_${y} IS NOT NULL) * 100, 1) AS avg_ponderado_avance,
        ROUND(AVG(avance_fisico) FILTER (WHERE avance_fisico IS NOT NULL) * 100, 1) AS avance_fisico_cuatrienio,
        ROUND(SUM(COALESCE((presupuesto_${y}->>'total_apropiacion')::numeric, 0)), 0) AS total_apropiacion,
        ROUND(SUM(COALESCE((presupuesto_${y}->>'neto_registros')::numeric, 0)), 0) AS total_neto_registros,
        ROUND(SUM(COALESCE((presupuesto_${y}->>'total_obligacion')::numeric, 0)), 0) AS total_obligacion,
        COUNT(*) FILTER (WHERE eficiencia_${y} >= 0.8) AS semaforo_verde,
        COUNT(*) FILTER (WHERE eficiencia_${y} >= 0.5 AND eficiencia_${y} < 0.8) AS semaforo_amarillo,
        COUNT(*) FILTER (WHERE eficiencia_${y} IS NOT NULL AND eficiencia_${y} < 0.5) AS semaforo_rojo,
        COUNT(*) FILTER (WHERE eficiencia_${y} IS NULL AND meta_pdm_${y} IS NOT NULL) AS semaforo_sin_dato
      FROM pdm_metas
    `),
    pool.query(`
      SELECT
        secretaria,
        COUNT(*) AS total_metas,
        COUNT(*) FILTER (WHERE meta_pdm_${y} IS NOT NULL) AS programadas,
        COUNT(*) FILTER (WHERE meta_pdm_${y} IS NOT NULL AND (meta_fisica_${y} IS NULL OR meta_fisica_${y} = 0)) AS sin_ejecucion,
        ROUND(AVG(LEAST(eficiencia_${y}, 1.0)) FILTER (WHERE eficiencia_${y} IS NOT NULL) * 100, 1) AS eficiencia_promedio,
        ROUND(AVG(ponderado_avance_${y}) FILTER (WHERE ponderado_avance_${y} IS NOT NULL) * 100, 1) AS avg_ponderado,
        ROUND(SUM(COALESCE((presupuesto_${y}->>'total_apropiacion')::numeric, 0)) / 1000000, 0) AS apropiacion_m,
        ROUND(SUM(COALESCE((presupuesto_${y}->>'neto_registros')::numeric, 0)) / 1000000, 0) AS neto_registros_m,
        COUNT(*) FILTER (WHERE eficiencia_${y} >= 0.8) AS verde,
        COUNT(*) FILTER (WHERE eficiencia_${y} >= 0.5 AND eficiencia_${y} < 0.8) AS amarillo,
        COUNT(*) FILTER (WHERE eficiencia_${y} IS NOT NULL AND eficiencia_${y} < 0.5) AS rojo
      FROM pdm_metas
      GROUP BY secretaria
      ORDER BY eficiencia_promedio DESC NULLS LAST
    `),
    pool.query(`
      SELECT num_pilar, nom_pilar,
        COUNT(*) AS total_metas,
        ROUND(AVG(LEAST(eficiencia_${y}, 1.0)) FILTER (WHERE eficiencia_${y} IS NOT NULL) * 100, 1) AS eficiencia_promedio,
        ROUND(SUM(COALESCE((presupuesto_${y}->>'total_apropiacion')::numeric, 0)) / 1000000, 0) AS apropiacion_m
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
          END / NULLIF((COALESCE(m.meta_pdm_2024,0)+COALESCE(m.meta_pdm_2025,0)+COALESCE(m.meta_pdm_2026,0)+COALESCE(m.meta_pdm_2027,0))::numeric, 0)
        ) FILTER (WHERE CASE yr.year WHEN 2024 THEN m.meta_pdm_2024 WHEN 2025 THEN m.meta_pdm_2025 WHEN 2026 THEN m.meta_pdm_2026 WHEN 2027 THEN m.meta_pdm_2027 END IS NOT NULL) * 100, 1) AS pct_esperado,
        ROUND(AVG(CASE yr.year WHEN 2024 THEN m.ponderado_avance_2024 WHEN 2025 THEN m.ponderado_avance_2025 WHEN 2026 THEN m.ponderado_avance_2026 WHEN 2027 THEN m.ponderado_avance_2027 END) FILTER (WHERE CASE yr.year WHEN 2024 THEN m.ponderado_avance_2024 WHEN 2025 THEN m.ponderado_avance_2025 WHEN 2026 THEN m.ponderado_avance_2026 WHEN 2027 THEN m.ponderado_avance_2027 END IS NOT NULL) * 100, 1) AS pct_realizado
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

// ── Generar informe con OpenAI ──────────────────────────────────────────────

export async function generarInformeIA(year, comentarios = '') {
  const datos = await recopilarDatosAnuales(year);
  const ov = datos.overview;

  const fmtMoney = (n) => {
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
- Metas sin ejecución (programadas pero con avance 0): ${ov.sin_ejecucion}
- Eficiencia física promedio: ${ov.eficiencia_promedio}% (meta_fisica/meta_pdm, máx 100%)
- Ponderado avance ${year}: ${ov.avg_ponderado_avance}% (contribución al cuatrienio)
- Avance físico acumulado cuatrienio: ${ov.avance_fisico_cuatrienio}%
- Presupuesto total apropiación: ${fmtMoney(ov.total_apropiacion)}
- Total neto registros (comprometido): ${fmtMoney(ov.total_neto_registros)}
- Total obligado: ${fmtMoney(ov.total_obligacion)}
- Semáforo: ${ov.semaforo_verde} verdes (≥80%), ${ov.semaforo_amarillo} amarillas (50-79%), ${ov.semaforo_rojo} rojas (<50%), ${ov.semaforo_sin_dato} sin dato

COMPARATIVO POR AÑO:
${datos.comparativo.map(c => `  ${c.year}: Esperado ${c.pct_esperado}%, Realizado ${c.pct_realizado}%`).join('\n')}

POR SECRETARÍA (${datos.secretarias.length} dependencias):
${datos.secretarias.map(s => `  ${s.secretaria}: ${s.programadas} programadas, eficiencia ${s.eficiencia_promedio || 0}%, apropiación $${s.apropiacion_m}M, neto $${s.neto_registros_m}M, semáforo: ${s.verde}V/${s.amarillo}A/${s.rojo}R, sin ejecución: ${s.sin_ejecucion}`).join('\n')}

POR PILAR:
${datos.pilares.map(p => `  Pilar ${p.num_pilar} - ${p.nom_pilar}: ${p.total_metas} metas, eficiencia ${p.eficiencia_promedio || 0}%, apropiación $${p.apropiacion_m}M`).join('\n')}

${comentarios ? `COMENTARIOS ADICIONALES DEL USUARIO:\n${comentarios}\n` : ''}

ESTRUCTURA DEL INFORME:
1. RESUMEN EJECUTIVO (2-3 párrafos: estado general, logros destacados, alertas)
2. AVANCE FÍSICO Y EFICIENCIA (análisis del ponderado de avance, eficiencia por año, comparativo esperado vs realizado)
3. ANÁLISIS PRESUPUESTAL (apropiación, compromiso, obligación, % ejecución)
4. DESEMPEÑO POR SECRETARÍA (top 3 mejores, 3 más críticas, análisis de sin ejecución)
5. ANÁLISIS POR PILAR ESTRATÉGICO
6. ALERTAS Y RIESGOS (metas sin ejecución, baja eficiencia, divergencias físico-financieras)
7. RECOMENDACIONES (5-7 recomendaciones concretas y accionables)

INSTRUCCIONES:
- Redacta en español formal institucional, apto para enviar a secretarios de despacho
- Usa datos concretos y porcentajes del PDM
- No inventes datos, usa SOLO los proporcionados
- Sé directo y analítico, no complaciente
- Indica el corte de información (año ${year})
- El informe debe tener entre 1500-2500 palabras`;

  let completion;
  try {
    completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 4000,
    });
  } catch (err) {
    // Convierte errores del SDK de OpenAI en AppError para que lleguen al frontend
    const msg = err?.message || String(err);
    throw new AppError(`Error al contactar OpenAI: ${msg}`, 502);
  }

  const texto = completion.choices[0].message.content;
  return { texto, datos };
}

// ── Generar PDF ─────────────────────────────────────────────────────────────

export async function generarPDF(texto, year, comentarios = '') {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 60, bottom: 60, left: 55, right: 55 },
      info: {
        Title: `Informe Ejecutivo PDM ${year} - Santander de Quilichao`,
        Author: 'GeoVisor Alcaldía - QuiliData SIG',
      },
    });

    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(9).fillColor('#6b7280')
      .text('ALCALDÍA MUNICIPAL DE SANTANDER DE QUILICHAO', { align: 'center' })
      .text('EQUIPO QUILIDATA — SISTEMA DE INFORMACIÓN GEOGRÁFICA', { align: 'center' })
      .moveDown(0.5);

    doc.moveTo(55, doc.y).lineTo(557, doc.y).strokeColor('#d1d5db').stroke();
    doc.moveDown(0.8);

    // Title
    doc.fontSize(16).fillColor('#1a2332')
      .text(`INFORME EJECUTIVO`, { align: 'center' })
      .fontSize(12)
      .text(`Plan de Desarrollo Municipal ${year}`, { align: 'center' })
      .moveDown(0.3);

    doc.fontSize(9).fillColor('#6b7280')
      .text(`Generado: ${new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' })
      .moveDown(1.5);

    // Body — parse markdown-like headers
    const lines = texto.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        doc.moveDown(0.4);
        continue;
      }

      // ## Header
      if (trimmed.startsWith('## ') || trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length < 100) {
        const headerText = trimmed.replace(/^#{1,3}\s*/, '').replace(/^\*\*/, '').replace(/\*\*$/, '');
        if (doc.y > 650) doc.addPage();
        doc.moveDown(0.6);
        doc.fontSize(12).fillColor('#1e3a5f').text(headerText.toUpperCase());
        doc.moveTo(55, doc.y + 2).lineTo(300, doc.y + 2).strokeColor('#3b82f6').lineWidth(1).stroke();
        doc.moveDown(0.5);
        continue;
      }

      // # Title
      if (trimmed.startsWith('# ')) {
        const titleText = trimmed.replace(/^#\s*/, '');
        if (doc.y > 620) doc.addPage();
        doc.moveDown(0.8);
        doc.fontSize(14).fillColor('#1a2332').text(titleText.toUpperCase(), { align: 'center' });
        doc.moveDown(0.6);
        continue;
      }

      // Bold inline
      if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        const bulletText = trimmed.replace(/^[-•]\s*/, '');
        doc.fontSize(10).fillColor('#374151').text(`  •  ${bulletText}`, { indent: 10 });
        continue;
      }

      // Numbered list
      const numMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
      if (numMatch) {
        doc.fontSize(10).fillColor('#374151').text(`  ${numMatch[1]}.  ${numMatch[2]}`, { indent: 10 });
        continue;
      }

      // Regular paragraph
      const parsed = trimmed.replace(/\*\*(.*?)\*\*/g, '$1');
      doc.fontSize(10).fillColor('#374151').text(parsed, { align: 'justify', lineGap: 2 });
    }

    // Comentarios section
    if (comentarios) {
      doc.addPage();
      doc.fontSize(12).fillColor('#1e3a5f').text('COMENTARIOS ADICIONALES');
      doc.moveTo(55, doc.y + 2).lineTo(300, doc.y + 2).strokeColor('#3b82f6').lineWidth(1).stroke();
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#374151').text(comentarios, { align: 'justify', lineGap: 2 });
    }

    // Footer on each page
    const pageCount = doc.bufferedPageRange();
    doc.moveDown(2);
    doc.fontSize(8).fillColor('#9ca3af')
      .text('Este informe fue generado automáticamente por el sistema GeoVisor — QuiliData SIG.', { align: 'center' })
      .text('Los datos corresponden al seguimiento del Plan de Desarrollo Municipal 2024-2027.', { align: 'center' });

    doc.end();
  });
}
