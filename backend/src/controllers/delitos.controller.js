import * as delitosService from '../services/delitos.service.js';
import { AppError } from '../middleware/errorHandler.js';

function parseIntParam(value, name, defaultValue = null) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const n = parseInt(value, 10);
  if (isNaN(n)) throw new AppError(`Parámetro '${name}' inválido`, 400);
  return n;
}

export async function getStats(req, res) {
  const { anio, tipo_delito } = req.query;
  const data = await delitosService.getStats({ anio: parseIntParam(anio, 'anio'), tipo_delito });
  res.json(data);
}

export async function getBarriosDelitos(req, res) {
  const { anio, tipo_delito } = req.query;
  const geojson = await delitosService.getBarriosDelitos({ anio: parseIntParam(anio, 'anio'), tipo_delito });
  res.json(geojson);
}

export async function getTiposDelito(req, res) {
  const tipos = await delitosService.getTiposDelito();
  res.json(tipos);
}

export async function getDelitos(req, res) {
  const { anio, tipo_delito, barrio, zona, limit, offset } = req.query;
  const data = await delitosService.getDelitos({
    anio: parseIntParam(anio, 'anio'),
    tipo_delito,
    barrio,
    zona,
    limit: parseIntParam(limit, 'limit', 100),
    offset: parseIntParam(offset, 'offset', 0),
  });
  res.json(data);
}
