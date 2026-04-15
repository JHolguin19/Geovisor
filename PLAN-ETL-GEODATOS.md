# Plan de Desarrollo: Sistema ETL de Datos Geoespaciales

> **Fecha de creación:** 2026-04-10
> **Estado general:** PLANIFICACIÓN — No implementar hasta aprobación
> **Autor:** Equipo QuiliData

---

## 1. VISIÓN GENERAL

### Problema actual

El sistema de upload existente (uploads.service.js) inserta datos directamente en tablas PostGIS del esquema `public`. Esto significa:

- **Sin trazabilidad:** Los datos crudos se pierden después del procesamiento. Si hay un error en la transformación, hay que subir de nuevo el archivo.
- **Sin validación intermedia:** Todas las columnas se almacenan como TEXT. No hay inferencia de tipos, ni normalización, ni control de calidad.
- **Sin reprocesamiento:** Si las reglas de georreferenciación cambian (ej. se corrigen los polígonos de barrios), no hay forma de re-procesar los datos originales sin re-subir el archivo.
- **Sin separación de estados:** Un dato no validado queda inmediatamente disponible para el frontend.

### Solución propuesta

Implementar un pipeline ETL (Extract → Transform → Load) dentro de la misma base de datos `qgis`, usando **3 esquemas PostgreSQL**:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        BASE DE DATOS: qgis                              │
│                                                                          │
│  ┌────────────┐     ┌──────────────┐     ┌──────────────────────────┐   │
│  │  raw        │ ──► │  staging     │ ──► │  public (production)     │   │
│  │             │     │              │     │                          │   │
│  │ Datos tal   │     │ Limpieza     │     │ Datos validados,         │   │
│  │ como se     │     │ Normaliz.    │     │ georreferenciados,       │   │
│  │ suben       │     │ Georref.     │     │ listos para consumo      │   │
│  │             │     │ Validación   │     │ del frontend             │   │
│  └────────────┘     └──────────────┘     └──────────────────────────┘   │
│                                                                          │
│  Tablas de referencia (public):                                          │
│  • barrios_urbanos  • predios  • ubas  • veredas                        │
└──────────────────────────────────────────────────────────────────────────┘
```

### Principios de diseño

1. **Inmutabilidad de raw:** Los datos crudos nunca se modifican. Siempre se puede volver al estado original.
2. **Idempotencia de staging:** Reprocesar un upload produce siempre el mismo resultado en staging.
3. **Promoción explícita:** Los datos solo pasan a production cuando un usuario los aprueba o cuando un proceso automático los valida.
4. **Una sola base de datos:** No se crean nuevas bases de datos. Se usan esquemas dentro de `qgis`.
5. **Retrocompatibilidad:** El sistema existente sigue funcionando. La migración es incremental.

---

## 2. ARQUITECTURA DE ESQUEMAS SQL

### 2.1 Esquema `raw` — Datos crudos

Almacena exactamente lo que se subió, sin transformación. Cada upload genera una tabla en `raw` con el nombre `raw.upload_{upload_id}`.

**Tabla de control:**

```sql
-- raw.uploads_raw (extiende la tabla public.uploads existente)
CREATE TABLE raw.upload_metadata (
  id             SERIAL PRIMARY KEY,
  upload_id      INTEGER NOT NULL REFERENCES public.uploads(id) ON DELETE CASCADE,
  raw_table      VARCHAR(200) NOT NULL,       -- 'raw.upload_42'
  columns_json   JSONB NOT NULL,              -- [{name, original_name, detected_type, sample}]
  total_rows     INTEGER NOT NULL,
  file_hash      VARCHAR(64),                 -- SHA-256 para detectar duplicados
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
```

**Tablas dinámicas de datos:**

Cada upload genera una tabla como:
```sql
-- Ejemplo: raw.upload_42
CREATE TABLE raw.upload_42 (
  _row_id     SERIAL PRIMARY KEY,
  _row_json   JSONB NOT NULL,                -- fila completa como JSON
  _row_number INTEGER NOT NULL               -- número de fila en archivo original
);
```

**Ventajas de JSONB para raw:**
- Una sola estructura sirve para cualquier archivo, sin importar columnas.
- Se preservan los nombres originales exactos (con tildes, espacios, etc.).
- Permite consultar datos crudos con operadores JSON (`->`, `->>`, `@>`).
- No hay riesgo de nombres de columna inválidos como SQL identifiers.

### 2.2 Esquema `staging` — Limpieza y georreferenciación

Aquí se aplican las transformaciones: inferencia de tipos, normalización de campos, cruces con tablas base y generación de geometría.

**Tabla de control:**

```sql
CREATE TABLE staging.processing_jobs (
  id              SERIAL PRIMARY KEY,
  upload_id       INTEGER NOT NULL REFERENCES public.uploads(id),
  raw_table       VARCHAR(200) NOT NULL,
  staging_table   VARCHAR(200) NOT NULL,     -- 'staging.stg_42'
  estado          VARCHAR(30) DEFAULT 'pendiente',
    -- pendiente, procesando, completado, error, validado, rechazado
  geo_mode        VARCHAR(20),               -- coords, join, none
  geo_config      JSONB,                     -- {lat_col, lon_col, join_layer, join_fields, ...}
  column_mapping  JSONB,                     -- [{source, target, type, transform}]
  validation_rules JSONB,                    -- [{field, rule, params}]
  stats           JSONB,                     -- {total, processed, errors, matched, unmatched}
  error_log       JSONB,                     -- [{row, field, error}]
  processed_by    INTEGER REFERENCES public.usuarios(id),
  processed_at    TIMESTAMPTZ,
  validated_by    INTEGER REFERENCES public.usuarios(id),
  validated_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

**Tablas dinámicas de staging:**

Cada job genera una tabla con columnas tipadas:
```sql
-- Ejemplo: staging.stg_42
CREATE TABLE staging.stg_42 (
  _row_id        SERIAL PRIMARY KEY,
  _source_row    INTEGER NOT NULL,           -- referencia a raw._row_number
  _status        VARCHAR(20) DEFAULT 'ok',   -- ok, warning, error
  _status_detail TEXT,                       -- descripción del problema
  _matched       BOOLEAN DEFAULT FALSE,      -- si el JOIN geográfico tuvo éxito

  -- Columnas inferidas del archivo (ya tipadas)
  nombre         VARCHAR(200),
  barrio         VARCHAR(100),
  direccion      TEXT,
  valor          NUMERIC,
  fecha          DATE,
  -- ... etc (varían según upload)

  -- Geometría (se agrega durante georreferenciación)
  geom           GEOMETRY(Geometry, 4326)
);
```

### 2.3 Esquema `public` (production) — Sin cambios

El esquema public actual ya funciona como production. Las tablas finales siguen siendo creadas aquí con el mismo formato que usa `geodata.service.js`.

La única diferencia es que ahora los datos llegan validados desde staging en vez de directamente desde el archivo.

### 2.4 Tablas de referencia (en public, ya existen)

Estas tablas ya existen en el proyecto y se usarán para los JOINs geográficos:

| Tabla | Tipo Geom | Campos clave para JOIN |
|-------|-----------|----------------------|
| `planeacion_barrios_urbanos` | Polygon | nombre (nombre del barrio) |
| `planeacion_predios_2025` | Polygon | codigo, matriculainmobiliaria, direccion |
| `planeacion_uba1..ubac` | Polygon | nombre |
| `planeacion_sisben_barrios` | Polygon | nombre_barrio |

**Estrategias de georreferenciación:**

| Dato disponible | Estrategia | Función PostGIS |
|----------------|-----------|-----------------|
| Latitud + Longitud | Punto directo | `ST_SetSRID(ST_MakePoint(lon, lat), 4326)` |
| Nombre de barrio | JOIN relacional | `JOIN barrios ON lower(trim(dato.barrio)) = lower(trim(barrio.nombre))` → copia geom o centroide |
| Número predial | JOIN relacional | `JOIN predios ON dato.predial = predios.codigo` → copia polígono |
| Dirección | JOIN relacional | `JOIN predios ON dato.direccion ILIKE '%' \|\| predios.direccion \|\| '%'` → fuzzy |
| Coordenadas en sistema MAGNA | Reproyección | `ST_Transform(ST_SetSRID(ST_MakePoint(x, y), 3116), 4326)` |
| Punto + quiero polígono | Spatial JOIN | `ST_Within(punto, barrio.geom)` o `ST_Intersects` |

---

## 3. FLUJO ETL DETALLADO

### Fase 1: EXTRACT (Subida → raw)

```
Usuario sube archivo
       │
       ▼
  ┌─────────────────────────┐
  │  POST /api/uploads      │
  │  (multer recibe file)   │
  └───────────┬─────────────┘
              │
              ▼
  ┌─────────────────────────┐
  │  1. Parsear archivo     │
  │  2. Calcular file_hash  │
  │  3. Crear registro en   │
  │     public.uploads      │
  │  4. Crear tabla         │
  │     raw.upload_{id}     │
  │  5. Insertar filas como │
  │     JSONB               │
  │  6. Crear registro en   │
  │     raw.upload_metadata │
  │  7. Detectar tipos de   │
  │     columnas            │
  │  8. Retornar preview +  │
  │     columnas detectadas │
  └─────────────────────────┘
```

**Lo que cambia vs. el sistema actual:**
- Antes: el archivo se procesaba y se creaba la tabla final en una sola operación.
- Ahora: el archivo se guarda en raw y se retorna un **preview** al frontend. El usuario decide cómo procesar.

### Fase 2: TRANSFORM (raw → staging)

```
Usuario configura el procesamiento
(desde el frontend: mapeo de columnas,
 modo de georreferenciación, validaciones)
       │
       ▼
  ┌─────────────────────────────────────┐
  │  POST /api/etl/process              │
  │  Body: {                            │
  │    upload_id,                       │
  │    geo_mode,                        │
  │    geo_config: {...},               │
  │    column_mapping: [...],           │
  │    validation_rules: [...]          │
  │  }                                  │
  └───────────┬─────────────────────────┘
              │
              ▼
  ┌─────────────────────────────────────┐
  │  1. Crear registro en               │
  │     staging.processing_jobs         │
  │  2. Crear tabla staging.stg_{id}    │
  │     con columnas tipadas según      │
  │     column_mapping                  │
  │  3. Leer de raw.upload_{id}         │
  │  4. Por cada fila:                  │
  │     a. Extraer campos de _row_json  │
  │     b. Aplicar transformaciones:    │
  │        - Casteo de tipos            │
  │        - Trim, lowercase            │
  │        - Normalización de fechas    │
  │     c. Validar reglas               │
  │     d. Marcar _status (ok/error)    │
  │     e. Insertar en staging          │
  │  5. Georreferenciación:             │
  │     a. Si coords → ST_MakePoint    │
  │     b. Si join → UPDATE FROM base   │
  │     c. Si none → sin geometría      │
  │  6. Actualizar stats en job         │
  │  7. Generar error_log detallado     │
  └─────────────────────────────────────┘
```

**Lógica de georreferenciación condicional (PostGIS):**

```sql
-- Caso 1: Coordenadas directas
UPDATE staging.stg_42 SET
  geom = ST_SetSRID(ST_MakePoint(
    CAST(longitud AS DOUBLE PRECISION),
    CAST(latitud AS DOUBLE PRECISION)
  ), 4326),
  _matched = TRUE
WHERE latitud IS NOT NULL
  AND longitud IS NOT NULL
  AND latitud ~ '^-?\d+\.?\d*$'
  AND longitud ~ '^-?\d+\.?\d*$';

-- Caso 2: JOIN por nombre de barrio → polígono completo
UPDATE staging.stg_42 s SET
  geom = b.geom,
  _matched = TRUE
FROM planeacion_barrios_urbanos b
WHERE lower(trim(s.barrio)) = lower(trim(b.nombre))
  AND s.geom IS NULL;

-- Caso 3: JOIN por número predial → polígono del predio
UPDATE staging.stg_42 s SET
  geom = p.geom,
  _matched = TRUE
FROM planeacion_predios_2025 p
WHERE trim(s.numero_predial) = trim(p.codigo)
  AND s.geom IS NULL;

-- Caso 4: JOIN por barrio → solo centroide
UPDATE staging.stg_42 s SET
  geom = ST_Centroid(b.geom),
  _matched = TRUE
FROM planeacion_barrios_urbanos b
WHERE lower(trim(s.barrio)) = lower(trim(b.nombre))
  AND s.geom IS NULL;

-- Caso 5: Punto existente → encontrar barrio que lo contiene
UPDATE staging.stg_42 s SET
  barrio = b.nombre,
  _matched = TRUE
FROM planeacion_barrios_urbanos b
WHERE ST_Within(s.geom, b.geom)
  AND s.barrio IS NULL;

-- Validar geometrías resultantes
UPDATE staging.stg_42 SET
  geom = ST_MakeValid(geom)
WHERE geom IS NOT NULL
  AND NOT ST_IsValid(geom);

-- Índice espacial
CREATE INDEX ON staging.stg_42 USING GIST (geom)
  WHERE geom IS NOT NULL;
```

### Fase 3: VALIDATE (staging → revisión)

```
  ┌─────────────────────────────────────┐
  │  GET /api/etl/{jobId}/preview       │
  │                                     │
  │  Retorna:                           │
  │  - Resumen de stats                 │
  │  - Filas con error (paginadas)      │
  │  - Filas no georreferenciadas       │
  │  - Mapa preview de geometrías       │
  │  - Distribución por barrio/uba      │
  └───────────┬─────────────────────────┘
              │
              ▼
  ┌─────────────────────────────────────┐
  │  El usuario revisa y decide:        │
  │                                     │
  │  a) APROBAR → promover a production │
  │  b) RECHAZAR → marcar como          │
  │     rechazado, no promover          │
  │  c) REPROCESAR → volver a correr    │
  │     el ETL con config diferente     │
  └─────────────────────────────────────┘
```

### Fase 4: LOAD (staging → production)

```
  ┌─────────────────────────────────────┐
  │  POST /api/etl/{jobId}/promote      │
  │                                     │
  │  1. Crear tabla en public con       │
  │     columnas tipadas                │
  │  2. INSERT INTO public.tabla        │
  │     SELECT * FROM staging.stg_42    │
  │     WHERE _status != 'error'        │
  │  3. Registrar en geo_tablas         │
  │  4. Actualizar uploads.estado       │
  │  5. Opcionalmente crear capa        │
  │     en tabla capas                  │
  └─────────────────────────────────────┘
```

---

## 4. ENDPOINTS NUEVOS

### API ETL (`/api/etl`)

| Método | Ruta | Descripción | Acceso |
|--------|------|-------------|--------|
| POST | `/api/etl/process` | Iniciar procesamiento de un upload (raw → staging) | admin, editor_geo, secretaria |
| GET | `/api/etl/:jobId` | Estado del job de procesamiento | admin, editor_geo, secretaria |
| GET | `/api/etl/:jobId/preview` | Preview de datos en staging (paginado) | admin, editor_geo, secretaria |
| GET | `/api/etl/:jobId/errors` | Filas con error (paginado) | admin, editor_geo, secretaria |
| GET | `/api/etl/:jobId/geojson` | GeoJSON de geometrías generadas en staging | admin, editor_geo, secretaria |
| POST | `/api/etl/:jobId/reprocess` | Re-procesar con nueva configuración | admin, editor_geo |
| POST | `/api/etl/:jobId/promote` | Promover a production (staging → public) | admin, editor_geo |
| POST | `/api/etl/:jobId/reject` | Rechazar datos procesados | admin, editor_geo |
| GET | `/api/etl/history` | Historial de jobs de procesamiento | admin |

### Modificaciones a endpoints existentes

| Endpoint actual | Cambio |
|-----------------|--------|
| `POST /api/uploads` | Ahora solo guarda en raw y retorna preview. NO crea tabla en public. |
| `POST /api/uploads/analyze` | Se mantiene igual (análisis sin guardar). |
| `GET /api/uploads` | Agregar campo `etl_status` del último job. |

---

## 5. ESTRUCTURA DE ARCHIVOS (Backend)

```
backend/src/
├── routes/
│   └── etl.routes.js                  # NUEVO — endpoints ETL
├── controllers/
│   └── etl.controller.js              # NUEVO — handler HTTP
├── services/
│   ├── etl.service.js                 # NUEVO — orquestación del pipeline
│   ├── etl/
│   │   ├── extractor.js               # NUEVO — raw: parseo → JSONB
│   │   ├── transformer.js             # NUEVO — staging: tipos, normalización
│   │   ├── georeferencer.js           # NUEVO — staging: georreferenciación PostGIS
│   │   ├── validator.js               # NUEVO — staging: reglas de validación
│   │   └── promoter.js               # NUEVO — production: staging → public
│   └── uploads.service.js             # MODIFICAR — simplificar, delegar a ETL
├── db/
│   └── migrations/
│       └── 002_etl_schemas.sql        # NUEVO — CREATE SCHEMA raw, staging + tablas
└── middleware/
    └── validate.js                    # MODIFICAR — agregar schemas Zod para ETL
```

**Total: 7 archivos nuevos, 3 archivos a modificar**

---

## 6. SCRIPT SQL COMPLETO

```sql
-- ============================================================
-- MIGRACIÓN 002: SISTEMA ETL CON ESQUEMAS
-- Base de datos: qgis
-- ============================================================

-- 1. CREAR ESQUEMAS
CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS staging;

-- 2. TABLA DE METADATOS RAW
CREATE TABLE IF NOT EXISTS raw.upload_metadata (
  id             SERIAL PRIMARY KEY,
  upload_id      INTEGER NOT NULL REFERENCES public.uploads(id) ON DELETE CASCADE,
  raw_table      VARCHAR(200) NOT NULL,
  columns_json   JSONB NOT NULL,
  total_rows     INTEGER NOT NULL DEFAULT 0,
  file_hash      VARCHAR(64),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_raw_upload UNIQUE (upload_id)
);

CREATE INDEX IF NOT EXISTS idx_raw_metadata_upload
  ON raw.upload_metadata(upload_id);

-- 3. TABLA DE JOBS DE PROCESAMIENTO
CREATE TABLE IF NOT EXISTS staging.processing_jobs (
  id               SERIAL PRIMARY KEY,
  upload_id        INTEGER NOT NULL REFERENCES public.uploads(id) ON DELETE CASCADE,
  raw_table        VARCHAR(200) NOT NULL,
  staging_table    VARCHAR(200) NOT NULL,
  production_table VARCHAR(200),

  estado           VARCHAR(30) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN (
      'pendiente', 'procesando', 'completado', 'error',
      'validado', 'rechazado', 'promovido'
    )),

  geo_mode         VARCHAR(20)
    CHECK (geo_mode IN ('coords', 'join', 'none', 'spatial')),
  geo_config       JSONB DEFAULT '{}',
  column_mapping   JSONB DEFAULT '[]',
  validation_rules JSONB DEFAULT '[]',

  stats            JSONB DEFAULT '{}',
  error_log        JSONB DEFAULT '[]',

  secretaria_id    VARCHAR(50) REFERENCES public.secretarias(id),
  processed_by     INTEGER REFERENCES public.usuarios(id),
  processed_at     TIMESTAMPTZ,
  validated_by     INTEGER REFERENCES public.usuarios(id),
  validated_at     TIMESTAMPTZ,
  promoted_by      INTEGER REFERENCES public.usuarios(id),
  promoted_at      TIMESTAMPTZ,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staging_jobs_upload
  ON staging.processing_jobs(upload_id);
CREATE INDEX IF NOT EXISTS idx_staging_jobs_estado
  ON staging.processing_jobs(estado);
CREATE INDEX IF NOT EXISTS idx_staging_jobs_secretaria
  ON staging.processing_jobs(secretaria_id);

-- 4. TABLA DE CONFIGURACIONES DE GEORREFERENCIACIÓN REUTILIZABLES
CREATE TABLE IF NOT EXISTS staging.geo_presets (
  id              SERIAL PRIMARY KEY,
  nombre          VARCHAR(200) NOT NULL,
  descripcion     TEXT,
  secretaria_id   VARCHAR(50) REFERENCES public.secretarias(id),
  geo_mode        VARCHAR(20) NOT NULL,
  geo_config      JSONB NOT NULL,
  column_mapping  JSONB DEFAULT '[]',
  created_by      INTEGER REFERENCES public.usuarios(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 5. FUNCIÓN AUXILIAR: crear tabla raw desde JSONB rows
CREATE OR REPLACE FUNCTION raw.create_upload_table(
  p_table_name VARCHAR,
  p_rows       JSONB[]
) RETURNS VOID AS $$
DECLARE
  tbl VARCHAR;
BEGIN
  tbl := format('raw.%I', p_table_name);

  EXECUTE format('
    CREATE TABLE %s (
      _row_id     SERIAL PRIMARY KEY,
      _row_json   JSONB NOT NULL,
      _row_number INTEGER NOT NULL
    )', tbl);

  FOR i IN 1..array_length(p_rows, 1) LOOP
    EXECUTE format('INSERT INTO %s (_row_json, _row_number) VALUES ($1, $2)', tbl)
    USING p_rows[i], i;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 6. FUNCIÓN AUXILIAR: inferir tipo de dato desde muestras JSONB
CREATE OR REPLACE FUNCTION staging.infer_column_type(
  p_samples JSONB
) RETURNS VARCHAR AS $$
DECLARE
  sample TEXT;
  is_numeric BOOLEAN := TRUE;
  is_integer BOOLEAN := TRUE;
  is_date    BOOLEAN := TRUE;
  is_bool    BOOLEAN := TRUE;
BEGIN
  FOR sample IN SELECT jsonb_array_elements_text(p_samples) LOOP
    IF sample IS NULL OR sample = '' THEN CONTINUE; END IF;

    IF sample !~ '^-?\d+$' THEN is_integer := FALSE; END IF;
    IF sample !~ '^-?\d+\.?\d*$' THEN is_numeric := FALSE; END IF;
    IF sample !~ '^\d{4}-\d{2}-\d{2}' AND
       sample !~ '^\d{2}/\d{2}/\d{4}' THEN is_date := FALSE; END IF;
    IF lower(sample) NOT IN ('true','false','si','no','1','0','s','n')
       THEN is_bool := FALSE; END IF;
  END LOOP;

  IF is_integer THEN RETURN 'INTEGER'; END IF;
  IF is_numeric THEN RETURN 'NUMERIC'; END IF;
  IF is_date    THEN RETURN 'DATE'; END IF;
  IF is_bool    THEN RETURN 'BOOLEAN'; END IF;
  RETURN 'TEXT';
END;
$$ LANGUAGE plpgsql;

-- 7. AGREGAR COLUMNA etl_status A uploads (retrocompatibilidad)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'uploads'
      AND column_name = 'etl_status'
  ) THEN
    ALTER TABLE public.uploads
      ADD COLUMN etl_status VARCHAR(30) DEFAULT 'legacy';
    COMMENT ON COLUMN public.uploads.etl_status IS
      'legacy=sistema anterior, pending=esperando ETL, processed=en staging, promoted=en production';
  END IF;
END $$;

-- 8. PERMISOS (si se usa con roles de BD)
-- GRANT USAGE ON SCHEMA raw TO geovisor_app;
-- GRANT USAGE ON SCHEMA staging TO geovisor_app;
-- GRANT ALL ON ALL TABLES IN SCHEMA raw TO geovisor_app;
-- GRANT ALL ON ALL TABLES IN SCHEMA staging TO geovisor_app;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA raw TO geovisor_app;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA staging TO geovisor_app;
```

---

## 7. PLAN DE IMPLEMENTACIÓN POR FASES

### FASE 1: Base de datos + Infraestructura (2-3 días)
**Estado:** PENDIENTE

| # | Tarea | Archivos | Descripción |
|---|-------|----------|-------------|
| 1.1 | Ejecutar migración SQL | `db/migrations/002_etl_schemas.sql` | Crear esquemas raw, staging + tablas de control |
| 1.2 | Extractor service | `services/etl/extractor.js` | Parsear archivo → insertar en `raw.upload_{id}` como JSONB + detectar tipos |
| 1.3 | Modificar uploads.service.js | `services/uploads.service.js` | La función `processUpload()` ahora delega a extractor (raw) en vez de crear tabla final |
| 1.4 | Tests de extracción | — | Verificar que CSV, Excel y GeoJSON se guardan correctamente en raw |

### FASE 2: Transformación + Georreferenciación (3-4 días)
**Estado:** PENDIENTE

| # | Tarea | Archivos | Descripción |
|---|-------|----------|-------------|
| 2.1 | Transformer service | `services/etl/transformer.js` | Leer de raw → aplicar column_mapping → crear tabla staging tipada |
| 2.2 | Georeferencer service | `services/etl/georeferencer.js` | Aplicar ST_MakePoint / JOIN / ST_Within según geo_mode |
| 2.3 | Validator service | `services/etl/validator.js` | Aplicar reglas de validación, marcar filas con _status |
| 2.4 | ETL service (orquestador) | `services/etl.service.js` | Coordinar extractor → transformer → georeferencer → validator |
| 2.5 | Tests de transformación | — | Excel con coords, Excel sin coords (barrios), GeoJSON |

### FASE 3: Promoción + API (2-3 días)
**Estado:** PENDIENTE

| # | Tarea | Archivos | Descripción |
|---|-------|----------|-------------|
| 3.1 | Promoter service | `services/etl/promoter.js` | Copiar de staging → public, registrar en geo_tablas |
| 3.2 | ETL routes + controller | `routes/etl.routes.js`, `controllers/etl.controller.js` | Endpoints HTTP para todo el flujo |
| 3.3 | Schemas Zod | `middleware/validate.js` | Validación de input para process, promote, reject |
| 3.4 | Montar en server.js | `server.js` | `/api/etl` |
| 3.5 | Tests end-to-end | — | Upload → process → preview → promote → verificar en public |

### FASE 4: Frontend — UI de procesamiento (4-5 días)
**Estado:** PENDIENTE

| # | Tarea | Archivos | Descripción |
|---|-------|----------|-------------|
| 4.1 | Modificar UploadPage | `pages/UploadPage.jsx` | Después de subir: mostrar preview de raw + botón "Procesar" |
| 4.2 | ProcessingPage | `pages/ProcessingPage.jsx` **NUEVO** | UI de configuración: mapeo columnas, modo geo, preview de staging |
| 4.3 | ProcessingPage.css | `pages/ProcessingPage.css` **NUEVO** | Estilos |
| 4.4 | Componente ColumnMapper | `organisms/ColumnMapper/` **NUEVO** | Drag-and-drop de columnas origen → destino con tipo inferido |
| 4.5 | Componente GeoConfig | `organisms/GeoConfig/` **NUEVO** | Selector de modo geo + config específica (coords/join/spatial) |
| 4.6 | Componente DataPreview | `organisms/DataPreview/` **NUEVO** | Tabla paginada con filas ok/warning/error coloreadas |
| 4.7 | Componente StagingMap | `organisms/StagingMap/` **NUEVO** | Mini-mapa OL mostrando geometrías generadas en staging |
| 4.8 | Servicio etlService | `services/api.js` | Métodos: process, getJob, getPreview, getErrors, promote, reject |
| 4.9 | Ruta en App.jsx | `App.jsx` | `/portal/:secretariaId/process/:uploadId` |
| 4.10 | Actualizar SecretariaPortalPage | `pages/SecretariaPortalPage.jsx` | Módulo "Procesamiento de datos" si tiene uploads pendientes |

### FASE 5: Retrocompatibilidad + Limpieza (1-2 días)
**Estado:** PENDIENTE

| # | Tarea | Archivos | Descripción |
|---|-------|----------|-------------|
| 5.1 | Migrar uploads legacy | — | Script para marcar uploads existentes como `etl_status='legacy'` |
| 5.2 | Modo rápido (bypass ETL) | `services/uploads.service.js` | Flag `quick_mode=true` para mantener el comportamiento actual (directo a public) |
| 5.3 | Limpieza de tablas raw/staging | Cron o endpoint | Eliminar tablas raw/staging de uploads completados hace > 30 días |
| 5.4 | Documentación | `CONTEXT.md` | Actualizar con el flujo ETL |

---

## 8. EJEMPLO COMPLETO: CARGA DE EXCEL DE BENEFICIARIOS

### Archivo: `beneficiarios_vivienda.xlsx`

| Nombre | Cédula | Barrio | Dirección | Teléfono | Fecha_Registro |
|--------|--------|--------|-----------|----------|----------------|
| María López | 1061234567 | El Porvenir | Cra 5 #10-23 | 3001234567 | 2025-03-15 |
| Juan Pérez | 1069876543 | Villa Mariana | Cll 8 #3-45 | 3109876543 | 2025-03-16 |
| Ana Gómez | 1065551234 | San Francisco | Cra 3 #12-10 | | 2025-03-17 |

### Paso 1: EXTRACT → raw

```sql
-- raw.upload_57
INSERT INTO raw.upload_57 (_row_json, _row_number) VALUES
  ('{"Nombre":"María López","Cédula":"1061234567","Barrio":"El Porvenir","Dirección":"Cra 5 #10-23","Teléfono":"3001234567","Fecha_Registro":"2025-03-15"}', 1),
  ('{"Nombre":"Juan Pérez","Cédula":"1069876543","Barrio":"Villa Mariana","Dirección":"Cll 8 #3-45","Teléfono":"3109876543","Fecha_Registro":"2025-03-16"}', 2),
  ('{"Nombre":"Ana Gómez","Cédula":"1065551234","Barrio":"San Francisco","Dirección":"Cra 3 #12-10","Teléfono":"","Fecha_Registro":"2025-03-17"}', 3);

-- raw.upload_metadata
INSERT INTO raw.upload_metadata (upload_id, raw_table, columns_json, total_rows) VALUES (
  57,
  'raw.upload_57',
  '[
    {"name":"Nombre","detected_type":"TEXT","sample":["María López","Juan Pérez","Ana Gómez"]},
    {"name":"Cédula","detected_type":"INTEGER","sample":["1061234567","1069876543","1065551234"]},
    {"name":"Barrio","detected_type":"TEXT","sample":["El Porvenir","Villa Mariana","San Francisco"]},
    {"name":"Dirección","detected_type":"TEXT","sample":["Cra 5 #10-23","Cll 8 #3-45","Cra 3 #12-10"]},
    {"name":"Teléfono","detected_type":"TEXT","sample":["3001234567","3109876543",""]},
    {"name":"Fecha_Registro","detected_type":"DATE","sample":["2025-03-15","2025-03-16","2025-03-17"]}
  ]',
  3
);
```

### Paso 2: TRANSFORM → staging (con geo_mode='join' por barrio)

**Configuración del usuario:**
```json
{
  "geo_mode": "join",
  "geo_config": {
    "join_layer": "planeacion_barrios_urbanos",
    "join_field_excel": "Barrio",
    "join_field_layer": "nombre",
    "join_geom_type": "centroid"
  },
  "column_mapping": [
    {"source": "Nombre", "target": "nombre", "type": "TEXT"},
    {"source": "Cédula", "target": "cedula", "type": "BIGINT"},
    {"source": "Barrio", "target": "barrio", "type": "TEXT"},
    {"source": "Dirección", "target": "direccion", "type": "TEXT"},
    {"source": "Teléfono", "target": "telefono", "type": "TEXT"},
    {"source": "Fecha_Registro", "target": "fecha_registro", "type": "DATE"}
  ]
}
```

**Tabla staging resultante:**

```sql
-- staging.stg_57
CREATE TABLE staging.stg_57 (
  _row_id        SERIAL PRIMARY KEY,
  _source_row    INTEGER NOT NULL,
  _status        VARCHAR(20) DEFAULT 'ok',
  _status_detail TEXT,
  _matched       BOOLEAN DEFAULT FALSE,
  nombre         TEXT,
  cedula         BIGINT,
  barrio         TEXT,
  direccion      TEXT,
  telefono       TEXT,
  fecha_registro DATE,
  geom           GEOMETRY(Geometry, 4326)
);

-- Después del JOIN:
-- María López → _matched=TRUE, geom=centroide de "El Porvenir"
-- Juan Pérez → _matched=TRUE, geom=centroide de "Villa Mariana"
-- Ana Gómez → _matched=FALSE, geom=NULL (barrio "San Francisco" no existe en barrios_urbanos)
```

### Paso 3: VALIDATE → revisión

El frontend muestra:
- **3 filas totales, 2 georreferenciadas, 1 sin geometría**
- Ana Gómez aparece con `_status='warning'` y `_status_detail='Barrio no encontrado en capa base'`
- Mini-mapa muestra 2 puntos sobre los barrios El Porvenir y Villa Mariana

### Paso 4: LOAD → production

Si el usuario aprueba:
```sql
-- public.vivienda_beneficiarios_1712900123
CREATE TABLE public.vivienda_beneficiarios_1712900123 (
  gid            SERIAL PRIMARY KEY,
  nombre         TEXT,
  cedula         BIGINT,
  barrio         TEXT,
  direccion      TEXT,
  telefono       TEXT,
  fecha_registro DATE,
  geom           GEOMETRY(Geometry, 4326)
);

INSERT INTO public.vivienda_beneficiarios_1712900123
  (nombre, cedula, barrio, direccion, telefono, fecha_registro, geom)
SELECT nombre, cedula, barrio, direccion, telefono, fecha_registro, geom
FROM staging.stg_57
WHERE _status != 'error';

-- Registrar en geo_tablas
INSERT INTO public.geo_tablas (...) VALUES (...);
```

---

## 9. DECISIONES TÉCNICAS CLAVE

| Decisión | Alternativas | Elección | Razón |
|----------|-------------|----------|-------|
| Formato de raw | Columnas TEXT vs JSONB | **JSONB** | Único esquema para cualquier archivo. Permite reprocesamiento sin conocer la estructura por adelantado. |
| Procesamiento | Síncrono vs async (Bull/queue) | **Síncrono** (por ahora) | Archivos de hasta 50MB no requieren cola. Si el proyecto crece, migrar a Bull sin cambiar la lógica. |
| Tipos de columnas | Auto-inferidos vs manuales | **Inferidos + editables** | Se detectan automáticamente pero el usuario puede corregir desde el frontend. |
| Promoción | Automática vs manual | **Manual con opción auto** | Por defecto requiere aprobación. Admins pueden activar auto-promoción para uploads de confianza. |
| Limpieza de schemas | Manual vs cron | **Cron diario** | Eliminar tablas raw/staging de uploads completados hace más de 30 días. |

---

## 10. COMPATIBILIDAD CON SISTEMA ACTUAL

**El sistema actual NO se rompe.** La migración es aditiva:

1. Los uploads existentes quedan con `etl_status = 'legacy'` y siguen funcionando.
2. El frontend actual (`UploadPage.jsx`) sigue usando `POST /api/uploads` — se añade un flag para el modo nuevo.
3. `geodata.service.js` sigue sirviendo datos desde `public.*` — las tablas promovidas son idénticas a las actuales.
4. El nuevo flujo ETL es **opt-in**: se activa por secretaría o por tipo de archivo.

---

## 11. MÉTRICAS DE ÉXITO

| Métrica | Valor actual | Objetivo |
|---------|-------------|---------|
| Datos perdidos por error en upload | No medido | 0 (raw preserva todo) |
| Tiempo para reprocesar un upload | Imposible (re-subir archivo) | < 30 segundos |
| Filas con geometría incorrecta | No validado | Detectadas antes de producción |
| Uploads sin revisión en producción | 100% | 0% (requiere validación) |

---

## RESUMEN DE ARCHIVOS A CREAR/MODIFICAR

### Archivos nuevos (7)
| # | Archivo | Líneas aprox. |
|---|---------|--------------|
| 1 | `backend/src/db/migrations/002_etl_schemas.sql` | ~120 |
| 2 | `backend/src/services/etl/extractor.js` | ~100 |
| 3 | `backend/src/services/etl/transformer.js` | ~150 |
| 4 | `backend/src/services/etl/georeferencer.js` | ~200 |
| 5 | `backend/src/services/etl/validator.js` | ~80 |
| 6 | `backend/src/services/etl/promoter.js` | ~100 |
| 7 | `backend/src/services/etl.service.js` | ~150 |
| 8 | `backend/src/routes/etl.routes.js` | ~25 |
| 9 | `backend/src/controllers/etl.controller.js` | ~80 |

### Archivos a modificar (3)
| # | Archivo | Cambio |
|---|---------|--------|
| 1 | `backend/src/services/uploads.service.js` | `processUpload()` delega a extractor |
| 2 | `backend/src/server.js` | Montar `/api/etl` |
| 3 | `backend/src/middleware/validate.js` | Schemas Zod para ETL |

### Frontend (Fase 4, posterior)
| # | Archivo | Tipo |
|---|---------|------|
| 1 | `pages/ProcessingPage.jsx` | NUEVO |
| 2 | `pages/ProcessingPage.css` | NUEVO |
| 3 | `organisms/ColumnMapper/` | NUEVO |
| 4 | `organisms/GeoConfig/` | NUEVO |
| 5 | `organisms/DataPreview/` | NUEVO |
| 6 | `organisms/StagingMap/` | NUEVO |
| 7 | `pages/UploadPage.jsx` | MODIFICAR |
| 8 | `services/api.js` | MODIFICAR (agregar etlService) |
| 9 | `App.jsx` | MODIFICAR (nueva ruta) |
