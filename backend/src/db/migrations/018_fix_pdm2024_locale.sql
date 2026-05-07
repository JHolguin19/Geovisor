-- Migration 018: Fix meta_pdm_2024 locale errors
-- 14 metas have pdm_2024 values that are 1/1000 of correct value
-- (Spanish locale uses "." as thousands separator, Excel stored as decimal)
-- Verified via eficiencia_2024: fis/ef ≈ pdm*1000 for each meta

BEGIN;

UPDATE pdm_metas SET meta_pdm_2024 = meta_pdm_2024 * 1000
WHERE meta_num IN (10, 11, 35, 55, 65, 100, 107, 108, 135, 147, 154, 163, 166, 176);
-- Meta 197 excluded: pdm_2024=1 is correct (fis=1, ef=1.0)

COMMIT;
