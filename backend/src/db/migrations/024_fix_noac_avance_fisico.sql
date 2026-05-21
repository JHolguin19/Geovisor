-- Migration 024: Fix avance_fisico for "No acumulativo" goals
--
-- ROOT CAUSE: For non-cumulative goals, meta_cuatrienio stores the ANNUAL target
-- (e.g., "achieve 3 units every year"). The 4-year total is meta_cuatrienio * 4.
--
-- WRONG formula (current): avance_fisico = SUM(meta_fisica_Y) / meta_cuatrienio
--   → gives 116.7% for meta 130 (3.5 / 3 = 1.167)
--
-- CORRECT formula: avance_fisico = SUM(meta_fisica_Y) / (meta_cuatrienio * 4)
--   → gives 29.2% for meta 130 (3.5 / 12 = 0.292)
--
-- Fields recalculated:
--   ponderado_avance_2024/2025/2026/2027 = meta_fisica_Y / (meta_cuatrienio * 4)
--   avance_fisico = SUM(meta_fisica_Y)   / (meta_cuatrienio * 4)
--   ponderado_cuatrienio = avance_fisico
--   cumplimiento_cuatrienio = avance_fisico * 100

BEGIN;

UPDATE pdm_metas
SET
  ponderado_avance_2024 = COALESCE(meta_fisica_2024::numeric, 0)
                          / (meta_cuatrienio::numeric * 4),

  ponderado_avance_2025 = COALESCE(meta_fisica_2025::numeric, 0)
                          / (meta_cuatrienio::numeric * 4),

  ponderado_avance_2026 = COALESCE(meta_fisica_2026::numeric, 0)
                          / (meta_cuatrienio::numeric * 4),

  ponderado_avance_2027 = COALESCE(meta_fisica_2027::numeric, 0)
                          / (meta_cuatrienio::numeric * 4),

  avance_fisico = (
      COALESCE(meta_fisica_2024::numeric, 0) +
      COALESCE(meta_fisica_2025::numeric, 0) +
      COALESCE(meta_fisica_2026::numeric, 0) +
      COALESCE(meta_fisica_2027::numeric, 0)
    ) / (meta_cuatrienio::numeric * 4),

  ponderado_cuatrienio = (
      COALESCE(meta_fisica_2024::numeric, 0) +
      COALESCE(meta_fisica_2025::numeric, 0) +
      COALESCE(meta_fisica_2026::numeric, 0) +
      COALESCE(meta_fisica_2027::numeric, 0)
    ) / (meta_cuatrienio::numeric * 4),

  cumplimiento_cuatrienio = (
      COALESCE(meta_fisica_2024::numeric, 0) +
      COALESCE(meta_fisica_2025::numeric, 0) +
      COALESCE(meta_fisica_2026::numeric, 0) +
      COALESCE(meta_fisica_2027::numeric, 0)
    ) / (meta_cuatrienio::numeric * 4) * 100

WHERE tipo_ponderado = 'No acumulativo'
  AND meta_cuatrienio IS NOT NULL
  AND meta_cuatrienio::numeric > 0;

-- Verify sample (meta 130 should show avance_fisico ≈ 0.2917 = 29.2%)
-- SELECT meta_num, avance_fisico, cumplimiento_cuatrienio
-- FROM pdm_metas WHERE meta_num IN (74, 130, 67, 84, 77, 25)
-- ORDER BY meta_num;

COMMIT;
