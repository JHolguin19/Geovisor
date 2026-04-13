/**
 * Limpia un nombre para usar como tabla PostgreSQL.
 * Solo permite letras, números y guiones bajos.
 */
export function sanitizeTableName(name) {
  return name
    .replace(/\.[^.]+$/, '')        // quitar extensión
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')   // solo letras, números y guiones bajos
    .replace(/^[0-9]/, 't$&')       // no empezar con número
    .substring(0, 60);
}

/**
 * Detecta columnas de latitud/longitud en los encabezados de un archivo.
 */
export function detectLatLon(columns) {
  const latCandidates = ['lat', 'latitude', 'latitud', 'y', 'lat_y', 'coord_y'];
  const lonCandidates = ['lon', 'lng', 'longitude', 'longitud', 'x', 'lon_x', 'coord_x'];
  const cols = columns.map(c => c.toLowerCase());
  const latCol = columns.find((_, i) => latCandidates.includes(cols[i]));
  const lonCol = columns.find((_, i) => lonCandidates.includes(cols[i]));
  return { latCol, lonCol };
}
