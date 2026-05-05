-- Migración 012 — Recalculo de avance_fisico, ponderado_cuatrienio y cumplimiento_cuatrienio
-- con capping correcto (meta_fisica_Y nunca supera meta_pdm_Y).
-- Corrige datos históricos que fueron calculados sin capping o con WHERE incorrecto.
-- Ejecutar: supabase db query --linked -f backend/src/db/migrations/012_fix_avance_fisico_capped.sql

-- Helper: valor efectivo capeado por año
-- LEAST(meta_fisica_Y, meta_pdm_Y) — si meta_pdm_Y=NULL o 0, usa meta_fisica_Y sin limitar.

-- 1. Recalcular eficiencia_Y (capeada a 1.0) para todos los años
UPDATE pdm_metas SET eficiencia_2024 = LEAST(meta_fisica_2024::numeric / NULLIF(meta_pdm_2024::numeric, 0), 1.0)
  WHERE meta_pdm_2024 IS NOT NULL AND meta_pdm_2024::numeric != 0;
UPDATE pdm_metas SET eficiencia_2025 = LEAST(meta_fisica_2025::numeric / NULLIF(meta_pdm_2025::numeric, 0), 1.0)
  WHERE meta_pdm_2025 IS NOT NULL AND meta_pdm_2025::numeric != 0;
UPDATE pdm_metas SET eficiencia_2026 = LEAST(meta_fisica_2026::numeric / NULLIF(meta_pdm_2026::numeric, 0), 1.0)
  WHERE meta_pdm_2026 IS NOT NULL AND meta_pdm_2026::numeric != 0;
UPDATE pdm_metas SET eficiencia_2027 = LEAST(meta_fisica_2027::numeric / NULLIF(meta_pdm_2027::numeric, 0), 1.0)
  WHERE meta_pdm_2027 IS NOT NULL AND meta_pdm_2027::numeric != 0;

-- 2. Recalcular ponderado_avance_Y (capeado) para todos los años
-- Acumulativo: cap_Y / meta_cuatrienio | No-acumulativo: cap_Y / sum(meta_pdm_all)

UPDATE pdm_metas SET ponderado_avance_2024 = CASE
    WHEN tipo_ponderado = 'Acumulativo'
      THEN LEAST(COALESCE(meta_fisica_2024::numeric,0), CASE WHEN COALESCE(meta_pdm_2024::numeric,0)>0 THEN meta_pdm_2024::numeric ELSE COALESCE(meta_fisica_2024::numeric,0) END)
           / NULLIF(meta_cuatrienio::numeric, 0)
    ELSE
      LEAST(COALESCE(meta_fisica_2024::numeric,0), CASE WHEN COALESCE(meta_pdm_2024::numeric,0)>0 THEN meta_pdm_2024::numeric ELSE COALESCE(meta_fisica_2024::numeric,0) END)
      / NULLIF((COALESCE(meta_pdm_2024::numeric,0)+COALESCE(meta_pdm_2025::numeric,0)+COALESCE(meta_pdm_2026::numeric,0)+COALESCE(meta_pdm_2027::numeric,0)), 0)
  END
  WHERE (tipo_ponderado = 'Acumulativo' AND meta_cuatrienio IS NOT NULL AND meta_cuatrienio::numeric != 0)
     OR (tipo_ponderado != 'Acumulativo' AND COALESCE(meta_pdm_2024::numeric,0)+COALESCE(meta_pdm_2025::numeric,0)+COALESCE(meta_pdm_2026::numeric,0)+COALESCE(meta_pdm_2027::numeric,0) > 0);

