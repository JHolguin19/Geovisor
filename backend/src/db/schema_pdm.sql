-- ============================================================
-- PDM — Plan de Desarrollo Municipal 2024-2027
-- Santander de Quilichao, Cauca
-- ============================================================

CREATE TABLE IF NOT EXISTS pdm_metas (
  id                      SERIAL PRIMARY KEY,
  meta_num                INTEGER,              -- Número de meta (1-207)
  cod_dependencia         INTEGER,
  num_pilar               INTEGER,              -- 1-6
  nom_pilar               TEXT,
  macrometa               TEXT,
  cod_sector              INTEGER,
  nom_sector              TEXT,
  cod_programa            INTEGER,
  nombre_programa         TEXT,
  cod_bpin                TEXT,
  acciones_plan           TEXT,
  unidad_medida           TEXT,
  linea_base              TEXT,
  anio_base               INTEGER,              -- 2023
  codigo_producto         INTEGER,
  indicador_meta          TEXT,
  secretaria              TEXT NOT NULL,        -- Nombre exacto del Excel
  descripcion_meta        TEXT,
  meta_cuatrienio         NUMERIC,
  tipo_ponderado          TEXT,                 -- 'Acumulativo' | 'No acumulativo'

  -- Metas físicas por año (NULL = NP = No Programado)
  meta_pdm_2024           NUMERIC,
  meta_fisica_2024        NUMERIC,
  meta_pdm_2025           NUMERIC,
  meta_fisica_2025        NUMERIC,
  meta_pdm_2026           NUMERIC,
  meta_fisica_2026        NUMERIC,
  meta_pdm_2027           NUMERIC,
  meta_fisica_2027        NUMERIC,

  -- KPIs principales (valores entre 0 y 1)
  avance_fisico           NUMERIC,              -- Avance físico global
  avance_financiero       NUMERIC,              -- Avance financiero global
  cumplimiento_cuatrienio NUMERIC,              -- % cumplimiento 4 años
  ponderado_cuatrienio    NUMERIC,              -- Ponderado avance cuatrienio
  eficiencia_2024         NUMERIC,
  eficiencia_2025         NUMERIC,

  -- Presupuesto por año (campos clave como JSONB)
  presupuesto_2024        JSONB DEFAULT '{}',
  presupuesto_2025        JSONB DEFAULT '{}',
  presupuesto_2026        JSONB DEFAULT '{}',
  presupuesto_2027        JSONB DEFAULT '{}',

  -- Observaciones y compromisos
  observaciones_2024      TEXT,
  compromisos_2024        TEXT,
  observaciones_2025      TEXT,
  compromisos_2025        TEXT,

  updated_at              TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pdm_secretaria   ON pdm_metas(secretaria);
CREATE INDEX IF NOT EXISTS idx_pdm_pilar        ON pdm_metas(num_pilar);
CREATE INDEX IF NOT EXISTS idx_pdm_meta_num     ON pdm_metas(meta_num);
CREATE INDEX IF NOT EXISTS idx_pdm_avance_fisico ON pdm_metas(avance_fisico);
