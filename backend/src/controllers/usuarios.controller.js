import * as service from '../services/usuarios.service.js';

export async function list(req, res) {
  const data = await service.getAll();
  res.json(data);
}

export async function create(req, res) {
  const data = await service.create(req.body);
  res.status(201).json(data);
}

export async function update(req, res) {
  const data = await service.update(req.params.id, req.body);
  res.json(data);
}

export async function toggle(req, res) {
  const data = await service.toggleActivo(req.params.id, req.user.id);
  res.json(data);
}

export async function remove(req, res) {
  const data = await service.remove(req.params.id, req.user.id);
  res.json(data);
}
