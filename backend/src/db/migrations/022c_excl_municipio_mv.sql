-- Migration 022c: Recreate mv_urbano_barrio_avaluos excluding municipal properties.
-- The municipality's own predios appear with three typo variants in propietario:
--   MUNCIPIO DE SANTANDER DE QUILICHA
--   MUNICIPO DE SANTANDER DE QUILICHA
--   MUNUCIPIO DE SANTANDER DE QUILICH
-- All are exempt from predial tax and must be excluded from every metric.

DROP MATERIALIZED VIEW IF EXISTS mv_urbano_barrio_avaluos;

CREATE MATERIALIZED VIEW mv_urbano_barrio_avaluos AS
WITH t AS (
  SELECT
    barrio,
    geom,
    avaluo_nuevo,
    avaluo_antiguo,
    CASE
      WHEN avaluo_nuevo <= 10000000                          THEN 5.0
      WHEN avaluo_nuevo BETWEEN 10000001  AND 40000000       THEN 6.0
      WHEN avaluo_nuevo BETWEEN 40000001  AND 60000000       THEN 7.0
      WHEN avaluo_nuevo BETWEEN 60000001  AND 250000000      THEN 9.0
      WHEN avaluo_nuevo BETWEEN 250000001 AND 1000000000     THEN 10.0
      ELSE 11.0
    END AS tarifa_nueva,
    CASE
      WHEN avaluo_antiguo <= 10000000                        THEN 5.0
      WHEN avaluo_antiguo BETWEEN 10000001  AND 20000000     THEN 5.5
      WHEN avaluo_antiguo BETWEEN 20000001  AND 40000000     THEN 6.5
      WHEN avaluo_antiguo BETWEEN 40000001  AND 60000000     THEN 7.0
      ELSE 8.0
    END AS tarifa_antigua
  FROM predios_avaluos_urbanos_2026
  WHERE geom IS NOT NULL
    AND avaluo_nuevo   IS NOT NULL
    AND avaluo_antiguo IS NOT NULL
    AND barrio         IS NOT NULL
    AND (propietario IS NULL OR propietario NOT ILIKE 'MUN%SANTANDER DE QUILI%')
)
SELECT
  barrio,
  COUNT(*)                                                              AS predios,
  ROUND(AVG(avaluo_nuevo)::numeric, 0)                                 AS avaluo_nuevo,
  ROUND(AVG(avaluo_antiguo)::numeric, 0)                               AS avaluo_antiguo,
  ROUND(AVG(CASE WHEN avaluo_antiguo > 0
    THEN ((avaluo_nuevo::float / avaluo_antiguo) - 1) * 100 END)::numeric, 1)
                                                                       AS incremento_pct,
  ROUND(AVG(avaluo_nuevo * tarifa_nueva   / 1000)::numeric, 0)       AS impuesto_nuevo,
  ROUND(SUM(avaluo_nuevo * tarifa_nueva   / 1000)::numeric, 0)       AS recaudo_nuevo,
  ROUND(SUM(avaluo_antiguo * tarifa_antigua / 1000)::numeric, 0)     AS recaudo_antiguo,
  ST_Union(ST_Buffer(ST_MakeValid(geom), 0))                         AS geom
FROM t
GROUP BY barrio;

CREATE UNIQUE INDEX idx_mv_urbano_barrio
  ON mv_urbano_barrio_avaluos (barrio);

CREATE INDEX idx_mv_urbano_barrio_geom
  ON mv_urbano_barrio_avaluos USING GIST (geom);
