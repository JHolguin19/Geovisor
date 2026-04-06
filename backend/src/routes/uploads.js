import express from 'express';
import multer from 'multer';
import { createReadStream } from 'fs';
import { unlink } from 'fs/promises';
import { parse as csvParse } from 'csv-parse';
import * as XLSX from 'xlsx';
import { pool } from '../db/pool.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Multer: guardar archivos en memoria (máx 50MB)
const upload = multer({
  dest: '/tmp/geovisor_uploads/',
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['text/csv', 'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json', 'application/geo+json'];
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (['csv', 'xls', 'xlsx', 'json', 'geojson'].includes(ext)) return cb(null, true);
    cb(new Error('Tipo de archivo no soportado. Use CSV, Excel o GeoJSON.'));
  }
});

// Limpiar nombre para usar como tabla PostgreSQL
function sanitizeTableName(name) {
  return name
    .replace(/\.[^.]+$/, '')        // quitar extensión
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')   // solo letras, números y guiones bajos
    .replace(/^[0-9]/, 't$&')       // no empezar con número
    .substring(0, 60);
}

// Detectar columnas de latitud/longitud en los encabezados
function detectLatLon(columns) {
  const latCandidates = ['lat', 'latitude', 'latitud', 'y', 'lat_y', 'coord_y'];
  const lonCandidates = ['lon', 'lng', 'longitude', 'longitud', 'x', 'lon_x', 'coord_x'];
  const cols = columns.map(c => c.toLowerCase());
  const latCol = columns.find((_, i) => latCandidates.includes(cols[i]));
  const lonCol = columns.find((_, i) => lonCandidates.includes(cols[i]));
  return { latCol, lonCol };
}

// Parsear CSV → array de objetos
async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    createReadStream(filePath)
      .pipe(csvParse({ columns: true, skip_empty_lines: true, trim: true }))
      .on('data', row => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

// Parsear Excel → array de objetos
function parseExcel(filePath) {
  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: null });
}

// Crear tabla PostGIS e insertar filas
async function createGeoTable(client, tableName, rows, latCol, lonCol) {
  if (!rows.length) throw new Error('El archivo no tiene filas de datos');

  const columns = Object.keys(rows[0]);
  const nonGeoColumns = columns.filter(c => c !== latCol && c !== lonCol);
  const hasCoords = !!(latCol && lonCol);

  // Crear tabla
  const colDefs = nonGeoColumns.map(c => `"${c}" TEXT`).join(', ');
  const geomDef = hasCoords ? ', geom GEOMETRY(Point, 4326)' : '';

  await client.query(`DROP TABLE IF EXISTS "${tableName}"`);
  await client.query(`
    CREATE TABLE "${tableName}" (
      gid SERIAL PRIMARY KEY,
      ${colDefs}${geomDef}
    )
  `);

  // Insertar filas en lotes de 500
  let processed = 0;
  let errors = 0;
  const BATCH = 500;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    for (const row of batch) {
      try {
        const values = nonGeoColumns.map(c => row[c] ?? null);

        if (hasCoords) {
          const lat = parseFloat(row[latCol]);
          const lon = parseFloat(row[lonCol]);
          if (!isNaN(lat) && !isNaN(lon)) {
            const placeholders = nonGeoColumns.map((_, idx) => `$${idx + 1}`).join(', ');
            await client.query(`
              INSERT INTO "${tableName}" (${nonGeoColumns.map(c => `"${c}"`).join(', ')}, geom)
              VALUES (${placeholders}, ST_SetSRID(ST_MakePoint($${nonGeoColumns.length + 1}, $${nonGeoColumns.length + 2}), 4326))
            `, [...values, lon, lat]);
          } else {
            // Coordenadas inválidas: insertar sin geometría
            const placeholders = nonGeoColumns.map((_, idx) => `$${idx + 1}`).join(', ');
            await client.query(`
              INSERT INTO "${tableName}" (${nonGeoColumns.map(c => `"${c}"`).join(', ')})
              VALUES (${placeholders})
            `, values);
            errors++;
          }
        } else {
          const placeholders = nonGeoColumns.map((_, idx) => `$${idx + 1}`).join(', ');
          await client.query(`
            INSERT INTO "${tableName}" (${nonGeoColumns.map(c => `"${c}"`).join(', ')})
            VALUES (${placeholders})
          `, values);
        }
        processed++;
      } catch {
        errors++;
      }
    }
  }

  // Crear índice espacial si tiene geometría
  if (hasCoords) {
    await client.query(`CREATE INDEX ON "${tableName}" USING GIST (geom)`);
  }

  return { processed, errors, hasCoords };
}

