import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validate, schemas } from '../middleware/validate.js';
import * as authCtrl from '../controllers/auth.controller.js';

const router = Router();

// Brute-force protection: 5 intentos fallidos por IP cada 15 min
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de login. Intenta en 15 minutos.' },
});

router.post('/login', loginLimiter, validate(schemas.login), asyncHandler(authCtrl.login));
router.get('/me',       authMiddleware, asyncHandler(authCtrl.me));
router.post('/logout',  authMiddleware, asyncHandler(authCtrl.logout));
router.post('/refresh', asyncHandler(authCtrl.refresh));

export default router;
