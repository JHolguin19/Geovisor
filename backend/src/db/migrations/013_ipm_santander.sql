-- Migración 013: IPM Santander — Índice de Pobreza Multidimensional
-- Reprojectar de SRID 4686 (MAGNA-SIRGAS) a 4326 (WGS84)
-- y registrar en geo_tablas + capas

ALTER TABLE ipmsantander
  ALTER COLUMN geom TYPE geometry(MultiPolygon, 4326)
  USING ST_Transform(geom, 4326);

ALTER TABLE ipmsantander ENABLE ROW LEVEL SECURITY;

INSERT INTO geo_tablas (nombre_tabla, secretaria_id, descripcion, columna_geometria, srid, tipo_geometria, publica)
VALUES ('ipmsantander', 'salud', 'Índice de Pobreza Multidimensional y embarazo a temprana edad — Santander de Quilichao', 'geom', 4326, 'polygon', true)
ON CONFLICT (nombre_tabla) DO NOTHING;

INSERT INTO capas (id, nombre, secretaria_id, tabla_postgis, tipo_geometria, activa, visible_defecto, queryable, descripcion)
VALUES ('ipm_santander', 'IPM — Pobreza Multidimensional', 'salud', 'ipmsantander', 'polygon', true, false, true, 'Índice de Pobreza Multidimensional y embarazo a temprana edad por vereda/barrio')
ON CONFLICT (id) DO NOTHING;
