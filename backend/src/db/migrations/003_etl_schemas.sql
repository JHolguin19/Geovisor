-- ============================================================
-- MIGRACIÓN 003: SISTEMA ETL CON ESQUEMAS RAW + STAGING
-- Proyecto: GeoVisor Alcaldía Municipal Santander de Quilichao
-- Fecha: 2026-04-15
-- Base de datos: postgres (Supabase)
-- ============================================================
-- INSTRUCCIÓN DE EJECUCIÓN:
--   supabase db query --linked -f backend/src/db/migrations/003_etl_schemas.sql
-- ============================================================

-- ============================================================
-- 1. CREAR ESQUEMAS
-- ============================================================
CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS staging;

-- ============================================================
-- 2. TABLA DE METADATOS RAW
-- Registra cada upload con sus columnas detectadas y hash
-- ============================================================
CREATE TABLE IF NOT EXISTS raw.upload_metadata (
  id             SERIAL PRIMARY KEY,
  upload_id      INTEGER NOT NULL REFERENCES public.uploads(id) ON DELETE CASCADE,
  raw_table      VARCHAR(200) NOT NULL,       -- 'raw.upload_42'
  columns_json   JSONB NOT NULL DEFAULT '[]', -- [{name, original_name, detected_type, sample}]
  total_rows     INTEGER NOT NULL DEFAULT 0,
  file_hash      VARCHAR(64),                 -- SHA-256 para detectar duplicados
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_raw_metadata_upload UNIQUE (upload_id)
);

CREATE INDEX IF NOT EXISTS idx_raw_metadata_upload
  ON raw.upload_metadata(upload_id);

COMMENT ON TABLE raw.upload_metadata IS
  'Registro de cada archivo subido al sistema ETL. Apunta a la tabla raw.upload_{id}';
COMMENT ON COLUMN raw.upload_metadata.file_hash IS
  'SHA-256 del archivo original para detectar cargas duplicadas';

-- ============================================================
-- 3. TABLA DE JOBS DE PROCESAMIENTO (STAGING)
-- Cada vez que se inicia un procesamiento raw → staging se
-- crea un job. Un upload puede tener múltiples jobs (reprocesos)
-- ============================================================
CREATE TABLE IF NOT EXISTS staging.processing_jobs (
  id               SERIAL PRIMARY KEY,
  upload_id        INTEGER NOT NULL REFERENCES public.uploads(id) ON DELETE CASCADE,
  raw_table        VARCHAR(200) NOT NULL,       -- 'raw.upload_42'
  staging_table    VARCHAR(200) NOT NULL,       -- 'staging.stg_42'
  production_table VARCHAR(200),               -- 'public.tabla_final' (se llena al promover)

  estado           VARCHAR(30) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN (
      'pendiente', 'procesando', 'completado', 'error',
      'validado', 'rechazado', 'promovido'
    )),

  geo_mode         VARCHAR(20)
    CHECK (geo_mode IN ('coords', 'join', 'none', 'spatial')),
  geo_config       JSONB NOT NULL DEFAULT '{}',
    -- coords: {lat_col, lon_col}
    -- join:   {join_layer, join_field_excel, join_field_layer, join_geom_type: 'polygon'|'centroid'}
    -- spatial:{base_layer, relationship: 'within'|'intersects'}
  column_mapping   JSONB NOT NULL DEFAULT '[]',
    -- [{source: 'Nombre Original', target: 'nombre', type: 'TEXT|INTEGER|NUMERIC|DATE|BOOLEAN'}]
  validation_rules JSONB NOT NULL DEFAULT '[]',
    -- [{field, rule: 'required'|'min'|'max'|'regex', params}]

  stats            JSONB NOT NULL DEFAULT '{}',
    -- {total, processed, errors, matched, unmatched, warnings}
  error_log        JSONB NOT NULL DEFAULT '[]',
    -- [{row_number, field, error, value}]

  secretaria_id    VARCHAR(50) REFERENCES public.secretarias(id) ON DELETE SET NULL,
  processed_by     INTEGER REFERENCES public.usuarios(id) ON DELETE SET NULL,
  processed_at     TIMESTAMPTZ,
  validated_by     INTEGER REFERENCES public.usuarios(id) ON DELETE SET NULL,
  validated_at     TIMESTAMPTZ,
  promoted_by      INTEGER REFERENCES public.usuarios(id) ON DELETE SET NULL,
  promoted_at      TIMESTAMPTZ,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staging_jobs_upload
  ON staging.processing_jobs(upload_id);
