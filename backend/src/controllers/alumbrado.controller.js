import * as alumbradoService from '../services/alumbrado.service.js';

export async function getStats(req, res) {
  const data = await alumbradoService.getStats();
  res.json(data);
}
