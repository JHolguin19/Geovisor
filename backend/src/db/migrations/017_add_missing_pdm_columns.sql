-- Migration 017: Add missing columns to pdm_metas
-- Columns needed for complete PDM data: ponderado_avance per year, eficiencia 2026/2027, obs/compromisos 2026/2027

BEGIN;

-- Ponderado avance per year (meta_fisica_Y / meta_cuatrienio)
ALTER TABLE pdm_metas ADD COLUMN IF NOT EXISTS ponderado_avance_2024 numeric;
ALTER TABLE pdm_metas ADD COLUMN IF NOT EXISTS ponderado_avance_2025 numeric;
ALTER TABLE pdm_metas ADD COLUMN IF NOT EXISTS ponderado_avance_2026 numeric;
ALTER TABLE pdm_metas ADD COLUMN IF NOT EXISTS ponderado_avance_2027 numeric;

-- Eficiencia 2026/2027
ALTER TABLE pdm_metas ADD COLUMN IF NOT EXISTS eficiencia_2026 numeric;
ALTER TABLE pdm_metas ADD COLUMN IF NOT EXISTS eficiencia_2027 numeric;

-- Observaciones / Compromisos 2026/2027
ALTER TABLE pdm_metas ADD COLUMN IF NOT EXISTS observaciones_2026 text;
ALTER TABLE pdm_metas ADD COLUMN IF NOT EXISTS compromisos_2026 text;
ALTER TABLE pdm_metas ADD COLUMN IF NOT EXISTS observaciones_2027 text;
ALTER TABLE pdm_metas ADD COLUMN IF NOT EXISTS compromisos_2027 text;

COMMIT;
