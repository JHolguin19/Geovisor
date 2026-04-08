import { pool } from '../../db/pool.js';

const obtenerViviendaGeoJSON = async () => {
  const query = `
    WITH
    stats_vivienda AS (
      SELECT
        UPPER(TRIM(barrio)) AS barrio_excel,
        COUNT(*) AS total_familias,
        SUM(COALESCE(nucleofamiliar, 0)) AS total_personas,
        COUNT(CASE WHEN UPPER(TRIM(sexo)) = 'MUJER' THEN 1 END) AS total_mujeres,
        COUNT(CASE WHEN UPPER(TRIM(sexo)) = 'HOMBRE' THEN 1 END) AS total_hombres,
        COUNT(CASE WHEN UPPER(TRIM(familia)) IN ('SÍ', 'SI', 'YES') THEN 1 END) AS cabeza_hogar,
        COUNT(CASE WHEN UPPER(TRIM(victima)) IN ('SÍ', 'SI', 'YES') THEN 1 END) AS total_victimas,
        COUNT(CASE WHEN UPPER(TRIM(discapacidad)) IN ('SÍ', 'SI', 'YES') THEN 1 END) AS total_discapacidad,
        COUNT(CASE WHEN UPPER(TRIM("lgtbiq+")) IN ('SÍ', 'SI', 'YES') THEN 1 END) AS total_lgtbiq,
        STRING_AGG(DISTINCT UPPER(TRIM(sisben)), ', ') AS categorias_sisben,
        STRING_AGG(DISTINCT UPPER(TRIM(etnia)), ', ') AS etnias_presentes
      FROM (
        SELECT barrio, nucleofamiliar, sexo, familia, victima, discapacidad, "lgtbiq+", sisben, etnia FROM public."villaMariana_Rural"
        UNION ALL
        SELECT barrio, nucleofamiliar, sexo, familia, victima, discapacidad, "lgtbiq+", sisben, etnia FROM public."villaMariana_Urbano"
      ) combined
      GROUP BY UPPER(TRIM(barrio))
    ),

    geo_unificada AS (
      SELECT
        UPPER(TRIM(zona)) AS nombre_mapa,
        'Rural' AS tipo_zona,
        ST_Simplify(ST_UnaryUnion(ST_Collect(geom)), 0.0001) AS geom_dissolved
      FROM public."Rural_2026_oficial"
      GROUP BY UPPER(TRIM(zona))

      UNION ALL

      SELECT
        UPPER(TRIM(barrio)) AS nombre_mapa,
        'Urbana' AS tipo_zona,
        ST_Simplify(ST_UnaryUnion(ST_Collect(geom)), 0.0001) AS geom_dissolved
      FROM public."Urbano_Uba_Barrios_2026"
      GROUP BY UPPER(TRIM(barrio))
    )

    SELECT jsonb_build_object(
      'type', 'FeatureCollection',
      'features', COALESCE(jsonb_agg(feature), '[]'::jsonb)
    )
    FROM (
      SELECT jsonb_build_object(
        'type', 'Feature',
        'geometry', ST_AsGeoJSON(gu.geom_dissolved, 5)::jsonb,
        'properties', jsonb_build_object(
          'tipo', 'poligono',
          'nombre_barrio', gu.nombre_mapa,
          'tipo_zona', gu.tipo_zona,
          'total_familias', COALESCE(sv.total_familias, 0),
          'total_personas', COALESCE(sv.total_personas, 0),
          'total_mujeres', COALESCE(sv.total_mujeres, 0),
          'total_hombres', COALESCE(sv.total_hombres, 0),
          'cabeza_hogar', COALESCE(sv.cabeza_hogar, 0),
          'total_victimas', COALESCE(sv.total_victimas, 0),
          'total_discapacidad', COALESCE(sv.total_discapacidad, 0),
          'total_lgtbiq', COALESCE(sv.total_lgtbiq, 0),
          'categorias_sisben', sv.categorias_sisben,
          'etnias', sv.etnias_presentes
        )
      ) AS feature
      FROM geo_unificada gu
      INNER JOIN stats_vivienda sv ON gu.nombre_mapa = sv.barrio_excel
    ) features;
  `;

  try {
    const { rows } = await pool.query(query);
    return rows[0].jsonb_build_object || { type: 'FeatureCollection', features: [] };
  } catch (error) {
    console.error('Error en PostGIS Vivienda:', error);
    throw error;
  }
};

export { obtenerViviendaGeoJSON };
