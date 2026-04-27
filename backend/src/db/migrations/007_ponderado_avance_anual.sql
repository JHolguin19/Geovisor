-- 007_ponderado_avance_anual.sql
-- Corrige avance_fisico (sobreescrito incorrectamente por uploads) y agrega
-- columnas ponderado_avance_Y para seguimiento físico anual real.

-- 1. Restaurar avance_fisico desde ponderado_cuatrienio (fuente correcta del Excel)
UPDATE pdm_metas
SET avance_fisico = ponderado_cuatrienio
WHERE ponderado_cuatrienio IS NOT NULL;

-- 2. Agregar columnas de ponderado físico por año
ALTER TABLE pdm_metas ADD COLUMN IF NOT EXISTS ponderado_avance_2024 NUMERIC;
ALTER TABLE pdm_metas ADD COLUMN IF NOT EXISTS ponderado_avance_2025 NUMERIC;
ALTER TABLE pdm_metas ADD COLUMN IF NOT EXISTS ponderado_avance_2026 NUMERIC;
ALTER TABLE pdm_metas ADD COLUMN IF NOT EXISTS ponderado_avance_2027 NUMERIC;

-- 3. Poblar ponderado_avance_Y:
--    Acumulativo:     meta_fisica_Y / meta_cuatrienio
--    No acumulativo:  meta_fisica_Y / SUM(todos meta_pdm_Y)   (denominador = total programado 4 años)
UPDATE pdm_metas
SET
  ponderado_avance_2024 = CASE
    WHEN tipo_ponderado = 'Acumulativo'
      THEN COALESCE(meta_fisica_2024, 0) / NULLIF(meta_cuatrienio, 0)
    ELSE
      COALESCE(meta_fisica_2024, 0) / NULLIF(
        COALESCE(meta_pdm_2024,0) + COALESCE(meta_pdm_2025,0) +
        COALESCE(meta_pdm_2026,0) + COALESCE(meta_pdm_2027,0), 0)
  END,
  ponderado_avance_2025 = CASE
    WHEN tipo_ponderado = 'Acumulativo'
      THEN COALESCE(meta_fisica_2025, 0) / NULLIF(meta_cuatrienio, 0)
    ELSE
      COALESCE(meta_fisica_2025, 0) / NULLIF(
        COALESCE(meta_pdm_2024,0) + COALESCE(meta_pdm_2025,0) +
        COALESCE(meta_pdm_2026,0) + COALESCE(meta_pdm_2027,0), 0)
  END,
  ponderado_avance_2026 = CASE
    WHEN tipo_ponderado = 'Acumulativo'
      THEN COALESCE(meta_fisica_2026, 0) / NULLIF(meta_cuatrienio, 0)
    ELSE
      COALESCE(meta_fisica_2026, 0) / NULLIF(
        COALESCE(meta_pdm_2024,0) + COALESCE(meta_pdm_2025,0) +
        COALESCE(meta_pdm_2026,0) + COALESCE(meta_pdm_2027,0), 0)
  END,
  ponderado_avance_2027 = CASE
    WHEN tipo_ponderado = 'Acumulativo'
      THEN COALESCE(meta_fisica_2027, 0) / NULLIF(meta_cuatrienio, 0)
    ELSE
      COALESCE(meta_fisica_2027, 0) / NULLIF(
        COALESCE(meta_pdm_2024,0) + COALESCE(meta_pdm_2025,0) +
        COALESCE(meta_pdm_2026,0) + COALESCE(meta_pdm_2027,0), 0)
  END
WHERE meta_cuatrienio IS NOT NULL AND meta_cuatrienio > 0;