// POST /api/uploads — subir archivo y crear tabla PostGIS
router.post('/', authMiddleware, upload.single('archivo'), async (req, res) => {
  const filePath = req.file?.path;
  try {
    const { role, secretaria, id: userId } = req.user;
    const { secretaria_id, nombre_tabla, lat_col, lon_col } = req.body;

    // Verificar permisos: la secretaría del usuario debe coincidir (excepto admin/editor_geo)
    const targetSecretaria = ['admin', 'editor_geo'].includes(role) ? secretaria_id : secretaria;
    if (!targetSecretaria) {
      return res.status(400).json({ error: 'Debe especificar la secretaría' });
    }

    if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });

    const ext = req.file.originalname.split('.').pop().toLowerCase();
    const rawName = nombre_tabla || req.file.originalname;
    const tableName = sanitizeTableName(rawName) + '_' + Date.now();

    // Crear registro de upload
    const uploadResult = await pool.query(`
      INSERT INTO uploads (secretaria_id, usuario_id, nombre_archivo, tabla_destino, tipo_archivo, estado, columna_lat, columna_lon)
      VALUES ($1,$2,$3,$4,$5,'procesando',$6,$7)
      RETURNING id
    `, [targetSecretaria, userId, req.file.originalname, tableName, ext, lat_col || null, lon_col || null]);

    const uploadId = uploadResult.rows[0].id;

    // Parsear archivo
    let rows;
    if (ext === 'csv') {
      rows = await parseCSV(filePath);
    } else if (['xls', 'xlsx'].includes(ext)) {
      rows = parseExcel(filePath);
    } else if (['json', 'geojson'].includes(ext)) {
      // GeoJSON: se maneja diferente (tiene geometría propia)
      const raw = await import('fs').then(fs => fs.readFileSync(filePath, 'utf8'));
      const geojson = JSON.parse(raw);
      return await handleGeoJSON(req, res, geojson, tableName, targetSecretaria, userId, uploadId);
    } else {
      return res.status(400).json({ error: 'Formato no soportado' });
    }

    if (!rows.length) {
      await pool.query("UPDATE uploads SET estado='error', mensaje_error=$1 WHERE id=$2",
        ['El archivo está vacío', uploadId]);
      return res.status(400).json({ error: 'El archivo está vacío' });
    }

    // Detectar lat/lon si no se especificaron
    const columns = Object.keys(rows[0]);
    const detected = detectLatLon(columns);
    const latCol = lat_col || detected.latCol || null;
    const lonCol = lon_col || detected.lonCol || null;

    // Crear tabla e insertar
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { processed, errors, hasCoords } = await createGeoTable(client, tableName, rows, latCol, lonCol);

      // Registrar en geo_tablas
      await client.query(`
        INSERT INTO geo_tablas (nombre_tabla, secretaria_id, descripcion, columna_geometria,
                                srid, tipo_geometria, total_features, publica, upload_id)
        VALUES ($1,$2,$3,$4,4326,$5,$6,FALSE,$7)
        ON CONFLICT (nombre_tabla) DO NOTHING
      `, [tableName, targetSecretaria, `Datos subidos: ${req.file.originalname}`,
          hasCoords ? 'geom' : null, hasCoords ? 'point' : null, processed, uploadId]);

      await client.query(`
        UPDATE uploads SET estado='completado', filas_procesadas=$1, filas_error=$2,
          tabla_destino=$3, completed_at=NOW() WHERE id=$4
      `, [processed, errors, tableName, uploadId]);

      await client.query('COMMIT');

      res.json({
        message: 'Archivo procesado exitosamente',
        upload_id: uploadId,
        tabla: tableName,
        filas_procesadas: processed,
        filas_error: errors,
        tiene_geometria: hasCoords,
        columna_lat: latCol,
        columna_lon: lonCol,
        columnas: columns
      });
    } catch (err) {
      await client.query('ROLLBACK');
      await pool.query("UPDATE uploads SET estado='error', mensaje_error=$1 WHERE id=$2",
        [err.message, uploadId]);
      throw err;
    } finally {
      client.release();
    }

  } catch (err) {
    console.error('[Upload] Error:', err.message);
    res.status(500).json({ error: 'Error procesando archivo', detail: err.message });
  } finally {
    if (filePath) await unlink(filePath).catch(() => {});
  }
});

