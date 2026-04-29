-- Migración 012: Registrar capas de Secretaría de Salud en geo_tablas y capas
-- Tablas subidas desde BD local: Cuadrantes_salud, IPS_salud, MICROTERRITORIOS_salud,
--   Territorios_salud, veredas_salud, zonainfluenciario30m_salud

-- 1. Habilitar RLS en las nuevas tablas
ALTER TABLE "Cuadrantes_salud" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IPS_salud" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MICROTERRITORIOS_salud" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Territorios_salud" ENABLE ROW LEVEL SECURITY;
ALTER TABLE veredas_salud ENABLE ROW LEVEL SECURITY;
ALTER TABLE zonainfluenciario30m_salud ENABLE ROW LEVEL SECURITY;

-- 2. Registrar en geo_tablas
INSERT INTO geo_tablas (nombre_tabla, secretaria_id, descripcion, columna_geometria, srid, tipo_geometria, publica) VALUES
  ('Cuadrantes_salud',           'salud', 'Cuadrantes de salud del municipio',                 'geom', 4326, 'polygon', true),
  ('IPS_salud',                  'salud', 'Instituciones Prestadoras de Salud (IPS)',           'geom', 4326, 'point',   true),
  ('MICROTERRITORIOS_salud',     'salud', 'Microterritorios de salud',                          'geom', 4326, 'polygon', true),
  ('Territorios_salud',          'salud', 'Territorios de salud',                               'geom', 4326, 'polygon', true),
  ('veredas_salud',              'salud', 'Veredas del municipio — secretaría salud',           'geom', 4326, 'polygon', true),
  ('zonainfluenciario30m_salud', 'salud', 'Zona de influencia 30m de instituciones de salud',  'geom', 4326, 'polygon', true)
ON CONFLICT (nombre_tabla) DO NOTHING;

-- 3. Registrar en capas
INSERT INTO capas (id, nombre, secretaria_id, tabla_postgis, tipo_geometria, activa, visible_defecto, queryable, descripcion) VALUES
  ('cuadrantes_salud',       'Cuadrantes de Salud',     'salud', 'Cuadrantes_salud',           'polygon', true, false, true, 'División en cuadrantes del sistema de salud municipal'),
  ('ips_salud',              'IPS',                     'salud', 'IPS_salud',                  'point',   true, false, true, 'Instituciones Prestadoras de Salud'),
  ('microterritorios_salud', 'Microterritorios',        'salud', 'MICROTERRITORIOS_salud',     'polygon', true, false, true, 'Microterritorios del sistema de salud'),
  ('territorios_salud',      'Territorios de Salud',    'salud', 'Territorios_salud',          'polygon', true, false, true, 'Territorios de atención en salud'),
  ('veredas_salud',          'Veredas',                 'salud', 'veredas_salud',              'polygon', true, false, true, 'Veredas del municipio con datos de salud'),
  ('zona_influencia_salud',  'Zona de Influencia 30m',  'salud', 'zonainfluenciario30m_salud', 'polygon', true, false, true, 'Zona de influencia de 30m de instituciones de salud')
ON CONFLICT (id) DO NOTHING;
