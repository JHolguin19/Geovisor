import { createReadStream } from 'fs';
import { parse as csvParse } from 'csv-parse';
import ExcelJS from 'exceljs';

/**
 * Parsea un archivo CSV y retorna array de objetos (una fila = un objeto).
 * Detecta automáticamente el delimitador (; o ,).
 */
export async function parseCSV(filePath) {
  // Read first line to detect delimiter
  const firstChunk = await new Promise((resolve, reject) => {
    const chunks = [];
    const stream = createReadStream(filePath, { encoding: 'utf-8', end: 4096 });
    stream.on('data', c => { chunks.push(c); stream.destroy(); });
    stream.on('close', () => resolve(chunks.join('')));
    stream.on('error', reject);
  });
  const firstLine = firstChunk.split('\n')[0];
  const delimiter = firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';

  return new Promise((resolve, reject) => {
    const rows = [];
    createReadStream(filePath)
      .pipe(csvParse({ columns: true, skip_empty_lines: true, trim: true, delimiter, bom: true }))
      .on('data', row => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

/**
 * Parsea un archivo Excel (.xls/.xlsx) y retorna array de objetos.
 * Lee solo la primera hoja. La primera fila se usa como encabezados.
 */
export async function parseExcel(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];

  let headers = null;
  const rows = [];

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    // row.values es 1-indexed; índice 0 siempre es undefined
    const values = row.values.slice(1);

    if (rowNumber === 1) {
      headers = values.map(v => (v != null ? String(v).trim() : ''));
      return;
    }
    if (!headers) return;

    const obj = {};
    headers.forEach((header, i) => {
      if (header) obj[header] = values[i] ?? null;
    });
    rows.push(obj);
  });

  return rows;
}
