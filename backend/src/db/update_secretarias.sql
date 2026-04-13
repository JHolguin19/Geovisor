UPDATE secretarias SET nombre = 'Sistema de Información Geográfica' WHERE id = 'sig';
UPDATE secretarias SET nombre = 'Secretaría de Planeación, Ordenamiento Territorial y Vivienda', short_name = 'Planeación' WHERE id = 'planeacion';
UPDATE secretarias SET nombre = 'Secretaría de Gobierno, Paz y Convivencia', short_name = 'Gobierno' WHERE id = 'gobierno';
UPDATE secretarias SET nombre = 'Secretaría de Educación y Cultura', short_name = 'Educación y Cultura' WHERE id = 'educacion';
UPDATE secretarias SET nombre = 'Secretaría de Bienestar Social y Participación Comunitaria', short_name = 'Bienestar Social' WHERE id = 'desarrollo_social';
UPDATE secretarias SET nombre = 'Secretaría de Fomento Económico y Agroambiental', short_name = 'Fomento Económico' WHERE id = 'ambiente';
UPDATE secretarias SET nombre = 'Secretaría de Salud' WHERE id = 'salud';
UPDATE secretarias SET nombre = 'Secretaría de Hacienda' WHERE id = 'hacienda';
UPDATE secretarias SET nombre = 'Instituto Municipal para el Deporte y la Recreación', short_name = 'Deporte y Recreación' WHERE id = 'deportes';
UPDATE secretarias SET nombre = 'Secretaría de Movilidad', short_name = 'Movilidad' WHERE id = 'transito';
UPDATE secretarias SET nombre = 'Departamento Administrativo de Desarrollo Institucional', short_name = 'Desarrollo Institucional' WHERE id = 'talento_humano';

DELETE FROM secretarias WHERE id IN ('cultura', 'juridica', 'seguridad');

INSERT INTO secretarias (id, nombre, short_name, codigo, color, descripcion, tiene_mapa, activa, orden)
VALUES
  ('gestion_riesgo', 'Oficina de Gestión del Riesgo de Desastres', 'Gestión del Riesgo', 'GRD', '#37474F', 'Prevención y atención ante desastres y emergencias.', FALSE, TRUE, 12),
  ('merquilichao', 'Merquilichao', 'Merquilichao', 'MER', '#F57F17', 'Plaza de mercado y comercio municipal.', FALSE, TRUE, 14)
ON CONFLICT (id) DO NOTHING;
