-- Migration 018: Zona Rural 2025
-- Tabla: planeacion_zonarural2025
-- Fuente: QGIS local "Planeacion_zonarural2025_actualizado"
-- Registros: 18,481 | Predios unicos (CODIGO): 15,656 | Veredas: 103
-- NOTA: Los datos fueron importados manualmente en batches via supabase db query --linked
--       Este archivo solo documenta el esquema.

CREATE TABLE IF NOT EXISTS public.planeacion_zonarural2025 (
    id             bigint PRIMARY KEY,
    geom           geometry(MultiPolygon,4326),
    "CODIGO"       character varying(30),
    "VEREDA_COD"   character varying(17),
    "NUMERO_SUB"   bigint,
    "CODIGO_ANT"   character varying(20),
    "USUARIO_LO"   character varying(100),
    "FECHA_LOG"    date,
    "GLOBALID"     character varying(38),
    "GLOBALID_S"   character varying(38),
    "SHAPE_Leng"   double precision,
    "SHAPE_Area"   double precision,
    codigo_mun     character varying(5),
    "CODIGO_DEP"   character varying(2),
    nombre         character varying(100),
    "shape_Le_1"   numeric,
    "shape_Ar_1"   numeric,
    area_hecta     numeric,
    poblacion      numeric,
    delito         character varying(50)
);

CREATE INDEX IF NOT EXISTS idx_zonarural2025_geom   ON public.planeacion_zonarural2025 USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_zonarural2025_nombre ON public.planeacion_zonarural2025 (nombre);
CREATE INDEX IF NOT EXISTS idx_zonarural2025_codigo ON public.planeacion_zonarural2025 ("CODIGO");

ALTER TABLE public.planeacion_zonarural2025 ENABLE ROW LEVEL SECURITY;

INSERT INTO public.geo_tablas (nombre_tabla, secretaria_id, descripcion, columna_geometria, srid, tipo_geometria, total_features, publica)
VALUES (
  'planeacion_zonarural2025',
  'planeacion',
  'Zona Rural Santander de Quilichao 2025 - predios rurales por vereda',
  'geom',
  4326,
  'MultiPolygon',
  18481,
  true
)
ON CONFLICT (nombre_tabla) DO UPDATE SET
  descripcion    = EXCLUDED.descripcion,
  total_features = EXCLUDED.total_features;