CREATE INDEX IF NOT EXISTS idx_staging_jobs_estado
  ON staging.processing_jobs(estado);
CREATE INDEX IF NOT EXISTS idx_staging_jobs_secretaria
  ON staging.processing_jobs(secretaria_id);

COMMENT ON TABLE staging.processing_jobs IS
  'Registro de cada procesamiento ETL (raw → staging). Un upload puede re-procesarse múltiples veces';
COMMENT ON COLUMN staging.processing_jobs.production_table IS
  'Nombre de la tabla en public.* donde quedaron los datos promovidos';

-- ============================================================
-- 4. TABLA DE CONFIGURACIONES REUTILIZABLES (PRESETS GEO)
-- Permite guardar configuraciones de georreferenciación para
-- reusar en futuros uploads de la misma secretaría
-- ============================================================
CREATE TABLE IF NOT EXISTS staging.geo_presets (
  id              SERIAL PRIMARY KEY,
  nombre          VARCHAR(200) NOT NULL,
  descripcion     TEXT,
  secretaria_id   VARCHAR(50) REFERENCES public.secretarias(id) ON DELETE CASCADE,
  geo_mode        VARCHAR(20) NOT NULL
    CHECK (geo_mode IN ('coords', 'join', 'none', 'spatial')),
  geo_config      JSONB NOT NULL DEFAULT '{}',
  column_mapping  JSONB NOT NULL DEFAULT '[]',
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      INTEGER REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geo_presets_secretaria
  ON staging.geo_presets(secretaria_id);

COMMENT ON TABLE staging.geo_presets IS
  'Configuraciones de georreferenciación guardadas por secretaría para reusar';

-- ============================================================
-- 5. TABLA DE VERSIONES DE DATASET (VERSIONAMIENTO)
-- Historial de todas las veces que un upload fue promovido
-- ============================================================
CREATE TABLE IF NOT EXISTS public.dataset_versions (
  id               SERIAL PRIMARY KEY,
  upload_id        INTEGER NOT NULL REFERENCES public.uploads(id) ON DELETE CASCADE,
  job_id           INTEGER REFERENCES staging.processing_jobs(id) ON DELETE SET NULL,
  version_number   INTEGER NOT NULL DEFAULT 1,
  production_table VARCHAR(200) NOT NULL,     -- tabla en public donde quedan los datos
  filas_produccion INTEGER NOT NULL DEFAULT 0,
  filas_descartadas INTEGER NOT NULL DEFAULT 0,
  notas            TEXT,
  promoted_by      INTEGER REFERENCES public.usuarios(id) ON DELETE SET NULL,
  promoted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activa           BOOLEAN NOT NULL DEFAULT TRUE  -- solo la última versión es activa
);

CREATE INDEX IF NOT EXISTS idx_dataset_versions_upload
  ON public.dataset_versions(upload_id);
CREATE INDEX IF NOT EXISTS idx_dataset_versions_activa
  ON public.dataset_versions(activa);

COMMENT ON TABLE public.dataset_versions IS
  'Historial de versiones promovidas a producción. Un dataset puede tener múltiples versiones';

-- ============================================================
-- 6. TABLA DE LOGS DE AUDITORÍA
-- Registro de cada acción sobre el pipeline (quién + cuándo + qué)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.processing_logs (
  id           SERIAL PRIMARY KEY,
  upload_id    INTEGER REFERENCES public.uploads(id) ON DELETE SET NULL,
  job_id       INTEGER REFERENCES staging.processing_jobs(id) ON DELETE SET NULL,
  usuario_id   INTEGER REFERENCES public.usuarios(id) ON DELETE SET NULL,
  secretaria_id VARCHAR(50) REFERENCES public.secretarias(id) ON DELETE SET NULL,
  accion       VARCHAR(50) NOT NULL,
    -- 'upload', 'extract_raw', 'process_start', 'process_complete', 'process_error',
    -- 'validate', 'promote', 'reject', 'reprocess', 'delete'
  detalle      JSONB DEFAULT '{}',  -- info adicional (stats, errores, config usada)
  ip_address   VARCHAR(45),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processing_logs_upload
  ON public.processing_logs(upload_id);
CREATE INDEX IF NOT EXISTS idx_processing_logs_job
  ON public.processing_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_processing_logs_accion
  ON public.processing_logs(accion);
CREATE INDEX IF NOT EXISTS idx_processing_logs_secretaria
  ON public.processing_logs(secretaria_id);

COMMENT ON TABLE public.processing_logs IS
  'Auditoría completa de todas las acciones sobre el pipeline ETL';

-- ============================================================
-- 7. AGREGAR COLUMNA etl_status A uploads (retrocompatibilidad)
-- Los uploads actuales quedan como 'legacy'
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'uploads'
      AND column_name = 'etl_status'
  ) THEN
    ALTER TABLE public.uploads
      ADD COLUMN etl_status VARCHAR(30) NOT NULL DEFAULT 'legacy'
      CHECK (etl_status IN (
        'legacy',      -- sistema anterior (subida directa a public)
        'raw',         -- subido al esquema raw, sin procesar
        'processing',  -- en proceso de transformación activa
        'staging',     -- en staging, pendiente de validación
        'validated',   -- validado, listo para publicar
        'production',  -- publicado en public y disponible en el mapa
        'error'        -- error en alguna fase del pipeline
      ));

    COMMENT ON COLUMN public.uploads.etl_status IS
      'Estado del upload en el pipeline ETL. legacy=sistema anterior sin ETL';
  END IF;
END $$;

-- ============================================================
-- 8. AGREGAR COLUMNA etl_mode A uploads
-- Para saber si el upload usó el flujo ETL o el flujo rápido
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'uploads'
      AND column_name = 'etl_mode'
  ) THEN
    ALTER TABLE public.uploads
      ADD COLUMN etl_mode VARCHAR(20) NOT NULL DEFAULT 'legacy'
      CHECK (etl_mode IN ('legacy', 'etl', 'quick'));

    COMMENT ON COLUMN public.uploads.etl_mode IS
      'Modo de procesamiento: legacy=anterior, etl=pipeline completo, quick=directo a public';
  END IF;