UPDATE pdm_metas SET ponderado_avance_2025 = CASE
    WHEN tipo_ponderado = 'Acumulativo'
      THEN LEAST(COALESCE(meta_fisica_2025::numeric,0), CASE WHEN COALESCE(meta_pdm_2025::numeric,0)>0 THEN meta_pdm_2025::numeric ELSE COALESCE(meta_fisica_2025::numeric,0) END)
           / NULLIF(meta_cuatrienio::numeric, 0)
    ELSE
      LEAST(COALESCE(meta_fisica_2025::numeric,0), CASE WHEN COALESCE(meta_pdm_2025::numeric,0)>0 THEN meta_pdm_2025::numeric ELSE COALESCE(meta_fisica_2025::numeric,0) END)
      / NULLIF((COALESCE(meta_pdm_2024::numeric,0)+COALESCE(meta_pdm_2025::numeric,0)+COALESCE(meta_pdm_2026::numeric,0)+COALESCE(meta_pdm_2027::numeric,0)), 0)
  END
  WHERE (tipo_ponderado = 'Acumulativo' AND meta_cuatrienio IS NOT NULL AND meta_cuatrienio::numeric != 0)
     OR (tipo_ponderado != 'Acumulativo' AND COALESCE(meta_pdm_2024::numeric,0)+COALESCE(meta_pdm_2025::numeric,0)+COALESCE(meta_pdm_2026::numeric,0)+COALESCE(meta_pdm_2027::numeric,0) > 0);

UPDATE pdm_metas SET ponderado_avance_2026 = CASE
    WHEN tipo_ponderado = 'Acumulativo'
      THEN LEAST(COALESCE(meta_fisica_2026::numeric,0), CASE WHEN COALESCE(meta_pdm_2026::numeric,0)>0 THEN meta_pdm_2026::numeric ELSE COALESCE(meta_fisica_2026::numeric,0) END)
           / NULLIF(meta_cuatrienio::numeric, 0)
    ELSE
      LEAST(COALESCE(meta_fisica_2026::numeric,0), CASE WHEN COALESCE(meta_pdm_2026::numeric,0)>0 THEN meta_pdm_2026::numeric ELSE COALESCE(meta_fisica_2026::numeric,0) END)
      / NULLIF((COALESCE(meta_pdm_2024::numeric,0)+COALESCE(meta_pdm_2025::numeric,0)+COALESCE(meta_pdm_2026::numeric,0)+COALESCE(meta_pdm_2027::numeric,0)), 0)
  END
  WHERE (tipo_ponderado = 'Acumulativo' AND meta_cuatrienio IS NOT NULL AND meta_cuatrienio::numeric != 0)
     OR (tipo_ponderado != 'Acumulativo' AND COALESCE(meta_pdm_2024::numeric,0)+COALESCE(meta_pdm_2025::numeric,0)+COALESCE(meta_pdm_2026::numeric,0)+COALESCE(meta_pdm_2027::numeric,0) > 0);

UPDATE pdm_metas SET ponderado_avance_2027 = CASE
    WHEN tipo_ponderado = 'Acumulativo'
      THEN LEAST(COALESCE(meta_fisica_2027::numeric,0), CASE WHEN COALESCE(meta_pdm_2027::numeric,0)>0 THEN meta_pdm_2027::numeric ELSE COALESCE(meta_fisica_2027::numeric,0) END)
           / NULLIF(meta_cuatrienio::numeric, 0)
    ELSE
      LEAST(COALESCE(meta_fisica_2027::numeric,0), CASE WHEN COALESCE(meta_pdm_2027::numeric,0)>0 THEN meta_pdm_2027::numeric ELSE COALESCE(meta_fisica_2027::numeric,0) END)
      / NULLIF((COALESCE(meta_pdm_2024::numeric,0)+COALESCE(meta_pdm_2025::numeric,0)+COALESCE(meta_pdm_2026::numeric,0)+COALESCE(meta_pdm_2027::numeric,0)), 0)
  END
  WHERE (tipo_ponderado = 'Acumulativo' AND meta_cuatrienio IS NOT NULL AND meta_cuatrienio::numeric != 0)
     OR (tipo_ponderado != 'Acumulativo' AND COALESCE(meta_pdm_2024::numeric,0)+COALESCE(meta_pdm_2025::numeric,0)+COALESCE(meta_pdm_2026::numeric,0)+COALESCE(meta_pdm_2027::numeric,0) > 0);

