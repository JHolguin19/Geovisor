-- Tabla para almacenar refresh tokens con rotation
-- Ejecutar en Supabase SQL Editor o psql

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);

-- Limpiar tokens expirados periódicamente (ejecutar como cron o al inicio)
-- DELETE FROM refresh_tokens WHERE expires_at < NOW();
