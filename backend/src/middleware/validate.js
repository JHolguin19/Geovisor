import { z } from 'zod';
import { AppError } from './errorHandler.js';

// ── Schemas ──────────────────────────────────────────────────────────────────

export const schemas = {
  login: z.object({
    username: z.string().min(2, 'Usuario requerido (mín. 2 caracteres)'),
    password: z.string().min(4, 'Contraseña requerida (mín. 4 caracteres)'),
  }),

  createCapa: z.object({
    id:             z.string().min(1, 'Campo "id" requerido'),
    nombre:         z.string().min(1, 'Campo "nombre" requerido'),
    secretaria_id:  z.string().min(1, 'Campo "secretaria_id" requerido'),
    tabla_postgis:  z.string().min(1, 'Campo "tabla_postgis" requerido'),
    color:          z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default('#3388ff'),
    visible_defecto: z.boolean().optional().default(false),
    queryable:      z.boolean().optional().default(true),
    z_index:        z.number().int().optional().default(1),
    descripcion:    z.string().optional().nullable(),
    columnas_consulta: z.string().optional().nullable(),
    tipo_geometria: z.enum(['point', 'polygon', 'line']).optional().default('polygon'),
    orden:          z.number().int().optional().default(0),
    popup_fields: z.array(z.object({
      campo:    z.string(),
      etiqueta: z.string(),
      formato:  z.string().optional().default('text'),
    })).optional(),
  }),

  updateCapa: z.object({
    nombre:          z.string().min(1).optional(),
    color:           z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    visible_defecto: z.boolean().optional(),
    queryable:       z.boolean().optional(),
    z_index:         z.number().int().optional(),
    descripcion:     z.string().optional().nullable(),
    columnas_consulta: z.string().optional().nullable(),
    orden:           z.number().int().optional(),
    activa:          z.boolean().optional(),
    popup_fields: z.array(z.object({
      campo:    z.string(),
      etiqueta: z.string(),
      formato:  z.string().optional().default('text'),
    })).optional(),
  }),

  upload: z.object({
    secretaria_id:    z.string().optional(),
    nombre_tabla:     z.string().max(60).optional(),
    lat_col:          z.string().optional(),
    lon_col:          z.string().optional(),
    geo_mode:         z.enum(['coords', 'join', 'none']).optional(),
    join_layer:       z.string().max(200).optional(),
    join_field_excel: z.string().max(200).optional(),
    join_field_layer: z.string().max(200).optional(),
    join_geom_type:   z.enum(['centroid', 'polygon']).optional(),
  }),

  createUsuario: z.object({
    username:        z.string().min(3, 'Usuario mín. 3 caracteres').max(100),
    password:        z.string().min(6, 'Contraseña mín. 6 caracteres'),
    nombre_completo: z.string().max(200).optional().nullable(),
    email:           z.string().email('Email inválido').optional().nullable(),
    rol:             z.enum(['admin', 'editor_geo', 'secretaria', 'lector']).default('lector'),
    secretaria_id:   z.string().optional().nullable(),
  }),

  updateUsuario: z.object({
    nombre_completo: z.string().max(200).optional().nullable(),
    email:           z.string().email('Email inválido').optional().nullable(),
    rol:             z.enum(['admin', 'editor_geo', 'secretaria', 'lector']).optional(),
    secretaria_id:   z.string().optional().nullable(),
    password:        z.string().min(6).optional(),
  }),

  // Geodata query params
  geodataQuery: z.object({
    bbox:         z.string().optional(),
    q:            z.string().max(200).optional(),
    searchFields: z.string().max(500).optional(),
    simplify:     z.string().optional(),
    cols:         z.string().max(1000).optional(),
    limit:        z.string().optional(),
  }),
};

// ── Schemas ETL ───────────────────────────────────────────────────────────────

const columnMappingItem = z.object({
  source: z.string().min(1, 'source requerido'),
  target: z.string().min(1, 'target requerido').regex(/^[a-z0-9_]+$/, 'target debe ser snake_case'),
  type:   z.enum(['TEXT', 'INTEGER', 'NUMERIC', 'BIGINT', 'DATE', 'BOOLEAN']).default('TEXT'),
});

const validationRuleItem = z.object({
  field:    z.string().min(1),
  rule:     z.enum(['required', 'min', 'max', 'min_length', 'max_length', 'regex', 'lat_range', 'lon_range']),
  params:   z.record(z.string()).optional().default({}),
  severity: z.enum(['warning', 'error']).optional().default('warning'),
});

export const etlProcessSchema = z.object({
  upload_id:        z.number().int().positive('upload_id debe ser un entero positivo'),
  geo_mode:         z.enum(['coords', 'join', 'spatial', 'none']).default('none'),
  geo_config:       z.record(z.unknown()).optional().default({}),
  column_mapping:   z.array(columnMappingItem).min(1, 'Se requiere al menos una columna en el mapeo'),
  validation_rules: z.array(validationRuleItem).optional().default([]),
});

export const etlPromoteSchema = z.object({
  table_name:     z.string().max(100).regex(/^[a-z0-9_]+$/, 'Nombre de tabla debe ser snake_case').optional(),
  include_errors: z.boolean().optional().default(false),
  create_layer:   z.boolean().optional().default(false),
  layer_name:     z.string().max(200).optional(),
  layer_color:    z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default('#3B82F6'),
});

export const etlRejectSchema = z.object({
  reason: z.string().max(500).optional().default('Sin motivo especificado'),
});

export const etlReprocessSchema = z.object({
  geo_mode:         z.enum(['coords', 'join', 'spatial', 'none']).optional(),
  geo_config:       z.record(z.unknown()).optional(),
  column_mapping:   z.array(columnMappingItem).optional(),
  validation_rules: z.array(validationRuleItem).optional(),
});

// ── Middleware factory ────────────────────────────────────────────────────────

/**
 * Valida req.body contra un schema zod.
 * @param {z.ZodSchema} schema
 * @param {'body' | 'query' | 'params'} source - Fuente de datos a validar
 */
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const messages = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('. ');
      return next(new AppError(messages, 400));
    }
    req[source] = result.data; // reemplazar con datos parseados/limpios
    next();
  };
}
