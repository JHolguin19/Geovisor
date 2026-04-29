-- Migración 011: Reprojectar predios_2025_m y Gimnasiosbiosaludables de sus SRID originales a WGS84 (4326)
-- predios_2025_m:      SRID 9377 (MAGNA-SIRGAS 2018 / Colombia Single Zone) → 4326
-- Gimnasiosbiosaludables: SRID 3115 (MAGNA-SIRGAS / Colombia West zone)     → 4326

-- 1. predios_2025_m
ALTER TABLE predios_2025_m
  ALTER COLUMN geom TYPE geometry(MultiPolygon, 4326)
  USING ST_Transform(geom, 4326);

UPDATE geo_tablas SET srid = 4326 WHERE nombre_tabla = 'predios_2025_m';

-- 2. Gimnasiosbiosaludables
ALTER TABLE "Gimnasiosbiosaludables"
  ALTER COLUMN geom TYPE geometry(Point, 4326)
  USING ST_Transform(geom, 4326);

UPDATE geo_tablas SET srid = 4326 WHERE nombre_tabla = 'Gimnasiosbiosaludables';
