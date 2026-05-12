import { getVeredas, getStats, getVeredaBreakdown } from '../services/zonaRural.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const listVeredas = asyncHandler(async (_req, res) => {
  const data = await getVeredas();
  res.json(data);
});

export const stats = asyncHandler(async (req, res) => {
  const vereda = req.query.vereda || null;
  const data = await getStats({ vereda });
  res.json(data);
});

export const breakdown = asyncHandler(async (_req, res) => {
  const data = await getVeredaBreakdown();
  res.json(data);
});
