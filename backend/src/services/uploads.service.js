import { readFileSync } from 'fs';
import { pool } from '../db/pool.js';
import { sanitizeTableName, detectLatLon } from '../utils/tableUtils.js';
import { parseCSV, parseExcel } from '../utils/fileParser.js';
import { AppError } from '../middleware/errorHandler.js';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────────────────────────────────────

/** Parsea CSV o Excel según extensión, retorna filas */
async function parseFile(file) {
  const ext = file.originalname.split('.').pop().toLowerCase();
  if (ext === 'csv')               return { rows: await parseCSV(file.path), ext };
  if (['xls', 'xlsx'].includes(ext)) return { rows: await parseExcel(file.path), ext };
  throw new AppError('Formato no soportado', 400);
}

/** Crea tabla PostGIS con geometría Point desde columnas lat/lon */
async function createGeoTable(client, tableName, rows, latCol, lonCol) {
  if (!rows.length) throw new AppError('El archivo no tiene filas de datos', 400);

  const columns     = Object.keys(rows[0]);
  const nonGeoCols  = columns.filter(c => c !== latCol && c !== lonCol);
  const hasCoords   = !!(latCol && lonCol);
  const colDefs     = nonGeoCols.map(c => `"${c}" TEXT`).join(', ');
  const geomDef     = hasCoords ? ', geom GEOMETRY(Point, 4326)' : '';

  await client.query(`DROP TABLE IF EXISTS "${tableName}"`);
  await client.query(`
    CREATE TABLE "${tableName}" (
      gid SERIAL PRIMARY KEY,
      ${colDefs}${geomDef}
    )
  `);

  let processed = 0, errors = 0;
  const BATCH = 500;

  for (let i = 0; i < rows.length; i += BATCH) {
    for (const row of rows.slice(i, i + BATCH)) {
      try {
        const values = nonGeoCols.map(c => row[c] ?? null);
        const cols   = nonGeoCols.map(c => `"${c}"`).join(', ');
        const phs    = nonGeoCols.map((_, idx) => `$${idx + 1}`).join(', ');

        if (hasCoords) {
          const lat = parseFloat(row[latCol]);
          const lon = parseFloat(row[lonCol]);
          if (!isNaN(lat) && !isNaN(lon)) {
            await client.query(`
              INSERT INTO "${tableName}" (${cols}, geom)
              VALUES (${phs}, ST_SetSRID(ST_MakePoint($${nonGeoCols.length + 1}, $${nonGeoCols.length + 2}), 4326))
            `, [...values, lon, lat]);
          } else {
            await client.query(`INSERT INTO "${tableName}" (${cols}) VALUES (${phs})`, values);
            errors++;
          }
        } else {
          await client.query(`INSERT INTO "${tableName}" (${cols}) VALUES (${phs})`, values);
        }
        processed++;
      } catch { errors++; }
    }
  }

  if (hasCoords) await client.query(`CREATE INDEX ON "${tableName}" USING GIST (geom)`);
  return { processed, errors, hasCoords };
}

