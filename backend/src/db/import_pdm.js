/**
 * import_pdm.js
 * Lee el archivo "Plan de desarrollo.xlsx" e importa los datos a pdm_metas.
 *
 * Uso:
 *   node src/db/import_pdm.js              -- importa datos
 *   node src/db/import_pdm.js --headers    -- solo muestra los encabezados del Excel
 */

import XLSX from 'xlsx';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new pg.Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'qgis',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD,
});

// ── Helpers de parseo ──────────────────────────────────────────────────────────

/** Parsea pesos colombianos "$ 44.194.000,00" → número */
function parseCOP(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return val;
  const clean = String(val).replace(/[$\s]/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

/** Parsea valor que puede ser "NP" (No Programado) → null */
function parseNP(val) {
  if (val === 'NP' || val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return val;
  const n = parseFloat(String(val).replace(',', '.'));
  return isNaN(n) ? null : n;
}

/** Parseo numérico seguro */
function num(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const n = parseFloat(String(val).replace(',', '.'));
  return isNaN(n) ? null : n;
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function importPDM() {
  const showHeaders = process.argv.includes('--headers');

  // Ruta al Excel (tres niveles arriba de src/db/)
  const xlsxPath = path.resolve(__dirname, '../../../../Plan de desarrollo.xlsx');
  console.log(`\n📂 Leyendo: ${xlsxPath}`);

  const wb = XLSX.readFile(xlsxPath);
  const sheetName = wb.SheetNames.find(s => s === 'PDMDB') || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  console.log(`📄 Hoja: "${sheetName}" | Hojas disponibles: ${wb.SheetNames.join(', ')}`);

  // Leer como array de arrays (fila 0 = encabezados)
  const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  const headers = rawRows[0];

  if (showHeaders) {
    console.log(`\n── Encabezados (${headers.length} columnas) ──`);
    headers.forEach((h, i) => console.log(`  [${String(i).padStart(2,'0')}] ${h ?? '(vacío)'}`));
    await pool.end();
    return;
  }

  // ── Mapa de encabezado → índice (para columnas únicas) ──
  const hIdx = {};
  headers.forEach((h, i) => {
    if (h && !hIdx[String(h).trim()]) hIdx[String(h).trim()] = i;
  });

  // Busca el índice de la primera columna cuyo nombre contiene todas las palabras dadas
  const findIdx = (...words) => {
    for (const [h, i] of Object.entries(hIdx)) {
      const lower = h.toLowerCase();
      if (words.every(w => lower.includes(w.toLowerCase()))) return i;
    }
    return -1;
  };

  // Imprime columnas encontradas para verificación
  console.log('\n── Columnas clave encontradas ──');
  const checkCols = [
    'Metas', 'SECRETARIA', 'Descripcion Meta', 'No. Pilar', 'Nom. Del Pilar',
    'Meta Cuatrienio', 'TIPO DE PONDERADO',
    'META PDM 2024', 'Meta Fisica Realizada 2024',
    'META PDM 2025', 'Meta Fisica Realizada 2025',
    'META PDM 2026', 'Meta Fisica Realizada 2026',
    'META PDM 2027', 'Meta Fisica Realizada 2027',
    'Avance fisico', 'AVANCE FINANCIERO',
    '% de Cumplimiento Cuatrienio',
    'R__Pond. Avance cuatrienio',
    'Eficiencia 2024', 'Eficiencia 2025',
    'OBSERVACIONES 2024', 'COMPROMISOS 2024',
    'OBSERVACIONES 2025', 'COMPROMISOS 2025',
  ];
  checkCols.forEach(c => console.log(`  "${c}" → col [${hIdx[c] ?? 'NO ENCONTRADA'}]`));

  // ── Conectar y truncar tabla ──
  const client = await pool.connect();
  try {
    await client.query('TRUNCATE TABLE pdm_metas RESTART IDENTITY');
    console.log('\n🗑  Tabla pdm_metas vaciada.');

    const SQL = `
      INSERT INTO pdm_metas (
        meta_num, cod_dependencia, num_pilar, nom_pilar, macrometa,
        cod_sector, nom_sector, cod_programa, nombre_programa, cod_bpin,
        acciones_plan, unidad_medida, linea_base, anio_base, codigo_producto,
        indicador_meta, secretaria, descripcion_meta, meta_cuatrienio, tipo_ponderado,
        meta_pdm_2024, meta_fisica_2024, meta_pdm_2025, meta_fisica_2025,
        meta_pdm_2026, meta_fisica_2026, meta_pdm_2027, meta_fisica_2027,
        avance_fisico, avance_financiero, cumplimiento_cuatrienio, ponderado_cuatrienio,
        eficiencia_2024, eficiencia_2025,
        presupuesto_2024, presupuesto_2025, presupuesto_2026, presupuesto_2027,
        observaciones_2024, compromisos_2024, observaciones_2025, compromisos_2025
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,$25,$26,$27,$28,
        $29,$30,$31,$32,$33,$34,
        $35,$36,$37,$38,
        $39,$40,$41,$42
      )`;

    let inserted = 0;
    let skipped  = 0;
    let errors   = 0;

    for (let r = 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.every(v => v === null || v === '')) { skipped++; continue; }

      const secretaria = row[hIdx['SECRETARIA']];
      if (!secretaria) { skipped++; continue; }

      // ── Presupuesto por año — índices verificados con --headers ──
      // [29-38] 2024 | [39-48] 2025 | [49-58] 2026 | [59-68] 2027
      // [N+0] Adición  [N+1] Traslado  [N+2] Total Apropiación  [N+3] IMDER/RP
      // [N+4] Neto Reg  [N+5] Total Obligación  [N+6] Saldo RP
      // [N+7] % Ejec Obligado  [N+8] % Ejec Pagos  [N+9] Ppto Comprometer
      const buildPresupuesto = (base) => JSON.stringify({
        adicion_presupuestal:    parseCOP(row[base + 0]),
        traslado_reduccion:      parseCOP(row[base + 1]),
        total_apropiacion:       num(row[base + 2]),
        apropiacion_complemento: num(row[base + 3]),
        neto_registros:          num(row[base + 4]),
        total_obligacion:        parseCOP(row[base + 5]),
        saldo_rp:                parseCOP(row[base + 6]),
        pct_ejecucion_obligado:  num(row[base + 7]),
        pct_ejecucion_pagos:     num(row[base + 8]),
        presupuesto_comprometer: parseCOP(row[base + 9]),
      });

      const values = [
        num(row[hIdx['Metas']]),                              // $1
        num(row[hIdx['Cod. Dependencia']]),                   // $2
        num(row[hIdx['No. Pilar']]),                          // $3
        row[hIdx['Nom. Del Pilar']] ?? null,                  // $4
        row[hIdx['MacroMetas']] ?? null,                      // $5
        num(row[hIdx['Cod. Sector']]),                        // $6
        row[hIdx['Nom. Sector']] ?? null,                     // $7
        num(row[hIdx['Cod. Programa']]),                      // $8
        row[hIdx['Nombre del Programa']] ?? null,             // $9
        row[hIdx['Cod. BPIN']] ?? null,                       // $10
        row[hIdx['ACCIONES DEL PLAN']] ?? null,               // $11
        row[hIdx['UNIDAD DE MEDIDA']] ?? null,                // $12
        String(row[hIdx['LINEA BASE']] ?? '').trim() || null, // $13
        num(row[hIdx['AÑO']]),                                // $14
        num(row[hIdx['CODIGO PRODUCTO']]),                    // $15
        row[hIdx['Indicador de P. - Meta']] ?? null,          // $16
        String(secretaria).trim(),                            // $17
        row[hIdx['Descripcion Meta']] ?? null,                // $18
        num(row[hIdx['Meta Cuatrienio']]),                    // $19
        row[hIdx['TIPO DE PONDERADO']] ?? null,               // $20
        parseNP(row[hIdx['META PDM 2024']]),                  // $21
        parseNP(row[hIdx['Meta Fisica Realizada 2024']]),     // $22
        parseNP(row[hIdx['META PDM 2025']]),                  // $23
        parseNP(row[hIdx['Meta Fisica Realizada 2025']]),     // $24
        parseNP(row[hIdx['META PDM 2026']]),                  // $25
        parseNP(row[hIdx['Meta Fisica Realizada 2026']]),     // $26
        parseNP(row[hIdx['META PDM 2027']]),                  // $27
        parseNP(row[hIdx['Meta Fisica Realizada 2027']]),     // $28
        num(row[hIdx['Avance fisico']]),                      // $29
        num(row[hIdx['AVANCE FINANCIERO']]),                  // $30
        num(row[hIdx['% de Cumplimiento Cuatrienio']]),       // $31
        num(row[hIdx['R__Pond. Avance cuatrienio']]),         // $32
        parseNP(row[hIdx['Eficiencia 2024']]),                // $33
        parseNP(row[hIdx['Eficiencia 2025']]),                // $34
        buildPresupuesto(29),                                  // $35 — 2024
        buildPresupuesto(39),                                  // $36 — 2025
        buildPresupuesto(49),                                  // $37 — 2026
        buildPresupuesto(59),                                  // $38 — 2027
        row[hIdx['OBSERVACIONES 2024']] ?? null,              // $39
        row[hIdx['COMPROMISOS 2024']] ?? null,                // $40
        row[hIdx['OBSERVACIONES 2025']] ?? null,              // $41
        row[hIdx['COMPROMISOS 2025']] ?? null,                // $42
      ];

      try {
        await client.query(SQL, values);
        inserted++;
      } catch (err) {
        errors++;
        if (errors <= 5) console.error(`  ❌ Fila ${r} (meta ${values[0]}):`, err.message);
      }
    }

    console.log(`\n✅ Importación completada:`);
    console.log(`   Insertadas: ${inserted}`);
    console.log(`   Omitidas:   ${skipped}`);
    console.log(`   Errores:    ${errors}`);

    // Resumen por secretaría
    const { rows: resumen } = await client.query(`
      SELECT secretaria, COUNT(*) as metas,
             ROUND(AVG(avance_fisico)*100, 1) as avance_fisico_pct,
             ROUND(AVG(avance_financiero)*100, 1) as avance_financiero_pct
      FROM pdm_metas
      GROUP BY secretaria ORDER BY secretaria
    `);
    console.log(`\n── Resumen por secretaría ──`);
    resumen.forEach(r => {
      console.log(`  ${r.secretaria.padEnd(40)} ${r.metas} metas | Físico: ${r.avance_fisico_pct}% | Financiero: ${r.avance_financiero_pct}%`);
    });

  } finally {
    client.release();
    await pool.end();
  }
}

importPDM().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
