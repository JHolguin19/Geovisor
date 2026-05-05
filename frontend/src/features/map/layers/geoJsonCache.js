/**
 * Caché en memoria para respuestas GeoJSON.
 *
 * Almacena el JSON crudo por URL para que `loadFeatures` no repita
 * la descarga cuando el usuario activa una capa que ya fue pre-cargada.
 */

const cache = new Map();          // url → Promise<geojson | null>
const ready = new Map();          // url → boolean (resolved)

/**
 * Devuelve la Promise del GeoJSON cacheado o null si no existe.
 */
export function getCached(url) {
  return cache.get(url) ?? null;
}

/**
 * Verifica si una URL ya fue solicitada (en curso o completada).
 */
export function has(url) {
  return cache.has(url);
}

/**
 * Verifica si la descarga ya terminó exitosamente.
 */
export function isReady(url) {
  return ready.get(url) === true;
}

/**
 * Descarga y cachea el GeoJSON de una URL.
 * Si ya existe una petición en curso, devuelve la misma Promise.
 */
export function prefetch(url, headers = {}) {
  if (cache.has(url)) return cache.get(url);

  const promise = fetch(url, { headers })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(geojson => {
      ready.set(url, true);
      return geojson;
    })
    .catch(err => {
      // Limpiar para permitir reintento
      cache.delete(url);
      ready.delete(url);
      console.warn(`[Prefetch] Error ${url}:`, err.message);
      return null;
    });

  cache.set(url, promise);
  return promise;
}

/**
 * Elimina una URL específica del caché (para forzar re-fetch).
 */
export function remove(url) {
  cache.delete(url);
  ready.delete(url);
}

/**
 * Limpia todo el caché (por ejemplo al hacer logout).
 */
export function clearCache() {
  cache.clear();
  ready.clear();
}
