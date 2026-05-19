-- Migration 022: Tabla predios_avaluos_urbanos_2026
-- Datos catastrales urbanos con columnas renombradas para análisis.
-- Fuente: Predios_avaluos_urbanos_con_barrio_2026 (PostgreSQL local / QGIS)
-- Columnas clave:
--   predialu_5 (numeric)  = avaluo_nuevo
--   predialu10 (numeric)  = avaluo_antiguo
--   predialu_3 (varchar)  = propietario
--   nombre     (varchar)  = barrio

-- ── 1. Tabla principal ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.predios_avaluos_urbanos_2026 (
  id              BIGINT PRIMARY KEY,
  geom            GEOMETRY(MultiPolygon, 4326),
  codigo          VARCHAR(30),
  barrio          VARCHAR(250),
  propietario     VARCHAR(254),
  avaluo_nuevo    NUMERIC,
  avaluo_antiguo  NUMERIC,
  area_predio     DOUBLE PRECISION,
  area_construida BIGINT
);

-- ── 2. Índices ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_urbano_avaluos_geom
  ON public.predios_avaluos_urbanos_2026 USING GIST (geom);

CREATE INDEX IF NOT EXISTS idx_urbano_avaluos_barrio
  ON public.predios_avaluos_urbanos_2026 (barrio);

CREATE INDEX IF NOT EXISTS idx_urbano_avaluos_codigo
  ON public.predios_avaluos_urbanos_2026 (codigo);

CREATE INDEX IF NOT EXISTS idx_urbano_avaluos_nuevo
  ON public.predios_avaluos_urbanos_2026 (avaluo_nuevo)
  WHERE avaluo_nuevo IS NOT NULL;

-- ── 3. RLS ─────────────────────────────────────────────────────────────────
ALTER TABLE public.predios_avaluos_urbanos_2026 ENABLE ROW LEVEL SECURITY;

-- ── 4. Registro en geo_tablas ──────────────────────────────────────────────
INSERT INTO public.geo_tablas (
  nombre_tabla, secretaria_id,
  columna_geometria, tipo_geometria, publica, descripcion
) VALUES (
  'predios_avaluos_urbanos_2026',
  'planeacion',
  'geom',
  'MultiPolygon',
  false,
  'Avalúos catastrales urbanos 2026: comparativo nuevo/antiguo, propietario y barrio'
) ON CONFLICT (nombre_tabla) DO NOTHING;
