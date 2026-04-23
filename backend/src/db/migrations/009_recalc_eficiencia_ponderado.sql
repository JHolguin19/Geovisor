-- 009_recalc_eficiencia_ponderado.sql
-- Recalcula eficiencia_Y y ponderado_avance_Y a partir de los datos del CSV cargado en 008.
-- eficiencia_Y   = meta_fisica_Y / meta_pdm_Y          (0-1, puede >1 si supera la meta)
-- ponderado_avance_Y = contribución al cuatrienio para ese año
--   Acumulativo:    meta_fisica_Y / meta_cuatrienio
--   No acumulativo: meta_fisica_Y / SUM(meta_pdm 4 años)

-- ── Eficiencia por año ──────────────────────────────────────────────────────

UPDATE pdm_metas
SET eficiencia_2024 = meta_fisica_2024::numeric / NULLIF(meta_pdm_2024::numeric, 0)
WHERE meta_pdm_2024 IS NOT NULL AND meta_pdm_2024 > 0;

UPDATE pdm_metas
SET eficiencia_2024 = NULL
WHERE meta_pdm_2024 IS NULL OR meta_pdm_2024 = 0;

UPDATE pdm_metas
SET eficiencia_2025 = meta_fisica_2025::numeric / NULLIF(meta_pdm_2025::numeric, 0)
WHERE meta_pdm_2025 IS NOT NULL AND meta_pdm_2025 > 0;

UPDATE pdm_metas
SET eficiencia_2025 = NULL
WHERE meta_pdm_2025 IS NULL OR meta_pdm_2025 = 0;

UPDATE pdm_metas
SET eficiencia_2026 = meta_fisica_2026::numeric / NULLIF(meta_pdm_2026::numeric, 0)
WHERE meta_pdm_2026 IS NOT NULL AND meta_pdm_2026 > 0;

UPDATE pdm_metas
SET eficiencia_2026 = NULL
WHERE meta_pdm_2026 IS NULL OR meta_pdm_2026 = 0;

UPDATE pdm_metas
SET eficiencia_2027 = meta_fisica_2027::numeric / NULLIF(meta_pdm_2027::numeric, 0)
WHERE meta_pdm_2027 IS NOT NULL AND meta_pdm_2027 > 0;

UPDATE pdm_metas
SET eficiencia_2027 = NULL
WHERE meta_pdm_2027 IS NULL OR meta_pdm_2027 = 0;

-- ── Ponderado avance por año ────────────────────────────────────────────────

UPDATE pdm_metas
SET
  ponderado_avance_2024 = CASE
    WHEN tipo_ponderado = 'Acumulativo'
      THEN COALESCE(meta_fisica_2024, 0)::numeric / NULLIF(meta_cuatrienio::numeric, 0)
    ELSE
      COALESCE(meta_fisica_2024, 0)::numeric / NULLIF(
        (COALESCE(meta_pdm_2024,0) + COALESCE(meta_pdm_2025,0) +
         COALESCE(meta_pdm_2026,0) + COALESCE(meta_pdm_2027,0))::numeric, 0)
  END,
  ponderado_avance_2025 = CASE
    WHEN tipo_ponderado = 'Acumulativo'
      THEN COALESCE(meta_fisica_2025, 0)::numeric / NULLIF(meta_cuatrienio::numeric, 0)
    ELSE
      COALESCE(meta_fisica_2025, 0)::numeric / NULLIF(
        (COALESCE(meta_pdm_2024,0) + COALESCE(meta_pdm_2025,0) +
         COALESCE(meta_pdm_2026,0) + COALESCE(meta_pdm_2027,0))::numeric, 0)
  END,
  ponderado_avance_2026 = CASE
    WHEN tipo_ponderado = 'Acumulativo'
      THEN COALESCE(meta_fisica_2026, 0)::numeric / NULLIF(meta_cuatrienio::numeric, 0)
    ELSE
      COALESCE(meta_fisica_2026, 0)::numeric / NULLIF(
        (COALESCE(meta_pdm_2024,0) + COALESCE(meta_pdm_2025,0) +
         COALESCE(meta_pdm_2026,0) + COALESCE(meta_pdm_2027,0))::numeric, 0)
  END,
  ponderado_avance_2027 = CASE
    WHEN tipo_ponderado = 'Acumulativo'
      THEN COALESCE(meta_fisica_2027, 0)::numeric / NULLIF(meta_cuatrienio::numeric, 0)
    ELSE
      COALESCE(meta_fisica_2027, 0)::numeric / NULLIF(
        (COALESCE(meta_pdm_2024,0) + COALESCE(meta_pdm_2025,0) +
         COALESCE(meta_pdm_2026,0) + COALESCE(meta_pdm_2027,0))::numeric, 0)
  END
WHERE meta_cuatrienio IS NOT NULL AND meta_cuatrienio > 0;
