import { pool } from '../../db/pool.js';

const obtenerPrediosPagosGeoJSON = async () => {
  const query = `
    WITH
    pagos_2025 AS (
      SELECT
        TRIM(codigocatastral) AS codigo_pago,
        SUM(COALESCE(valorrecaudo, 0)) AS total_recaudo,
        MAX(fecharecaudo) AS ultima_fecha_pago
      FROM public."REPORTE_PAGOS_2025"
      GROUP BY TRIM(codigocatastral)
    ),

    predios_unificados AS (
      SELECT id, geom, codigo, avaluo, tarifa, 'Rural' AS zona
      FROM public."Rural_2026_oficial"

      UNION ALL

      SELECT id, geom, codigo, avaluo, tarifa, 'Urbana' AS zona
      FROM public."Urbano_2026_barrios"
    )

    SELECT jsonb_build_object(
      'type',     'FeatureCollection',
      'features', COALESCE(jsonb_agg(features.feature), '[]'::jsonb)
    )
    FROM (
      SELECT jsonb_build_object(
        'type',       'Feature',
        'id',         pu.id,
        'geometry',   ST_AsGeoJSON(pu.geom, 5)::jsonb,
        'properties', json_build_object(
          'codigo',       pu.codigo,
          'avaluo',       pu.avaluo,
          'tarifa',       pu.tarifa,
          'zona',         pu.zona,
          'valorrecaudo', COALESCE(pg.total_recaudo, 0),
          'fecharecaudo', pg.ultima_fecha_pago
        )
      ) AS feature
      FROM predios_unificados pu
      LEFT JOIN pagos_2025 pg ON TRIM(pu.codigo) = pg.codigo_pago
    ) features;
  `;

  try {
    const { rows } = await pool.query(query);
    if (rows[0] && rows[0].jsonb_build_object) {
      return rows[0].jsonb_build_object;
    } else {
      return { type: 'FeatureCollection', features: [] };
    }
  } catch (error) {
    console.error('Error en PostGIS Catastro Pagos 2025:', error);
    throw error;
  }
};

export { obtenerPrediosPagosGeoJSON };