/** Crea tabla PostGIS con geometría obtenida por cruce con capa base */
async function createJoinTable(client, tableName, rows, columns, joinLayer, joinFieldExcel, joinFieldLayer, joinGeomType) {
  if (!rows.length) throw new AppError('El archivo no tiene filas de datos', 400);

  // Verificar que la capa base existe en la DB
  const layerCheck = await client.query(
    `SELECT to_regclass($1) AS exists`,
    [joinLayer]
  );
  if (!layerCheck.rows[0].exists) {
    throw new AppError(`La capa base "${joinLayer}" no existe en la base de datos`, 400);
  }

  const colDefs  = columns.map(c => `"${c}" TEXT`).join(', ');
  const colNames = columns.map(c => `"${c}"`).join(', ');

  await client.query(`DROP TABLE IF EXISTS "${tableName}"`);
  await client.query(`
    CREATE TABLE "${tableName}" (
      gid            SERIAL PRIMARY KEY,
      ${colDefs},
      geom           GEOMETRY(Geometry, 4326),
      _join_matched  BOOLEAN DEFAULT FALSE
    )
  `);

  // Insertar todas las filas sin geometría (en lotes)
  let processed = 0, errors = 0;
  const BATCH = 500;

  for (let i = 0; i < rows.length; i += BATCH) {
    for (const row of rows.slice(i, i + BATCH)) {
      try {
        const values = columns.map(c => row[c] ?? null);
        const phs    = columns.map((_, idx) => `$${idx + 1}`).join(', ');
        await client.query(
          `INSERT INTO "${tableName}" (${colNames}) VALUES (${phs})`,
          values
        );
        processed++;
      } catch { errors++; }
    }
  }

  // UPDATE masivo: asignar geometría desde la capa base usando JOIN
  const geomExpr = joinGeomType === 'polygon'
    ? `b.geom`
    : `ST_Centroid(b.geom)`;

  const updateResult = await client.query(`
    UPDATE "${tableName}" t
    SET    geom          = ${geomExpr},
           _join_matched = TRUE
    FROM   "${joinLayer}" b
    WHERE  lower(trim(t."${joinFieldExcel}"::text)) = lower(trim(b."${joinFieldLayer}"::text))
    AND    t.geom IS NULL
  `);

  const matched   = updateResult.rowCount || 0;
  const unmatched = processed - matched;

  // Índice espacial solo donde hay geometría
  await client.query(`CREATE INDEX ON "${tableName}" USING GIST (geom) WHERE geom IS NOT NULL`);

  return { processed, errors, matched, unmatched, hasCoords: matched > 0 };
}

