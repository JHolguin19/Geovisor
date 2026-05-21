-- 020_fix_avance_fisico_no_acumulativo.sql
-- Corrige avance_fisico, cumplimiento_cuatrienio y ponderado_avance_Y
-- para metas NO acumulativas.
--
-- Bug: el editor PDM usaba meta_cuatrienio como denominador para todos los tipos,
-- pero para metas 'No acumulativo' el denominador correcto es Σ(meta_pdm_Y),
-- ya que cada año es independiente (no hay acumulación hacia una meta final).
--
-- Referencia: migración 009_recalc_eficiencia_ponderado.sql (lógica canónica)

UPDATE pdm_metas
SET
  ponderado_avance_2024 =
    COALESCE(meta_fisica_2024::numeric, 0) / NULLIF(
      (COALESCE(meta_pdm_2024::numeric,0) + COALESCE(meta_pdm_2025::numeric,0) +
       COALESCE(meta_pdm_2026::numeric,0) + COALESCE(meta_pdm_2027::numeric,0)), 0),

  ponderado_avance_2025 =
    COALESCE(meta_fisica_2025::numeric, 0) / NULLIF(
      (COALESCE(meta_pdm_2024::numeric,0) + COALESCE(meta_pdm_2025::numeric,0) +
       COALESCE(meta_pdm_2026::numeric,0) + COALESCE(meta_pdm_2027::numeric,0)), 0),

  ponderado_avance_2026 =
    COALESCE(meta_fisica_2026::numeric, 0) / NULLIF(
      (COALESCE(meta_pdm_2024::numeric,0) + COALESCE(meta_pdm_2025::numeric,0) +
       COALESCE(meta_pdm_2026::numeric,0) + COALESCE(meta_pdm_2027::numeric,0)), 0),

  ponderado_avance_2027 =
    COALESCE(meta_fisica_2027::numeric, 0) / NULLIF(
      (COALESCE(meta_pdm_2024::numeric,0) + COALESCE(meta_pdm_2025::numeric,0) +
       COALESCE(meta_pdm_2026::numeric,0) + COALESCE(meta_pdm_2027::numeric,0)), 0),

  avance_fisico =
    (COALESCE(meta_fisica_2024::numeric,0) + COALESCE(meta_fisica_2025::numeric,0) +
     COALESCE(meta_fisica_2026::numeric,0) + COALESCE(meta_fisica_2027::numeric,0))
    / NULLIF(
      (COALESCE(meta_pdm_2024::numeric,0) + COALESCE(meta_pdm_2025::numeric,0) +
       COALESCE(meta_pdm_2026::numeric,0) + COALESCE(meta_pdm_2027::numeric,0)), 0),

  cumplimiento_cuatrienio =
    (COALESCE(meta_fisica_2024::numeric,0) + COALESCE(meta_fisica_2025::numeric,0) +
     COALESCE(meta_fisica_2026::numeric,0) + COALESCE(meta_fisica_2027::numeric,0))
    / NULLIF(
      (COALESCE(meta_pdm_2024::numeric,0) + COALESCE(meta_pdm_2025::numeric,0) +
       COALESCE(meta_pdm_2026::numeric,0) + COALESCE(meta_pdm_2027::numeric,0)), 0)
    * 100

WHERE tipo_ponderado != 'Acumulativo'
  AND (
    COALESCE(meta_pdm_2024::numeric,0) + COALESCE(meta_pdm_2025::numeric,0) +
    COALESCE(meta_pdm_2026::numeric,0) + COALESCE(meta_pdm_2027::numeric,0)
  ) > 0;
