import * as geodataService from '../services/geodata.service.js';

export async function getTableData(req, res) {
  const { tableName } = req.params;
  const { bbox, q, searchFields, simplify, cols, limit } = req.query;
  const geojson = await geodataService.getGeoJsonForTable(tableName, { bbox, q, searchFields, simplify, cols, limit });
  res.json(geojson);
}

export async function exportTable(req, res) {
  const { tableName } = req.params;
  const { workbook, rowCount } = await geodataService.exportTableAsExcel(tableName);
  const safeFilename = tableName.replace(/[^a-zA-Z0-9_\-]/g, '_');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.xlsx"`);
  res.setHeader('X-Row-Count', rowCount);
  await workbook.xlsx.write(res);
  res.end();
}
