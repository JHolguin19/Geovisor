-- 014: Sync cumplimiento_cuatrienio = avance_fisico * 100 for ALL rows
-- Fixes inconsistent scale: some rows had 0-1 (from CSV), others 0-100 (from recalc)
-- avance_fisico is always reliable (0-1 scale), so we derive cumplimiento from it.

UPDATE pdm_metas
SET cumplimiento_cuatrienio = LEAST(avance_fisico * 100, 100)
WHERE avance_fisico IS NOT NULL;

-- Also sync ponderado_cuatrienio = avance_fisico (both 0-1 scale)
UPDATE pdm_metas
SET ponderado_cuatrienio = LEAST(avance_fisico, 1.0)
WHERE avance_fisico IS NOT NULL;
