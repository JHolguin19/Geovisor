-- ============================================================
-- Migración 019 — Dirección de Aguas y Saneamiento Básico
-- Capas: veredas_acueductos, redAcueducto, estructura_acueducto
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────
-- 1. TABLA: planeacion_aguas_veredas_acueductos
-- ─────────────────────────────────────────────
DROP TABLE IF EXISTS public.planeacion_aguas_veredas_acueductos;
CREATE TABLE public.planeacion_aguas_veredas_acueductos (
    id               SERIAL PRIMARY KEY,
    geom             geometry(MultiPolygon, 4326),
    "VEREDA"         VARCHAR,
    "SISTEMA_ACUEDUCTO" VARCHAR,
    "NOMBRE_ACUEDUCTO"  VARCHAR
);

CREATE INDEX idx_aguas_veredas_geom
    ON public.planeacion_aguas_veredas_acueductos USING GIST(geom);
CREATE INDEX idx_aguas_veredas_sistema
    ON public.planeacion_aguas_veredas_acueductos("SISTEMA_ACUEDUCTO");
CREATE INDEX idx_aguas_veredas_vereda
    ON public.planeacion_aguas_veredas_acueductos("VEREDA");

ALTER TABLE public.planeacion_aguas_veredas_acueductos ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- 2. TABLA: planeacion_aguas_redAcueducto
-- ─────────────────────────────────────────────
DROP TABLE IF EXISTS public."planeacion_aguas_redAcueducto";
CREATE TABLE public."planeacion_aguas_redAcueducto" (
    id          VARCHAR PRIMARY KEY,
    geom        geometry(LineString, 4326),
    "Name"      VARCHAR,
    descriptio  VARCHAR,
    layer       VARCHAR,
    "Longitud"  DOUBLE PRECISION
);

CREATE INDEX idx_aguas_red_geom
    ON public."planeacion_aguas_redAcueducto" USING GIST(geom);

ALTER TABLE public."planeacion_aguas_redAcueducto" ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- 3. TABLA: planeacion_aguas_estructura_acueducto
-- ─────────────────────────────────────────────
DROP TABLE IF EXISTS public.planeacion_aguas_estructura_acueducto;
CREATE TABLE public.planeacion_aguas_estructura_acueducto (
    id          VARCHAR PRIMARY KEY,
    geom        geometry(Point, 4326),
    "Name"      VARCHAR,
    descriptio  VARCHAR,
    layer       VARCHAR
);

CREATE INDEX idx_aguas_estructura_geom
    ON public.planeacion_aguas_estructura_acueducto USING GIST(geom);

ALTER TABLE public.planeacion_aguas_estructura_acueducto ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- 4. Insertar secretaría aguas (si no existe)
-- ─────────────────────────────────────────────
INSERT INTO public.secretarias (id, nombre, short_name, codigo, color, descripcion, layers_key, tiene_mapa, activa, orden)
VALUES (
    'aguas',
    'Dirección de Aguas y Saneamiento Básico',
    'Aguas',
    'AGUA',
    '#0277BD',
    'Infraestructura de acueducto rural, redes de conducción y estructuras hidráulicas.',
    'aguas',
    true,
    true,
    15
)
ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    short_name = EXCLUDED.short_name,
    tiene_mapa = true,
    activa = true;

-- ─────────────────────────────────────────────
-- 5. Registrar en geo_tablas
-- ─────────────────────────────────────────────
DELETE FROM public.geo_tablas
WHERE nombre_tabla IN (
    'planeacion_aguas_veredas_acueductos',
    'planeacion_aguas_redAcueducto',
    'planeacion_aguas_estructura_acueducto'
);

INSERT INTO public.geo_tablas (nombre_tabla, descripcion, secretaria_id, columna_geometria, srid, tipo_geometria, publica)
VALUES
    ('planeacion_aguas_veredas_acueductos',
     'Veredas con sistemas de acueducto rural',
     'aguas', 'geom', 4326, 'MultiPolygon', true),
    ('planeacion_aguas_redAcueducto',
     'Red de acueducto rural — líneas de conducción',
     'aguas', 'geom', 4326, 'LineString', true),
    ('planeacion_aguas_estructura_acueducto',
     'Estructuras de acueducto: bocatomas, tanques, desarenadores',
     'aguas', 'geom', 4326, 'Point', true);

COMMIT;
