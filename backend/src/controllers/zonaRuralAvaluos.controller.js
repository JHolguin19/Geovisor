import { getStats, getBracketDistribution, getParetoData, getVeredaImpact, getGeoJSON } from '../services/zonaRuralAvaluos.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const stats = asyncHandler(async (_req, res) => {
  res.json(await getStats());
});

export const brackets = asyncHandler(async (_req, res) => {
  res.json(await getBracketDistribution());
});

export const pareto = asyncHandler(async (_req, res) => {
  res.json(await getParetoData());
});

export const veredaImpact = asyncHandler(async (_req, res) => {
  res.json(await getVeredaImpact());
});

export const geojson = asyncHandler(async (req, res) => {
  const mode = req.query.mode || 'incremento_pct';
  res.json(await getGeoJSON({ mode }));
});