// Manejo especial para GeoJSON
async function handleGeoJSON(req, res, geojson, tableName, secretariaId, userId, uploadId) {
  const features = geojson.features || (geojson.type === 'Feature' ? [geojson] : []);
  if (!features.length) {
    await pool.query("UPDATE uploads SET estado='error', mensaje_error=$1 WHERE id=$2",
      ['GeoJSON sin features', uploadId]);
    return res.status(400).json({ error: 'GeoJSON sin features' });
  }

  const propKeys = [...new Set(features.flatMap(f => Object.keys(f.properties || {})))];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const colDefs = propKeys.map(k => `"${k}" TEXT`).join(', ');
    await client.query(`DROP TABLE IF EXISTS "${tableName}"`);
    await client.query(`
      CREATE TABLE "${tableName}" (
        gid SERIAL PRIMARY KEY,
        ${colDefs.length ? colDefs + ',' : ''}
        geom GEOMETRY(Geometry, 4326)
      )
    `);

    let processed = 0, errors = 0;
    for (const feat of features) {
      try {
        const vals = propKeys.map(k => feat.properties?.[k] ?? null);
        const placeholders = propKeys.map((_, i) => `$${i + 1}`).join(', ');
        const colNames = propKeys.map(k => `"${k}"`).join(', ');
        await client.query(`
          INSERT INTO "${tableName}" (${colNames.length ? colNames + ', ' : ''}geom)
          VALUES (${placeholders.length ? placeholders + ', ' : ''}ST_SetSRID(ST_GeomFromGeoJSON($${propKeys.length + 1}), 4326))
        `, [...vals, JSON.stringify(feat.geometry)]);
        processed++;
      } catch { errors++; }
    }

    await client.query(`CREATE INDEX ON "${tableName}" USING GIST (geom)`);

    const geomType = features[0]?.geometry?.type?.toLowerCase().includes('point') ? 'point'
      : features[0]?.geometry?.type?.toLowerCase().includes('polygon') ? 'polygon' : 'line';

    await client.query(`
      INSERT INTO geo_tablas (nombre_tabla, secretaria_id, descripcion, columna_geometria,
                              srid, tipo_geometria, total_features, publica, upload_id)
      VALUES ($1,$2,$3,'geom',4326,$4,$5,FALSE,$6)
      ON CONFLICT (nombre_tabla) DO NOTHING
    `, [tableName, secretariaId, `GeoJSON subido: ${req.file.originalname}`, geomType, processed, uploadId]);

    await client.query(`
      UPDATE uploads SET estado='completado', filas_procesadas=$1, filas_error=$2,
        tabla_destino=$3, completed_at=NOW() WHERE id=$4
    `, [processed, errors, tableName, uploadId]);

    await client.query('COMMIT');

    res.json({
      message: 'GeoJSON procesado exitosamente',
      upload_id: uploadId,
      tabla: tableName,
      filas_procesadas: processed,
      filas_error: errors,
      tiene_geometria: true,
      columnas: propKeys
    });
  } catch (err) {
    await client.query('ROLLBACK');
    await pool.query("UPDATE uploads SET estado='error', mensaje_error=$1 WHERE id=$2",
      [err.message, uploadId]);
    res.status(500).json({ error: 'Error procesando GeoJSON', detail: err.message });
  } finally {
    client.release();
  }
}

// GET /api/uploads?secretariaId=planeacion — historial de uploads
router.get('/', authMiddleware, async (req, res) => {
  const { role, secretaria } = req.user;
  const targetSecretaria = ['admin', 'editor_geo'].includes(role)
    ? (req.query.secretariaId || null)
    : secretaria;

  const query = targetSecretaria
    ? `SELECT u.*, us.nombre_completo AS usuario_nombre
       FROM uploads u
       LEFT JOIN usuarios us ON us.id = u.usuario_id
       WHERE u.secretaria_id = $1 ORDER BY u.created_at DESC LIMIT 100`
    : `SELECT u.*, us.nombre_completo AS usuario_nombre
       FROM uploads u
       LEFT JOIN usuarios us ON us.id = u.usuario_id
       ORDER BY u.created_at DESC LIMIT 100`;

  const params = targetSecretaria ? [targetSecretaria] : [];
  const result = await pool.query(query, params);
  res.json({ uploads: result.rows });
});

export default router;