-- 3. Recalcular avance_fisico, ponderado_cuatrienio y cumplimiento_cuatrienio (todos capeados)
UPDATE pdm_metas
SET
  avance_fisico = LEAST(CASE
    WHEN tipo_ponderado = 'Acumulativo'
      THEN GREATEST(
        LEAST(COALESCE(meta_fisica_2024::numeric,0), CASE WHEN COALESCE(meta_pdm_2024::numeric,0)>0 THEN meta_pdm_2024::numeric ELSE COALESCE(meta_fisica_2024::numeric,0) END),
        LEAST(COALESCE(meta_fisica_2025::numeric,0), CASE WHEN COALESCE(meta_pdm_2025::numeric,0)>0 THEN meta_pdm_2025::numeric ELSE COALESCE(meta_fisica_2025::numeric,0) END),
        LEAST(COALESCE(meta_fisica_2026::numeric,0), CASE WHEN COALESCE(meta_pdm_2026::numeric,0)>0 THEN meta_pdm_2026::numeric ELSE COALESCE(meta_fisica_2026::numeric,0) END),
        LEAST(COALESCE(meta_fisica_2027::numeric,0), CASE WHEN COALESCE(meta_pdm_2027::numeric,0)>0 THEN meta_pdm_2027::numeric ELSE COALESCE(meta_fisica_2027::numeric,0) END)
      )::numeric / NULLIF(meta_cuatrienio::numeric, 0)
    ELSE
      (LEAST(COALESCE(meta_fisica_2024::numeric,0), CASE WHEN COALESCE(meta_pdm_2024::numeric,0)>0 THEN meta_pdm_2024::numeric ELSE COALESCE(meta_fisica_2024::numeric,0) END) +
       LEAST(COALESCE(meta_fisica_2025::numeric,0), CASE WHEN COALESCE(meta_pdm_2025::numeric,0)>0 THEN meta_pdm_2025::numeric ELSE COALESCE(meta_fisica_2025::numeric,0) END) +
       LEAST(COALESCE(meta_fisica_2026::numeric,0), CASE WHEN COALESCE(meta_pdm_2026::numeric,0)>0 THEN meta_pdm_2026::numeric ELSE COALESCE(meta_fisica_2026::numeric,0) END) +
       LEAST(COALESCE(meta_fisica_2027::numeric,0), CASE WHEN COALESCE(meta_pdm_2027::numeric,0)>0 THEN meta_pdm_2027::numeric ELSE COALESCE(meta_fisica_2027::numeric,0) END))::numeric
      / NULLIF((COALESCE(meta_pdm_2024::numeric,0)+COALESCE(meta_pdm_2025::numeric,0)+COALESCE(meta_pdm_2026::numeric,0)+COALESCE(meta_pdm_2027::numeric,0)), 0)
  END, 1.0),
  ponderado_cuatrienio = LEAST(CASE
    WHEN tipo_ponderado = 'Acumulativo'
      THEN GREATEST(
        LEAST(COALESCE(meta_fisica_2024::numeric,0), CASE WHEN COALESCE(meta_pdm_2024::numeric,0)>0 THEN meta_pdm_2024::numeric ELSE COALESCE(meta_fisica_2024::numeric,0) END),
        LEAST(COALESCE(meta_fisica_2025::numeric,0), CASE WHEN COALESCE(meta_pdm_2025::numeric,0)>0 THEN meta_pdm_2025::numeric ELSE COALESCE(meta_fisica_2025::numeric,0) END),
        LEAST(COALESCE(meta_fisica_2026::numeric,0), CASE WHEN COALESCE(meta_pdm_2026::numeric,0)>0 THEN meta_pdm_2026::numeric ELSE COALESCE(meta_fisica_2026::numeric,0) END),
        LEAST(COALESCE(meta_fisica_2027::numeric,0), CASE WHEN COALESCE(meta_pdm_2027::numeric,0)>0 THEN meta_pdm_2027::numeric ELSE COALESCE(meta_fisica_2027::numeric,0) END)
      )::numeric / NULLIF(meta_cuatrienio::numeric, 0)
    ELSE
      (LEAST(COALESCE(meta_fisica_2024::numeric,0), CASE WHEN COALESCE(meta_pdm_2024::numeric,0)>0 THEN meta_pdm_2024::numeric ELSE COALESCE(meta_fisica_2024::numeric,0) END) +
       LEAST(COALESCE(meta_fisica_2025::numeric,0), CASE WHEN COALESCE(meta_pdm_2025::numeric,0)>0 THEN meta_pdm_2025::numeric ELSE COALESCE(meta_fisica_2025::numeric,0) END) +
       LEAST(COALESCE(meta_fisica_2026::numeric,0), CASE WHEN COALESCE(meta_pdm_2026::numeric,0)>0 THEN meta_pdm_2026::numeric ELSE COALESCE(meta_fisica_2026::numeric,0) END) +
       LEAST(COALESCE(meta_fisica_2027::numeric,0), CASE WHEN COALESCE(meta_pdm_2027::numeric,0)>0 THEN meta_pdm_2027::numeric ELSE COALESCE(meta_fisica_2027::numeric,0) END))::numeric
      / NULLIF((COALESCE(meta_pdm_2024::numeric,0)+COALESCE(meta_pdm_2025::numeric,0)+COALESCE(meta_pdm_2026::numeric,0)+COALESCE(meta_pdm_2027::numeric,0)), 0)
  END, 1.0),
  cumplimiento_cuatrienio = LEAST(CASE
    WHEN tipo_ponderado = 'Acumulativo'
      THEN GREATEST(
        LEAST(COALESCE(meta_fisica_2024::numeric,0), CASE WHEN COALESCE(meta_pdm_2024::numeric,0)>0 THEN meta_pdm_2024::numeric ELSE COALESCE(meta_fisica_2024::numeric,0) END),
        LEAST(COALESCE(meta_fisica_2025::numeric,0), CASE WHEN COALESCE(meta_pdm_2025::numeric,0)>0 THEN meta_pdm_2025::numeric ELSE COALESCE(meta_fisica_2025::numeric,0) END),
        LEAST(COALESCE(meta_fisica_2026::numeric,0), CASE WHEN COALESCE(meta_pdm_2026::numeric,0)>0 THEN meta_pdm_2026::numeric ELSE COALESCE(meta_fisica_2026::numeric,0) END),
        LEAST(COALESCE(meta_fisica_2027::numeric,0), CASE WHEN COALESCE(meta_pdm_2027::numeric,0)>0 THEN meta_pdm_2027::numeric ELSE COALESCE(meta_fisica_2027::numeric,0) END)
      )::numeric / NULLIF(meta_cuatrienio::numeric, 0) * 100
    ELSE
      (LEAST(COALESCE(meta_fisica_2024::numeric,0), CASE WHEN COALESCE(meta_pdm_2024::numeric,0)>0 THEN meta_pdm_2024::numeric ELSE COALESCE(meta_fisica_2024::numeric,0) END) +
       LEAST(COALESCE(meta_fisica_2025::numeric,0), CASE WHEN COALESCE(meta_pdm_2025::numeric,0)>0 THEN meta_pdm_2025::numeric ELSE COALESCE(meta_fisica_2025::numeric,0) END) +
       LEAST(COALESCE(meta_fisica_2026::numeric,0), CASE WHEN COALESCE(meta_pdm_2026::numeric,0)>0 THEN meta_pdm_2026::numeric ELSE COALESCE(meta_fisica_2026::numeric,0) END) +
       LEAST(COALESCE(meta_fisica_2027::numeric,0), CASE WHEN COALESCE(meta_pdm_2027::numeric,0)>0 THEN meta_pdm_2027::numeric ELSE COALESCE(meta_fisica_2027::numeric,0) END))::numeric
      / NULLIF((COALESCE(meta_pdm_2024::numeric,0)+COALESCE(meta_pdm_2025::numeric,0)+COALESCE(meta_pdm_2026::numeric,0)+COALESCE(meta_pdm_2027::numeric,0)), 0) * 100
  END, 100)
WHERE (
  (tipo_ponderado = 'Acumulativo' AND meta_cuatrienio IS NOT NULL AND meta_cuatrienio::numeric != 0)
  OR (tipo_ponderado != 'Acumulativo' AND
      COALESCE(meta_pdm_2024::numeric,0)+COALESCE(meta_pdm_2025::numeric,0)+
      COALESCE(meta_pdm_2026::numeric,0)+COALESCE(meta_pdm_2027::numeric,0) > 0)
);

-- Verificar resultado (ejecutar manualmente para confirmar)
-- SELECT meta_num, secretaria, meta_pdm_2025, meta_fisica_2025, avance_fisico, ponderado_cuatrienio
-- FROM pdm_metas WHERE meta_num = 180;
