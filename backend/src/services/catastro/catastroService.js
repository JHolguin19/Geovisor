import { pool } from '../../db/pool.js';

const obtenerPrediosGeoJSON = async () => {
  const query = `
    SELECT jsonb_build_object(
      'type',     'FeatureCollection',
      'features', jsonb_agg(features.feature)
    )
    FROM (
      SELECT jsonb_build_object(
        'type',       'Feature',
        'id',         id,
        'geometry',   ST_AsGeoJSON(geom, 5)::jsonb,
        'properties', json_build_object(
          'codigo', codigo,
          'avaluo', avaluo,
          'tarifa', tarifa,
          'zona', zona
        )
      ) AS feature
      FROM (
        SELECT id, geom, codigo, avaluo, tarifa, 'Rural' AS zona
        FROM public."Rural_2026_oficial"

        UNION ALL

        SELECT id, geom, codigo, avaluo, tarifa, 'Urbana' AS zona
        FROM public."Urbano_2026_barrios"
      ) AS predios_unificados
    ) features;
  `;

  const { rows } = await pool.query(query);

  if (rows[0] && rows[0].jsonb_build_object) {
    return rows[0].jsonb_build_object;
  } else {
    return { type: 'FeatureCollection', features: [] };
  }
};

export { obtenerPrediosGeoJSON };
