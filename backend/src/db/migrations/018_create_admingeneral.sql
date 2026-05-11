-- Migración 018: Crear usuario admingeneral + degradar usuarios existentes a lector
-- Ejecutar con: supabase db query --linked -f backend/src/db/migrations/018_create_admingeneral.sql

-- 1. Degradar TODOS los usuarios existentes a rol 'lector' (solo lectura)
UPDATE usuarios SET rol = 'lector' WHERE rol != 'lector';

-- 2. Insertar nuevo usuario admingeneral con acceso total
--    Hash bcrypt (cost 12) de la contraseña: juanholguin
INSERT INTO usuarios (username, password_hash, nombre_completo, rol, activo)
VALUES (
  'admingeneral',
  '$2a$12$s3unZEbBgvRH3Xdnj1dFxOd9MQ0p2RsrMyE479kqfhe0XZIkQOzmG',
  'Administrador General',
  'admin',
  true
)
ON CONFLICT (username) DO UPDATE
  SET password_hash = EXCLUDED.password_hash,
      rol           = EXCLUDED.rol,
      activo        = EXCLUDED.activo;