/** Inserta features GeoJSON en tabla PostGIS */
async function insertGeoJSON(client, tableName, features, propKeys) {
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
      const vals  = propKeys.map(k => feat.properties?.[k] ?? null);
      const phs   = propKeys.map((_, i) => `$${i + 1}`).join(', ');
      const cols  = propKeys.map(k => `"${k}"`).join(', ');
      await client.query(`
        INSERT INTO "${tableName}" (${cols.length ? cols + ', ' : ''}geom)
        VALUES (${phs.length ? phs + ', ' : ''}ST_SetSRID(ST_GeomFromGeoJSON($${propKeys.length + 1}), 4326))
      `, [...vals, JSON.stringify(feat.geometry)]);
      processed++;
    } catch { errors++; }
  }

  await client.query(`CREATE INDEX ON "${tableName}" USING GIST (geom)`);
  return { processed, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS PÚBLICOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analiza un archivo subido y retorna columnas, muestra y auto-detección
 * de coordenadas. NO guarda nada en la DB.
 */
export async function analyzeFile({ file }) {
  const { rows, ext } = await parseFile(file);
  if (!['csv', 'xls', 'xlsx'].includes(ext)) {
    throw new AppError('El análisis solo soporta CSV y Excel', 400);
  }
  if (!rows.length) throw new AppError('El archivo está vacío', 400);

  const columns          = Object.keys(rows[0]);
  const { latCol, lonCol } = detectLatLon(columns);
  const preview          = rows.slice(0, 5);

  return {
    columns,
    preview,
    detected_lat: latCol  || null,
    detected_lon: lonCol  || null,
    has_coords:   !!(latCol && lonCol),
    total_rows:   rows.length,
  };
}

/**
 * Retorna la lista de capas base disponibles para cruce de datos.
 * Consulta dinámicamente geometry_columns de PostGIS para encontrar
 * tablas con geometría de polígono que realmente existan en la DB.
 */
export async function getBaseLayers() {
  // Capas con geometría de polígono que existen realmente en PostGIS
  const geoResult = await pool.query(`
    SELECT f_table_name  AS table_name,
           f_table_schema AS schema,
           type           AS geom_type
    FROM   geometry_columns
    WHERE  f_table_schema = 'public'
    AND    upper(type) IN ('POLYGON','MULTIPOLYGON','GEOMETRY',
                           'GEOMETRYCOLLECTION','MULTIGEOMETRY')
    ORDER  BY f_table_name
  `);

  const fromPostGIS = geoResult.rows.map(r => ({
    table_name: r.table_name,
    label:      r.table_name.replace(/_/g, ' '),   // nombre legible por defecto
    tipo:       'polygon',
    source:     'postgis',
  }));

  // También incluir capas de polígonos subidas por usuarios (pueden tener label personalizado)
  const uploadedResult = await pool.query(`
    SELECT nombre_tabla, descripcion AS label, tipo_geometria AS tipo
    FROM   geo_tablas
    WHERE  tipo_geometria IN ('polygon', 'line')
    ORDER  BY created_at DESC
    LIMIT  50
  `);

  // Enriquecer con labels del catálogo de usuario; evitar duplicados
  const postGISNames = new Set(fromPostGIS.map(r => r.table_name));
  const uploaded = uploadedResult.rows
    .filter(r => !postGISNames.has(r.nombre_tabla))   // evitar duplicados
    .map(r => ({
      table_name:  r.nombre_tabla,
      label:       r.label || r.nombre_tabla,
      tipo:        r.tipo,
      source:      'upload',
    }));

  // Aplicar labels personalizados a las capas PostGIS cuando coincidan
  const labelMap = {};
  for (const r of uploadedResult.rows) labelMap[r.nombre_tabla] = r.label;
  fromPostGIS.forEach(r => { if (labelMap[r.table_name]) r.label = labelMap[r.table_name]; });

  return [...fromPostGIS, ...uploaded];
}

/**
 * Retorna las columnas (sin geometría) de una capa base específica.
 */
export async function getBaseLayerFields(tableName) {
  // Solo letras, números y guiones bajos — prevenir inyección
  if (!/^[a-z0-9_]+$/i.test(tableName)) {
    throw new AppError('Nombre de tabla inválido', 400);
  }

  const EXCLUDE = ['gid', 'geom', 'the_geom', 'geometry',
                   'wkb_geometry', 'shape', '_join_matched'];

  // pg_attribute filtrado por schema 'public' para evitar ambigüedades
  const result = await pool.query(`
    SELECT DISTINCT a.attname AS column_name, a.attnum
    FROM   pg_attribute  a
    JOIN   pg_class      c ON c.oid = a.attrelid
    JOIN   pg_namespace  n ON n.oid = c.relnamespace
    WHERE  c.relname  = $1
    AND    n.nspname  = 'public'
    AND    a.attnum   > 0
    AND    NOT a.attisdropped
    AND    a.attname NOT IN (${EXCLUDE.map((_, i) => `$${i + 2}`).join(', ')})
    ORDER  BY a.attnum
  `, [tableName, ...EXCLUDE]);

  if (result.rows.length > 0) {
    return result.rows.map(r => r.column_name);
  }

  // Fallback: information_schema con filtro de schema
  const fallback = await pool.query(`
    SELECT column_name
    FROM   information_schema.columns
    WHERE  table_schema = 'public'
    AND    table_name   = $1
    AND    column_name NOT IN (${EXCLUDE.map((_, i) => `$${i + 2}`).join(', ')})
    ORDER  BY ordinal_position
    LIMIT  200
  `, [tableName, ...EXCLUDE]);

  return fallback.rows.map(r => r.column_name);
}

/**
 * Procesa la carga de un archivo (CSV/Excel/GeoJSON).
 * Soporta geo_mode: 'coords' | 'join' | 'none'
 */
export async function processUpload({
  file, user, secretaria_id, nombre_tabla,
  lat_col, lon_col,
  geo_mode = 'coords',
  join_layer, join_field_excel, join_field_layer, join_geom_type = 'centroid',
}) {
  const { role, secretaria, id: userId } = user;
  const targetSecretaria = ['admin', 'editor_geo'].includes(role) ? secretaria_id : secretaria;
  if (!targetSecretaria) throw new AppError('Debe especificar la secretaría', 400);
  if (!file)             throw new AppError('No se recibió archivo', 400);

  const ext      = file.originalname.split('.').pop().toLowerCase();
  const rawName  = nombre_tabla || file.originalname;
  const tableName = sanitizeTableName(rawName) + '_' + Date.now();

  // Registro inicial
  const uploadResult = await pool.query(`
    INSERT INTO uploads (secretaria_id, usuario_id, nombre_archivo, tabla_destino,
                         tipo_archivo, estado, columna_lat, columna_lon)
    VALUES ($1,$2,$3,$4,$5,'procesando',$6,$7) RETURNING id
  `, [targetSecretaria, userId, file.originalname, tableName, ext,
      lat_col || null, lon_col || null]);
  const uploadId = uploadResult.rows[0].id;

  // ── GeoJSON: flujo separado ──
  if (['json', 'geojson'].includes(ext)) {
    return await _processGeoJSON({ file, tableName, targetSecretaria, uploadId });
  }

  // ── CSV / Excel ──
  const { rows } = await parseFile(file);
  if (!rows.length) {
    await pool.query("UPDATE uploads SET estado='error', mensaje_error=$1 WHERE id=$2",
      ['El archivo está vacío', uploadId]);
    throw new AppError('El archivo está vacío', 400);
  }

  const columns  = Object.keys(rows[0]);
  const detected = detectLatLon(columns);
  const latCol   = lat_col  || detected.latCol || null;
  const lonCol   = lon_col  || detected.lonCol || null;

  // Auto-detectar modo si no se especificó
  const mode = geo_mode || (latCol && lonCol ? 'coords' : 'none');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let stats;

    if (mode === 'join') {
      // ── Modo cruce con capa base ──
      if (!join_layer || !join_field_excel || !join_field_layer) {
        throw new AppError('Faltan parámetros de cruce: join_layer, join_field_excel, join_field_layer', 400);
      }
      stats = await createJoinTable(
        client, tableName, rows, columns,
        join_layer, join_field_excel, join_field_layer, join_geom_type
      );
      // geo_tablas
      const geomType = join_geom_type === 'polygon' ? 'polygon' : 'point';
      await client.query(`
        INSERT INTO geo_tablas (nombre_tabla, secretaria_id, descripcion, columna_geometria,
                                srid, tipo_geometria, total_features, publica, upload_id)
        VALUES ($1,$2,$3,'geom',4326,$4,$5,FALSE,$6)
        ON CONFLICT (nombre_tabla) DO NOTHING
      `, [tableName, targetSecretaria,
          `Cruce con ${join_layer}: ${file.originalname}`,
          geomType, stats.processed, uploadId]);

      await client.query(`
        UPDATE uploads SET estado='completado', filas_procesadas=$1, filas_error=$2,
          tabla_destino=$3, completed_at=NOW() WHERE id=$4
      `, [stats.processed, stats.errors, tableName, uploadId]);

      await client.query('COMMIT');
      return {
        message:          'Archivo procesado con cruce de datos',
        upload_id:        uploadId,
        tabla:            tableName,
        filas_procesadas: stats.processed,
        filas_error:      stats.errors,
        filas_cruzadas:   stats.matched,
        filas_sin_cruce:  stats.unmatched,
        tiene_geometria:  stats.hasCoords,
        capa_base:        join_layer,
      };

    } else {
      // ── Modo coordenadas o sin georref ──
      const finalLatCol = mode === 'coords' ? latCol : null;
      const finalLonCol = mode === 'coords' ? lonCol : null;
      stats = await createGeoTable(client, tableName, rows, finalLatCol, finalLonCol);

      await client.query(`
        INSERT INTO geo_tablas (nombre_tabla, secretaria_id, descripcion, columna_geometria,
                                srid, tipo_geometria, total_features, publica, upload_id)
        VALUES ($1,$2,$3,$4,4326,$5,$6,FALSE,$7)
        ON CONFLICT (nombre_tabla) DO NOTHING
      `, [tableName, targetSecretaria, `Datos subidos: ${file.originalname}`,
          stats.hasCoords ? 'geom' : null,
          stats.hasCoords ? 'point' : null,
          stats.processed, uploadId]);

      await client.query(`
        UPDATE uploads SET estado='completado', filas_procesadas=$1, filas_error=$2,
          tabla_destino=$3, completed_at=NOW() WHERE id=$4
      `, [stats.processed, stats.errors, tableName, uploadId]);

      await client.query('COMMIT');
      return {
        message:          'Archivo procesado exitosamente',
        upload_id:        uploadId,
        tabla:            tableName,
        filas_procesadas: stats.processed,
        filas_error:      stats.errors,
        tiene_geometria:  stats.hasCoords,
        columna_lat:      finalLatCol,
        columna_lon:      finalLonCol,
        columnas:         columns,
      };
    }
  } catch (err) {
    await client.query('ROLLBACK');
    await pool.query("UPDATE uploads SET estado='error', mensaje_error=$1 WHERE id=$2",
      [err.message, uploadId]);
    throw err;
  } finally {
    client.release();
  }
}

