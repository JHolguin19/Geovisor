import { unlink } from 'fs/promises';
import * as uploadsService from '../services/uploads.service.js';

export async function upload(req, res, next) {
  const filePath = req.file?.path;
  try {
    const {
      secretaria_id, nombre_tabla,
      lat_col, lon_col,
      geo_mode, join_layer, join_field_excel, join_field_layer, join_geom_type,
    } = req.body;
    const result = await uploadsService.processUpload({
      file: req.file, user: req.user,
      secretaria_id, nombre_tabla,
      lat_col, lon_col,
      geo_mode, join_layer, join_field_excel, join_field_layer, join_geom_type,
    });
    res.json(result);
  } catch (err) {
    next(err);
  } finally {
    if (filePath) await unlink(filePath).catch(() => {});
  }
}

export async function analyze(req, res, next) {
  const filePath = req.file?.path;
  try {
    const result = await uploadsService.analyzeFile({ file: req.file });
    res.json(result);
  } catch (err) {
    next(err);
  } finally {
    if (filePath) await unlink(filePath).catch(() => {});
  }
}

export async function baseLayers(_req, res, next) {
  try {
    const layers = await uploadsService.getBaseLayers();
    res.json({ layers });
  } catch (err) {
    next(err);
  }
}

export async function baseLayerFields(req, res, next) {
  try {
    const fields = await uploadsService.getBaseLayerFields(req.params.tableName);
    res.json({ fields });
  } catch (err) {
    next(err);
  }
}

export async function deleteUpload(req, res, next) {
  try {
    const result = await uploadsService.deleteUpload({
      uploadId: parseInt(req.params.id, 10),
      user: req.user,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function list(req, res, next) {
  try {
    const { role, secretaria } = req.user;
    const uploads = await uploadsService.getUploadHistory({
      role, secretaria,
      secretariaId: req.query.secretariaId || req.query.secretaria_id,
    });
    res.json({ uploads });
  } catch (err) {
    next(err);
  }
}
