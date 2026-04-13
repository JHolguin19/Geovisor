import * as authService from '../services/auth.service.js';

export async function login(req, res) {
  const { username, password } = req.body;
  const data = await authService.login(username, password);
  res.json(data);
}

export async function me(req, res) {
  const data = await authService.getMe(req.user.id);
  res.json(data);
}

export async function logout(req, res) {
  await authService.logout(req.user.id);
  res.json({ message: 'Sesión cerrada exitosamente' });
}

export async function refresh(req, res) {
  const { refreshToken } = req.body;
  const data = await authService.refresh(refreshToken);
  res.json(data);
}
