-- ============================================================
-- SCHEMA GEOVISOR MUNICIPAL — Base de datos: qgis
-- ============================================================

-- 1. SECRETARÍAS
-- ============================================================
CREATE TABLE IF NOT EXISTS secretarias (
  id          VARCHAR(50)  PRIMARY KEY,
  nombre      VARCHAR(200) NOT NULL,
  short_name  VARCHAR(100),
  codigo      VARCHAR(5),
  color       VARCHAR(7),
  descripcion TEXT,
  layers_key  VARCHAR(100),
  tiene_mapa  BOOLEAN      DEFAULT FALSE,
  activa      BOOLEAN      DEFAULT TRUE,
  orden       INTEGER      DEFAULT 0,
  created_at  TIMESTAMP    DEFAULT NOW()
);

-- 2. USUARIOS
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id              SERIAL       PRIMARY KEY,
  username        VARCHAR(100) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  nombre_completo VARCHAR(200),
  email           VARCHAR(200),
  rol             VARCHAR(50)  NOT NULL DEFAULT 'lector',
  secretaria_id   VARCHAR(50)  REFERENCES secretarias(id) ON DELETE SET NULL,
  activo          BOOLEAN      DEFAULT TRUE,
  last_login      TIMESTAMP,
  created_at      TIMESTAMP    DEFAULT NOW()
);

-- 3. TABLAS POSTGIS DISPONIBLES (reemplaza ALLOWED_TABLES en geodata.js)
-- ============================================================
CREATE TABLE IF NOT EXISTS geo_tablas (
  id                 SERIAL       PRIMARY KEY,
  nombre_tabla       VARCHAR(200) UNIQUE NOT NULL,
  secretaria_id      VARCHAR(50)  REFERENCES secretarias(id) ON DELETE SET NULL,
  descripcion        TEXT,
  columna_geometria  VARCHAR(100) DEFAULT 'geom',
  srid               INTEGER      DEFAULT 4326,
  tipo_geometria     VARCHAR(50),
  total_features     INTEGER,
  publica            BOOLEAN      DEFAULT FALSE,
  upload_id          INTEGER,     -- se llena cuando viene de un upload
  created_at         TIMESTAMP    DEFAULT NOW()
);

-- 4. CAPAS (reemplaza layers.js hardcodeado)
-- ============================================================
CREATE TABLE IF NOT EXISTS capas (
  id                  VARCHAR(100) PRIMARY KEY,
  nombre              VARCHAR(200) NOT NULL,
  secretaria_id       VARCHAR(50)  REFERENCES secretarias(id) ON DELETE CASCADE,
  tabla_postgis       VARCHAR(200) NOT NULL REFERENCES geo_tablas(nombre_tabla) ON DELETE CASCADE,
  color               VARCHAR(7),
  visible_defecto     BOOLEAN      DEFAULT FALSE,
  queryable           BOOLEAN      DEFAULT TRUE,
  z_index             INTEGER      DEFAULT 1,
  descripcion         TEXT,
  columnas_consulta   TEXT,        -- cols separadas por coma
  tipo_geometria      VARCHAR(50), -- polygon, point, line
  activa              BOOLEAN      DEFAULT TRUE,
  orden               INTEGER      DEFAULT 0,
  created_at          TIMESTAMP    DEFAULT NOW(),
  created_by          INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL
);

-- 5. CAMPOS DEL POPUP POR CAPA
-- ============================================================
CREATE TABLE IF NOT EXISTS capas_popup_fields (
  id        SERIAL       PRIMARY KEY,
  capa_id   VARCHAR(100) REFERENCES capas(id) ON DELETE CASCADE,
  campo     VARCHAR(100) NOT NULL,
  etiqueta  VARCHAR(200) NOT NULL,
  formato   VARCHAR(50)  DEFAULT 'text',  -- text, currency, date, number
  orden     INTEGER      DEFAULT 0
);

-- 6. UPLOADS DE DATOS
-- ============================================================
CREATE TABLE IF NOT EXISTS uploads (
  id               SERIAL       PRIMARY KEY,
  secretaria_id    VARCHAR(50)  REFERENCES secretarias(id) ON DELETE SET NULL,
  usuario_id       INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL,
  nombre_archivo   VARCHAR(300) NOT NULL,
  tabla_destino    VARCHAR(200),
  tipo_archivo     VARCHAR(50),  -- csv, excel, geojson, shapefile
  columna_lat      VARCHAR(100),
  columna_lon      VARCHAR(100),
  estado           VARCHAR(50)  DEFAULT 'pendiente', -- pendiente, procesando, completado, error
  filas_procesadas INTEGER      DEFAULT 0,
  filas_error      INTEGER      DEFAULT 0,
  mensaje_error    TEXT,
  created_at       TIMESTAMP    DEFAULT NOW(),
  completed_at     TIMESTAMP
);

-- 7. REFRESH TOKENS (autenticación JWT)
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         SERIAL       PRIMARY KEY,
  user_id    INTEGER      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token      VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP    NOT NULL,
  created_at TIMESTAMP    DEFAULT NOW()
);

-- FK circular: geo_tablas.upload_id → uploads.id
ALTER TABLE geo_tablas
  ADD CONSTRAINT fk_geo_tablas_upload
  FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE SET NULL;

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_capas_secretaria    ON capas(secretaria_id);
CREATE INDEX IF NOT EXISTS idx_capas_tabla         ON capas(tabla_postgis);
CREATE INDEX IF NOT EXISTS idx_uploads_secretaria  ON uploads(secretaria_id);
CREATE INDEX IF NOT EXISTS idx_uploads_estado      ON uploads(estado);
CREATE INDEX IF NOT EXISTS idx_usuarios_secretaria ON usuarios(secretaria_id);
CREATE INDEX IF NOT EXISTS idx_geo_tablas_secretaria ON geo_tablas(secretaria_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token  ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user   ON refresh_tokens(user_id);
