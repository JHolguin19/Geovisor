import jwt from 'jsonwebtoken';

// Middleware para verificar token JWT
export function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'No se proporcionó token de autenticación' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    next();

  } catch (error) {
    console.error('Error de autenticación:', error.message);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }

    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Middleware para verificar rol
export function roleMiddleware(requiredRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!requiredRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tiene permisos para realizar esta acción' });
    }

    next();
  };
}

// Middleware para verificar secretaría
export function secretariaMiddleware(requiredSecretaria) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    // Admin y editor_geo pueden acceder a todas las secretarías
    if (req.user.role === 'admin' || req.user.role === 'editor_geo') {
      return next();
    }

    if (req.user.secretaria !== requiredSecretaria) {
      return res.status(403).json({ error: 'No tiene acceso a esta secretaría' });
    }

    next();
  };
}

export default authMiddleware;
