import { getGrid, saveChanges, getRows } from '../services/pdmEditor.service.js';

export async function getGridHandler(req, res) {
  const rows = await getGrid();
  res.json({ rows, total: rows.length });
}

export async function saveChangesHandler(req, res) {
  const { changes } = req.body;
  if (!Array.isArray(changes) || changes.length === 0) {
    return res.status(400).json({ error: 'Se requiere un array de cambios' });
  }
  const result = await saveChanges(changes);
  // Devuelve las filas actualizadas para que el frontend refresque el grid
  const metaNums = [...new Set(changes.map(c => c.meta_num))];
  const updatedRows = await getRows(metaNums);
  res.json({ ...result, updatedRows });
}
