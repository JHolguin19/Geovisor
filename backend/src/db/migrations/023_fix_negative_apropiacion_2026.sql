-- Migration 023: Fix negative total_apropiacion in presupuesto_2026
-- Sets any negative appropriation value for 2026 to 0.
-- Known affected metas: 124 (-15,141,000) and 126 (-19,425,000) from migration 014.

BEGIN;

UPDATE pdm_metas
SET presupuesto_2026 = jsonb_set(
  presupuesto_2026,
  '{total_apropiacion}',
  '0'
)
WHERE presupuesto_2026 IS NOT NULL
  AND (presupuesto_2026->>'total_apropiacion')::numeric < 0;

COMMIT;
