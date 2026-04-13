import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validate, schemas } from '../middleware/validate.js';
import * as geodataCtrl from '../controllers/geodata.controller.js';

const router = Router();

router.get('/:tableName', authMiddleware, validate(schemas.geodataQuery, 'query'), asyncHandler(geodataCtrl.getTableData));

export default router;