/** Subrutina interna para GeoJSON */
async function _processGeoJSON({ file, tableName, targetSecretaria, uploadId }) {
  const raw      = readFileSync(file.path, 'utf8');
  const geojson  = JSON.parse(raw);
  const features = geojson.features || (geojson.type === 'Feature' ? [geojson] : []);

  if (!features.length) {
    await pool.query("UPDATE uploads SET estado='error', mensaje_error=$1 WHERE id=$2",
      ['GeoJSON sin features', uploadId]);
    throw new AppError('GeoJSON sin features', 400);
  }

  const propKeys = [...new Set(features.flatMap(f => Object.keys(f.properties || {})))];
  const client   = await pool.connect();
  try {
    await client.query('BEGIN');
    const { processed, errors } = await insertGeoJSON(client, tableName, features, propKeys);
    const geomType = features[0]?.geometry?.type?.toLowerCase().includes('point')   ? 'point'
                   : features[0]?.geometry?.type?.toLowerCase().includes('polygon') ? 'polygon'
                   : 'line';

    await client.query(`
      INSERT INTO geo_tablas (nombre_tabla, secretaria_id, descripcion, columna_geometria,
                              srid, tipo_geometria, total_features, publica, upload_id)
      VALUES ($1,$2,$3,'geom',4326,$4,$5,FALSE,$6)
      ON CONFLICT (nombre_tabla) DO NOTHING
    `, [tableName, targetSecretaria, `GeoJSON subido: ${file.originalname}`,
        geomType, processed, uploadId]);

    await client.query(`
      UPDATE uploads SET estado='completado', filas_procesadas=$1, filas_error=$2,
        tabla_destino=$3, completed_at=NOW() WHERE id=$4
    `, [processed, errors, tableName, uploadId]);

    await client.query('COMMIT');
    return {
      message: 'GeoJSON procesado exitosamente',
      upload_id: uploadId, tabla: tableName,
      filas_procesadas: processed, filas_error: errors,
      tiene_geometria: true, columnas: propKeys,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    await pool.query("UPDATE uploads SET estado='error', mensaje_error=$1 WHERE id=$2",
      [err.message, uploadId]);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Elimina un upload: borra el registro, la entrada en geo_tablas y hace DROP de la tabla PostGIS.
 * Solo el creador o admin/editor_geo puede eliminar.
 */
export async function deleteUpload({ uploadId, user }) {
  const { role, id: userId, secretaria } = user;
  const isPrivileged = ['admin', 'editor_geo'].includes(role);

  // Obtener el registro
  const res = await pool.query('SELECT * FROM uploads WHERE id = $1', [uploadId]);
  if (!res.rows.length) throw new AppError('Upload no encontrado', 404);
  const upload = res.rows[0];

  // Control de acceso
  if (!isPrivileged && upload.usuario_id !== userId) {
    throw new AppError('No tienes permiso para eliminar este archivo', 403);
  }
  if (!isPrivileged && upload.secretaria_id !== secretaria) {
    throw new AppError('No tienes permiso para eliminar este archivo', 403);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Eliminar tabla PostGIS si existe
    if (upload.tabla_destino) {
      await client.query(`DROP TABLE IF EXISTS "${upload.tabla_destino}"`);
      await client.query('DELETE FROM geo_tablas WHERE nombre_tabla = $1', [upload.tabla_destino]);
    }

    // Eliminar registro de uploads
    await client.query('DELETE FROM uploads WHERE id = $1', [uploadId]);

    await client.query('COMMIT');
    return { message: 'Archivo eliminado correctamente', id: uploadId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Historial de cargas */
export async function getUploadHistory({ role, secretaria, secretariaId }) {
  const target = ['admin', 'editor_geo'].includes(role)
    ? (secretariaId || null)
    : secretaria;

  const query = target
    ? `SELECT u.*, us.nombre_completo AS usuario_nombre
       FROM uploads u LEFT JOIN usuarios us ON us.id = u.usuario_id
       WHERE u.secretaria_id = $1 ORDER BY u.created_at DESC LIMIT 100`
    : `SELECT u.*, us.nombre_completo AS usuario_nombre
       FROM uploads u LEFT JOIN usuarios us ON us.id = u.usuario_id
       ORDER BY u.created_at DESC LIMIT 100`;

  const result = await pool.query(query, target ? [target] : []);
  return result.rows;
}
