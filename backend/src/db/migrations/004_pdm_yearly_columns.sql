-- 004_pdm_yearly_columns.sql
-- Agregar columnas faltantes para años 2026/2027 en pdm_metas

ALTER TABLE pdm_metas ADD COLUMN IF NOT EXISTS eficiencia_2026 NUMERIC;
ALTER TABLE pdm_metas ADD COLUMN IF NOT EXISTS eficiencia_2027 NUMERIC;
ALTER TABLE pdm_metas ADD COLUMN IF NOT EXISTS observaciones_2026 TEXT;
ALTER TABLE pdm_metas ADD COLUMN IF NOT EXISTS observaciones_2027 TEXT;
ALTER TABLE pdm_metas ADD COLUMN IF NOT EXISTS compromisos_2026 TEXT;
ALTER TABLE pdm_metas ADD COLUMN IF NOT EXISTS compromisos_2027 TEXT;
