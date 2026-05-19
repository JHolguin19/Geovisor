import {
  getBarrios, getStats, getBracketDistribution,
  getParetoData, getBarrioImpact,
  getBarrioGeoJSON, getPropertyGeoJSON,
  refreshMaterializedView,
} from '../services/zonaUrbanaAvaluos.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const barrios = asyncHandler(async (_req, res) => {
  res.json(await getBarrios());
});

export const stats = asyncHandler(async (req, res) => {
  const barrio = req.query.barrio || null;
  res.json(await getStats({ barrio }));
});

export const brackets = asyncHandler(async (req, res) => {
  const barrio = req.query.barrio || null;
  res.json(await getBracketDistribution({ barrio }));
});

export const pareto = asyncHandler(async (req, res) => {
  const barrio = req.query.barrio || null;
  res.json(await getParetoData({ barrio }));
});

export const barrioImpact = asyncHandler(async (_req, res) => {
  res.json(await getBarrioImpact());
});

export const barrioGeojson = asyncHandler(async (_req, res) => {
  res.json(await getBarrioGeoJSON());
});

export const propertyGeojson = asyncHandler(async (req, res) => {
  const barrio = req.query.barrio || null;
  res.json(await getPropertyGeoJSON({ barrio }));
});

export const refresh = asyncHandler(async (req, res) => {
  if (req.user?.rol !== 'admin') {
    return res.status(403).json({ error: 'Solo admin puede refrescar la vista materializada' });
  }
  res.json(await refreshMaterializedView());
});
