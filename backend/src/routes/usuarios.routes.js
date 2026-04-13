import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/authMiddleware.js';
import { validate, schemas } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as ctrl from '../controllers/usuarios.controller.js';

const router = Router();

// Solo admins pueden gestionar usuarios
router.use(authMiddleware);
router.use(roleMiddleware(['admin']));

router.get('/',           asyncHandler(ctrl.list));
router.post('/',          validate(schemas.createUsuario), asyncHandler(ctrl.create));
router.put('/:id',        validate(schemas.updateUsuario), asyncHandler(ctrl.update));
router.patch('/:id/toggle', asyncHandler(ctrl.toggle));
router.delete('/:id',     asyncHandler(ctrl.remove));

export default router;