END $$;

-- ============================================================
-- 9. FUNCIÓN AUXILIAR: Inferir tipo de dato desde muestras
-- Usada durante el análisis del archivo en raw
-- ============================================================
CREATE OR REPLACE FUNCTION staging.infer_column_type(
  p_samples JSONB
) RETURNS VARCHAR AS $$
DECLARE
  sample       TEXT;
  is_numeric   BOOLEAN := TRUE;
  is_integer   BOOLEAN := TRUE;
  is_date      BOOLEAN := TRUE;
  is_bool      BOOLEAN := TRUE;
  sample_count INTEGER := 0;
BEGIN
  FOR sample IN SELECT jsonb_array_elements_text(p_samples) LOOP
    IF sample IS NULL OR trim(sample) = '' THEN
      CONTINUE;
    END IF;

    sample_count := sample_count + 1;

    -- Verificar si es entero
    IF sample !~ '^-?\d+$' THEN
      is_integer := FALSE;
    END IF;

    -- Verificar si es numérico (decimal)
    IF sample !~ '^-?\d+\.?\d*$' AND sample !~ '^-?\d*\.\d+$' THEN
      is_numeric := FALSE;
    END IF;

    -- Verificar si es fecha
    IF sample !~ '^\d{4}-\d{2}-\d{2}' AND
       sample !~ '^\d{2}/\d{2}/\d{4}' AND
       sample !~ '^\d{2}-\d{2}-\d{4}' THEN
      is_date := FALSE;
    END IF;

    -- Verificar si es booleano
    IF lower(sample) NOT IN ('true','false','si','no','sí','1','0','s','n','yes','no') THEN
      is_bool := FALSE;
    END IF;
  END LOOP;

  -- Sin muestras válidas → TEXT por defecto
  IF sample_count = 0 THEN RETURN 'TEXT'; END IF;

  -- Orden de preferencia: más específico primero
  IF is_integer  THEN RETURN 'INTEGER'; END IF;
  IF is_numeric  THEN RETURN 'NUMERIC'; END IF;
  IF is_date     THEN RETURN 'DATE'; END IF;
  IF is_bool     THEN RETURN 'BOOLEAN'; END IF;
  RETURN 'TEXT';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION staging.infer_column_type(JSONB) IS
  'Infiere el tipo SQL de una columna a partir de muestras de texto (array JSON)';

