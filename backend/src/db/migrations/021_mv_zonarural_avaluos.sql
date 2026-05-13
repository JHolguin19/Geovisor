-- Migration 021: Vista materializada para GeoJSON agregado de avalúos por vereda
-- Elimina el ST_Union en tiempo real (~18 000 polígonos) que hacía cada request muy lento.
-- Tras crear la vista, /api/zonarural-avaluos/geojson responde en <200 ms en vez de varios segundos.

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Vista materializada (agrupada por vereda)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_zonarural_avaluos_vereda AS
WITH t AS (
  SELECT
    nombre,
    geom,
    avaluo_nuevo,
    avaluo_antiguo,
    CASE
      WHEN avaluo_nuevo <= 10000000                          THEN 5.0
      WHEN avaluo_nuevo BETWEEN 10000001 AND 40000000        THEN 6.0
      WHEN avaluo_nuevo BETWEEN 40000001 AND 60000000        THEN 7.0
      WHEN avaluo_nuevo BETWEEN 60000001 AND 250000000       THEN 9.0
      WHEN avaluo_nuevo BETWEEN 250000001 AND 1000000000     THEN 10.0
      ELSE 11.0
    END AS tarifa_nueva
  FROM planeacion_zonarural2025_avaluos
  WHERE geom IS NOT NULL
    AND avaluo_nuevo  IS NOT NULL
    AND avaluo_antiguo IS NOT NULL
    AND nombre IS NOT NULL
    AND (excluir_analisis IS NOT TRUE)
)
SELECT
  nombre                                                                 AS vereda,
  COUNT(*)                                                               AS predios,
  ROUND(AVG(avaluo_nuevo)::numeric, 0)                                   AS avaluo_nuevo,
  ROUND(AVG(avaluo_antiguo)::numeric, 0)                                 AS avaluo_antiguo,
  ROUND(AVG(
    CASE WHEN avaluo_antiguo > 0
      THEN ((avaluo_nuevo::float / avaluo_antiguo) - 1) * 100
    END
  )::numeric, 1)                                                         AS incremento_pct,
  ROUND(AVG(avaluo_nuevo * tarifa_nueva / 1000)::numeric, 0)            AS impuesto_nuevo,
  ROUND(SUM(avaluo_nuevo * tarifa_nueva / 1000)::numeric, 0)            AS recaudo_nuevo,
  -- Geometría disuelta por vereda (la operación costosa, hecha una sola vez)
  ST_Union(ST_Buffer(ST_MakeValid(geom), 0))                            AS geom
FROM t
GROUP BY nombre;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Índices sobre la vista materializada
-- ──────────────────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_zonarural_vereda
  ON mv_zonarural_avaluos_vereda (vereda);

CREATE INDEX IF NOT EXISTS idx_mv_zonarural_geom
  ON mv_zonarural_avaluos_vereda USING GIST (geom);

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Índices adicionales en la tabla base (mejoran getPropertyGeoJSON por vereda)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_zonarural_avaluos_nombre
  ON planeacion_zonarural2025_avaluos (nombre);

CREATE INDEX IF NOT EXISTS idx_zonarural_avaluos_geom
  ON planeacion_zonarural2025_avaluos USING GIST (geom);
