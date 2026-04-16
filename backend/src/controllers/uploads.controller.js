import { unlink } from 'fs/promises';
import * as uploadsService from '../services/uploads.service.js';
import { extractToRaw } from '../services/etl/extractor.js';
import { pool } from '../db/pool.js';

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

    // Extraer también a raw para que el pipeline ETL tenga los datos
    // y el upload sea visible en el dashboard de pipeline
    try {
      await extractToRaw({ file: req.file, uploadId: result.upload_id });
      // Marcar como 'production' ya que la tabla pública ya existe
      await pool.query(
        "UPDATE uploads SET etl_status = 'production', etl_mode = 'legacy' WHERE id = $1",
        [result.upload_id]
      );
    } catch (rawErr) {
      // Si falla la extracción a raw, no bloqueamos el upload
      // simplemente queda como 'legacy'
      console.error('[ETL] Extracción a raw falló (upload sigue funcional):', rawErr.message);
    }

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
