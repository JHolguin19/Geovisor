import * as pdmAnualService from '../services/pdmAnual.service.js';
import { AppError } from '../middleware/errorHandler.js';

export async function getYearOverview(req, res) {
  const data = await pdmAnualService.getYearOverview(req.params.year);
  res.json(data);
}

export async function getYearSecretarias(req, res) {
  const rows = await pdmAnualService.getYearBySecretaria(req.params.year);
  res.json(rows);
}

export async function getYearPilares(req, res) {
  const rows = await pdmAnualService.getYearByPilar(req.params.year);
  res.json(rows);
}

export async function getYearMetas(req, res) {
  const { secretaria, pilar, semaforo, busqueda, page, limit } = req.query;
  const data = await pdmAnualService.getYearMetas(req.params.year, {
    secretaria, pilar, semaforo, busqueda, page, limit,
  });
  res.json(data);
}

export async function uploadPdmExcel(req, res) {
  if (!req.file) throw new AppError('No se proporcionó archivo Excel', 400);

  const year = req.body.year;
  if (!year) throw new AppError('Año requerido', 400);

  const result = await pdmAnualService.uploadPdmExcel(req.file.path, year);
  res.json(result);
}

export async function getTrayectoria(req, res) {
  const data = await pdmAnualService.getTrayectoriaCuatrienal();
  res.json(data);
}

export async function getComparativo(req, res) {
  const data = await pdmAnualService.getComparativoAnual();
  res.json(data);
}

export async function getDivergencia(req, res) {
  const rows = await pdmAnualService.getDivergenciaFisFinan(req.params.year);
  res.json(rows);
}

export async function getComparativoFinanciero(req, res) {
  const data = await pdmAnualService.getComparativoFinanciero();
  res.json(data);
}

export async function exportYear(req, res) {
  const y = req.params.year;
  const buffer = await pdmAnualService.exportYearExcel(y);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="PDM_${y}.xlsx"`);
  res.send(buffer);
}
