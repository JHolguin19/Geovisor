import * as geodataService from '../services/geodata.service.js';

export async function getTableData(req, res) {
  const { tableName } = req.params;
  const { bbox, q, searchFields, simplify, cols, limit } = req.query;
  const geojson = await geodataService.getGeoJsonForTable(tableName, { bbox, q, searchFields, simplify, cols, limit });
  res.json(geojson);
}
