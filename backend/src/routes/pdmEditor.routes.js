import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { getGridHandler, saveChangesHandler } from '../controllers/pdmEditor.controller.js';

const router = Router();

// Solo admin y editor_geo pueden acceder
function requireEditorRole(req, res, next) {
  if (!['admin', 'editor_geo'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
}

router.get('/grid', authMiddleware, requireEditorRole, asyncHandler(getGridHandler));
router.post('/save', authMiddleware, requireEditorRole, asyncHandler(saveChangesHandler));

export default router;
