import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validate, schemas } from '../middleware/validate.js';
import * as capasCtrl from '../controllers/capas.controller.js';

const router = Router();

router.get('/secretarias', authMiddleware, asyncHandler(capasCtrl.listSecretarias));
router.get('/',            authMiddleware, asyncHandler(capasCtrl.list));
router.post('/',           authMiddleware, validate(schemas.createCapa), asyncHandler(capasCtrl.create));
router.put('/:id',         authMiddleware, validate(schemas.updateCapa), asyncHandler(capasCtrl.update));
router.delete('/:id',      authMiddleware, asyncHandler(capasCtrl.remove));

export default router;
