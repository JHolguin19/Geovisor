import { getStats, getBracketDistribution, getParetoData, getVeredaImpact, getGeoJSON, getPropertyGeoJSON } from '../services/zonaRuralAvaluos.service.js';
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

export const propertyGeojson = asyncHandler(async (req, res) => {
  const { vereda, colorBy } = req.query;
  res.json(await getPropertyGeoJSON({ vereda: vereda || null, colorBy: colorBy || 'impuesto' }));
});
