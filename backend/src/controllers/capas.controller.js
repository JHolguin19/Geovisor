import * as capasService from '../services/capas.service.js';
import { AppError } from '../middleware/errorHandler.js';

export async function list(req, res) {
  const { role, secretaria } = req.user;
  const capas = await capasService.list({ role, secretaria, secretariaId: req.query.secretariaId });
  res.json({ capas });
}

export async function listSecretarias(req, res) {
  const secretarias = await capasService.listSecretarias();
  res.json({ secretarias });
}

export async function create(req, res) {
  const { role, id: userId } = req.user;
  if (!['admin', 'editor_geo'].includes(role)) {
    throw new AppError('Sin permisos para crear capas', 403);
  }
  await capasService.create({ ...req.body, userId });
  res.status(201).json({ message: 'Capa creada', id: req.body.id });
}

export async function update(req, res) {
  const { role, secretaria } = req.user;
  await capasService.update({ id: req.params.id, role, secretaria, body: req.body });
  res.json({ message: 'Capa actualizada' });
}

export async function remove(req, res) {
  if (req.user.role !== 'admin') {
    throw new AppError('Solo administradores pueden eliminar capas', 403);
  }
  await capasService.remove(req.params.id);
  res.json({ message: 'Capa desactivada' });
}
