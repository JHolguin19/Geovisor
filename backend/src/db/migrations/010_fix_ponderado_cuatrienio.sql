-- 010_fix_ponderado_cuatrienio.sql
-- Corrige ponderado_cuatrienio y cumplimiento_cuatrienio usando avance_fisico como fuente canónica.
-- avance_fisico (0-1) es cargado correctamente desde el CSV.
-- ponderado_cuatrienio debe ser igual a avance_fisico.
-- cumplimiento_cuatrienio (escala 0-100) = avance_fisico * 100.

UPDATE pdm_metas
SET
  ponderado_cuatrienio   = avance_fisico,
  cumplimiento_cuatrienio = avance_fisico * 100
WHERE avance_fisico IS NOT NULL;
