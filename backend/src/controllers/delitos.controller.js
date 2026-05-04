import * as delitosService from '../services/delitos.service.js';

export async function getStats(req, res) {
  const { anio, tipo_delito } = req.query;
  const data = await delitosService.getStats({ anio: anio ? parseInt(anio) : null, tipo_delito });
  res.json(data);
}

export async function getBarriosDelitos(req, res) {
  const { anio, tipo_delito } = req.query;
  const geojson = await delitosService.getBarriosDelitos({ anio: anio ? parseInt(anio) : null, tipo_delito });
  res.json(geojson);
}

export async function getTiposDelito(req, res) {
  const tipos = await delitosService.getTiposDelito();
  res.json(tipos);
}

export async function getDelitos(req, res) {
  const { anio, tipo_delito, barrio, zona, limit, offset } = req.query;
  const data = await delitosService.getDelitos({
    anio: anio ? parseInt(anio) : null,
    tipo_delito,
    barrio,
    zona,
    limit: limit ? parseInt(limit) : 100,
    offset: offset ? parseInt(offset) : 0,
  });
  res.json(data);
}
