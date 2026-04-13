import * as sisbenService from '../services/sisben.service.js';

export async function getUbaStats(req, res, next) {
  const data = await sisbenService.getUbaStats(req.params.ubaId);
  res.json(data);
}

export async function getUbaGeoJson(req, res, next) {
  const data = await sisbenService.getUbaGeoJson(req.params.ubaId);
  res.json(data);
}
