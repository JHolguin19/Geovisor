import { createReadStream } from 'fs';
import { parse as csvParse } from 'csv-parse';
import ExcelJS from 'exceljs';

/**
 * Parsea un archivo CSV y retorna array de objetos (una fila = un objeto).
 */
export async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    createReadStream(filePath)
      .pipe(csvParse({ columns: true, skip_empty_lines: true, trim: true }))
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
