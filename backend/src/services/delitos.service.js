import { pool } from '../db/pool.js';

/**
 * Obtener resumen general de delitos con filtros opcionales.
 */
export async function getStats({ anio, tipo_delito } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (anio) { conditions.push(`anio = $${idx++}`); params.push(anio); }
  if (tipo_delito) { conditions.push(`tipo_delito = $${idx++}`); params.push(tipo_delito); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // Totales por tipo
  const porTipo = await pool.query(`
    SELECT tipo_delito, anio, COUNT(*) AS total
    FROM gobierno_delitos ${where}
    GROUP BY tipo_delito, anio
    ORDER BY tipo_delito, anio
  `, params);

  // Por día de la semana
  const porDia = await pool.query(`
    SELECT dia_semana, COUNT(*) AS total
    FROM gobierno_delitos ${where}
    GROUP BY dia_semana
    ORDER BY CASE dia_semana
      WHEN 'Lunes' THEN 1 WHEN 'Martes' THEN 2 WHEN 'Miércoles' THEN 3
      WHEN 'Jueves' THEN 4 WHEN 'Viernes' THEN 5 WHEN 'Sábado' THEN 6
      WHEN 'Domingo' THEN 7 ELSE 8 END
  `, params);

  // Por intervalo horario
  const porHora = await pool.query(`
    SELECT intervalo_hora, COUNT(*) AS total
    FROM gobierno_delitos ${where}
    GROUP BY intervalo_hora
    ORDER BY intervalo_hora
  `, params);

  // Por zona
  const porZona = await pool.query(`
    SELECT zona, COUNT(*) AS total
    FROM gobierno_delitos ${where}
    GROUP BY zona
    ORDER BY total DESC
  `, params);

  // Por barrio urbano (top 20)
  const porBarrio = await pool.query(`
    SELECT barrio_hecho, COUNT(*) AS total
    FROM gobierno_delitos
    ${where ? where + ' AND' : 'WHERE'} barrio_hecho IS NOT NULL AND zona = 'URBANA'
    GROUP BY barrio_hecho
    ORDER BY total DESC
    LIMIT 20
  `, params);

  // Por zona rural — veredas/barrios rurales (top 20)
  const porBarrioRural = await pool.query(`
    SELECT barrio_hecho, COUNT(*) AS total
    FROM gobierno_delitos
    ${where ? where + ' AND' : 'WHERE'} barrio_hecho IS NOT NULL AND zona = 'RURAL'
    GROUP BY barrio_hecho
    ORDER BY total DESC
    LIMIT 20
  `, params);

  // Barrios sin match con capa barriosurbanos (para identificar zonas no mapeadas)
  const aliasedConditions = conditions.map(c => `d.${c}`);
  const sinMatchWhere = aliasedConditions.length
    ? 'WHERE ' + aliasedConditions.join(' AND ') + ' AND d.barrio_hecho IS NOT NULL AND b.gid IS NULL'
    : 'WHERE d.barrio_hecho IS NOT NULL AND b.gid IS NULL';
  const barriosSinMatch = await pool.query(`
    SELECT d.barrio_hecho, d.zona, COUNT(*) AS total
    FROM gobierno_delitos d
    LEFT JOIN barriosurbanos b ON UPPER(TRIM(d.barrio_hecho)) = UPPER(TRIM(b.nombre))
    ${sinMatchWhere}
    GROUP BY d.barrio_hecho, d.zona
    ORDER BY total DESC
    LIMIT 30
  `, params);

  // Por mes
  const porMes = await pool.query(`
    SELECT mes, anio, COUNT(*) AS total
    FROM gobierno_delitos ${where}
    GROUP BY mes, anio
    ORDER BY anio, CASE mes
      WHEN 'ene' THEN 1 WHEN 'feb' THEN 2 WHEN 'mar' THEN 3
      WHEN 'abr' THEN 4 WHEN 'may' THEN 5 WHEN 'jun' THEN 6
      WHEN 'jul' THEN 7 WHEN 'ago' THEN 8 WHEN 'sep' THEN 9
      WHEN 'oct' THEN 10 WHEN 'nov' THEN 11 WHEN 'dic' THEN 12
      ELSE 13 END
  `, params);

  // Por género
  const porGenero = await pool.query(`
    SELECT genero, COUNT(*) AS total
    FROM gobierno_delitos ${where}
    GROUP BY genero
    ORDER BY total DESC
  `, params);

  // Por grupo de edad
  const porEdad = await pool.query(`
    SELECT grupo_edad, COUNT(*) AS total
    FROM gobierno_delitos ${where}
    GROUP BY grupo_edad
    ORDER BY total DESC
  `, params);

  // Por modalidad (top 10)
  const porModalidad = await pool.query(`
    SELECT modalidad, COUNT(*) AS total
    FROM gobierno_delitos
    ${where ? where + ' AND' : 'WHERE'} modalidad IS NOT NULL
    GROUP BY modalidad
    ORDER BY total DESC
    LIMIT 10
  `, params);

  // Por arma/medio (top 10)
  const porArma = await pool.query(`
    SELECT arma_medio, COUNT(*) AS total
    FROM gobierno_delitos
    ${where ? where + ' AND' : 'WHERE'} arma_medio IS NOT NULL
    GROUP BY arma_medio
    ORDER BY total DESC
    LIMIT 10
  `, params);

  // Total general
  const totalRes = await pool.query(`SELECT COUNT(*) AS total FROM gobierno_delitos ${where}`, params);

  return {
    total: parseInt(totalRes.rows[0].total, 10),
    porTipo: porTipo.rows,
    porDia: porDia.rows,
    porHora: porHora.rows,
    porZona: porZona.rows,
    porBarrio: porBarrio.rows,
    porBarrioRural: porBarrioRural.rows,
    barriosSinMatch: barriosSinMatch.rows,
    porMes: porMes.rows,
    porGenero: porGenero.rows,
    porEdad: porEdad.rows,
    porModalidad: porModalidad.rows,
    porArma: porArma.rows,
  };
}

/**
 * GeoJSON: barrios con conteo de delitos (JOIN con barriosurbanos).
 * Cada feature tiene geometry del barrio + properties con conteos por tipo.
 */
export async function getBarriosDelitos({ anio, tipo_delito } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (anio) { conditions.push(`d.anio = $${idx++}`); params.push(anio); }
  if (tipo_delito) { conditions.push(`d.tipo_delito = $${idx++}`); params.push(tipo_delito); }

  const where = conditions.length ? `AND ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(`
    SELECT
      b.gid,
      b.nombre,
      COUNT(d.id) AS total_delitos,
      COUNT(d.id) FILTER (WHERE d.tipo_delito = 'HOMICIDIO') AS homicidios,
      COUNT(d.id) FILTER (WHERE d.tipo_delito = 'HURTO A PERSONAS') AS hurto_personas,
      COUNT(d.id) FILTER (WHERE d.tipo_delito = 'LESIONES PERSONALES') AS lesiones,
      COUNT(d.id) FILTER (WHERE d.tipo_delito = 'VIOLENCIA INTRAFAMILIAR') AS violencia_intrafamiliar,
      COUNT(d.id) FILTER (WHERE d.tipo_delito = 'HURTO MOTOCICLETAS') AS hurto_motos,
      COUNT(d.id) FILTER (WHERE d.tipo_delito = 'EXTORSION') AS extorsion,
      COUNT(d.id) FILTER (WHERE d.tipo_delito = 'DELITOS SEXUALES') AS delitos_sexuales,
      COUNT(d.id) FILTER (WHERE d.tipo_delito = 'SECUESTRO') AS secuestro,
      ST_AsGeoJSON(b.geom)::json AS geometry
    FROM barriosurbanos b
    LEFT JOIN gobierno_delitos d
      ON UPPER(TRIM(d.barrio_hecho)) = UPPER(TRIM(b.nombre))
      ${where}
    GROUP BY b.gid, b.nombre, b.geom
    HAVING COUNT(d.id) > 0
    ORDER BY total_delitos DESC
  `, params);

  const features = rows.map(r => ({
    type: 'Feature',
    geometry: r.geometry,
    properties: {
      gid: r.gid,
      nombre: r.nombre,
      total_delitos: parseInt(r.total_delitos, 10),
      homicidios: parseInt(r.homicidios, 10),
      hurto_personas: parseInt(r.hurto_personas, 10),
      lesiones: parseInt(r.lesiones, 10),
      violencia_intrafamiliar: parseInt(r.violencia_intrafamiliar, 10),
      hurto_motos: parseInt(r.hurto_motos, 10),
      extorsion: parseInt(r.extorsion, 10),
      delitos_sexuales: parseInt(r.delitos_sexuales, 10),
      secuestro: parseInt(r.secuestro, 10),
    }
  }));

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Lista de tipos de delito disponibles.
 */
export async function getTiposDelito() {
  const { rows } = await pool.query(`
    SELECT DISTINCT tipo_delito FROM gobierno_delitos ORDER BY tipo_delito
  `);
  return rows.map(r => r.tipo_delito);
}

/**
 * Listado de delitos con filtros (para tabla detallada).
 */
export async function getDelitos({ anio, tipo_delito, barrio, zona, limit = 100, offset = 0 } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (anio) { conditions.push(`anio = $${idx++}`); params.push(anio); }
  if (tipo_delito) { conditions.push(`tipo_delito = $${idx++}`); params.push(tipo_delito); }
  if (barrio) { conditions.push(`UPPER(barrio_hecho) = UPPER($${idx++})`); params.push(barrio); }
  if (zona) { conditions.push(`zona = $${idx++}`); params.push(zona); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  params.push(limit, offset);
  const { rows } = await pool.query(`
    SELECT tipo_delito, anio, mes, fecha_hecho, intervalo_hora, hora24,
           turno, dia_semana, zona, barrio_hecho, arma_medio, modalidad,
           genero, edad, grupo_edad, causa_lesion_muerte, clase_sitio
    FROM gobierno_delitos ${where}
    ORDER BY fecha_hecho DESC
    LIMIT $${idx++} OFFSET $${idx++}
  `, params);

  const countRes = await pool.query(`SELECT COUNT(*) FROM gobierno_delitos ${where}`, params.slice(0, -2));

  return {
    rows,
    total: parseInt(countRes.rows[0].count, 10),
    limit,
    offset,
  };
}
