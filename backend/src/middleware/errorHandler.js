/**
 * Error operacional — errores esperados que el usuario puede resolver.
 * Ejemplo: new AppError('Tabla no encontrada', 404)
 */
export class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

/**
 * Middleware centralizado de errores.
 * Registrado como último middleware en server.js.
 */
import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Error interno del servidor';

  if (err.isOperational) {
    logger.warn({ method: req.method, path: req.path, statusCode }, err.message);
  } else {
    logger.error({ method: req.method, path: req.path, err }, 'Error no operacional');
  }

  res.status(statusCode).json({ error: message });
}

/**
 * Wrapper para async route handlers — elimina try/catch repetido.
 * Uso: router.get('/ruta', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
