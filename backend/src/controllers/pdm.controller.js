import * as pdmService from '../services/pdm.service.js';
import { AppError } from '../middleware/errorHandler.js';

export async function getOverview(req, res, next) {
  const data = await pdmService.getOverview();
  res.json(data);
}

export async function getSecretarias(req, res, next) {
  const rows = await pdmService.getSecretarias();
  res.json(rows);
}

export async function getPilares(req, res, next) {
  const rows = await pdmService.getPilares();
  res.json(rows);
}

export async function getResumen(req, res, next) {
  const { secretaria, pilar } = req.query;
  const data = await pdmService.getResumen({ secretaria, pilar });
  res.json(data);
}

export async function getById(req, res, next) {
  const id = parseInt(req.params.id);
  if (isNaN(id)) throw new AppError('ID inválido', 400);

  const meta = await pdmService.getById(id);
  if (!meta) throw new AppError('Meta no encontrada', 404);

  res.json(meta);
}

export async function list(req, res, next) {
  const { secretaria, pilar, busqueda, page, limit, orden, dir } = req.query;
  const data = await pdmService.list({ secretaria, pilar, busqueda, page, limit, orden, dir });
  res.json(data);
}