-- ============================================================
-- 10. FUNCIÓN AUXILIAR: Obtener nombre seguro para tabla SQL
-- Sanitiza nombres de usuario para usarlos como identifiers
-- ============================================================
CREATE OR REPLACE FUNCTION staging.safe_column_name(
  p_name VARCHAR
) RETURNS VARCHAR AS $$
DECLARE
  v_result VARCHAR;
BEGIN
  -- Transliterar vocales con tilde manualmente (sin unaccent)
  v_result := p_name;
  v_result := replace(v_result, 'á', 'a'); v_result := replace(v_result, 'Á', 'a');
  v_result := replace(v_result, 'é', 'e'); v_result := replace(v_result, 'É', 'e');
  v_result := replace(v_result, 'í', 'i'); v_result := replace(v_result, 'Í', 'i');
  v_result := replace(v_result, 'ó', 'o'); v_result := replace(v_result, 'Ó', 'o');
  v_result := replace(v_result, 'ú', 'u'); v_result := replace(v_result, 'Ú', 'u');
  v_result := replace(v_result, 'ñ', 'n'); v_result := replace(v_result, 'Ñ', 'n');
  v_result := replace(v_result, 'ü', 'u'); v_result := replace(v_result, 'Ü', 'u');

  -- Lowercase y sanitizar caracteres especiales
  RETURN lower(
    regexp_replace(
      regexp_replace(v_result, '[^a-zA-Z0-9_]', '_', 'g'),
      '_+', '_', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION staging.safe_column_name(VARCHAR) IS
  'Convierte nombre de columna de usuario a un identifier SQL válido y seguro';

-- ============================================================
-- 11. HABILITAR RLS EN TABLAS NUEVAS
-- El backend Express usa postgres (superuser) que bypasea RLS.
-- RLS protege el acceso directo vía PostgREST/Supabase API.
-- ============================================================
ALTER TABLE raw.upload_metadata      ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging.processing_jobs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE staging.geo_presets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_versions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_logs   ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 12. MARCAR UPLOADS EXISTENTES COMO LEGACY
-- ============================================================
UPDATE public.uploads
SET etl_status = 'legacy',
    etl_mode   = 'legacy'
WHERE etl_status = 'legacy';  -- Idempotente: solo afecta los que ya tienen legacy (DEFAULT)

-- Para uploads que ya están completados via flujo antiguo:
UPDATE public.uploads
SET etl_status = 'production',
    etl_mode   = 'legacy'
WHERE estado = 'completado'
  AND etl_status = 'legacy';

-- ============================================================
-- 13. ÍNDICE EN uploads(etl_status) para el dashboard
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_uploads_etl_status
  ON public.uploads(etl_status);

-- ============================================================
-- VERIFICACIÓN FINAL
-- ============================================================
DO $$
DECLARE
  v_raw_exists     BOOLEAN;
  v_staging_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = 'raw'
  ) INTO v_raw_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = 'staging'
  ) INTO v_staging_exists;

  IF v_raw_exists AND v_staging_exists THEN
    RAISE NOTICE '✅ Migración 003 completada exitosamente';
    RAISE NOTICE '   - Schema raw: creado';
    RAISE NOTICE '   - Schema staging: creado';
    RAISE NOTICE '   - Tablas de control: raw.upload_metadata, staging.processing_jobs, staging.geo_presets';
    RAISE NOTICE '   - Tablas públicas: public.dataset_versions, public.processing_logs';
    RAISE NOTICE '   - Columnas: uploads.etl_status, uploads.etl_mode';
    RAISE NOTICE '   - Funciones: staging.infer_column_type, staging.safe_column_name';
  ELSE
    RAISE EXCEPTION '❌ Error: No se crearon los esquemas correctamente';
  END IF;
END $$;
