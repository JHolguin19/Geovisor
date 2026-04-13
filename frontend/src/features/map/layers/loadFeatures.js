import GeoJSON from 'ol/format/GeoJSON';
import { PASTEL_BARRIOS } from '../styles/constants';
import * as geoCache from './geoJsonCache';

// Helper para obtener token JWT del localStorage
function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Carga features GeoJSON desde una URL en un VectorSource.
 * Usa caché en memoria: si la URL ya fue pre-cargada, usa los datos cacheados.
 *
 * @param {import('ol/source/Vector').default} source - VectorSource destino
 * @param {string} url - URL de la API
 * @param {object} [options]
 * @param {boolean} [options.assignColorIdx] - Asignar _colorIdx para estilo pasteles
 * @param {function} [options.onLoaded] - Callback con array de features cargados
 * @param {string} [options.layerId] - ID para logging
 */
export function loadFeatures(source, url, options = {}) {
  const { assignColorIdx = false, onLoaded, layerId = '' } = options;

  // Intentar obtener del caché; si no existe, hace fetch y lo cachea
  const geojsonPromise = geoCache.has(url)
    ? geoCache.getCached(url)
    : geoCache.prefetch(url, getAuthHeaders());

  geojsonPromise
    .then(geojson => {
      if (!geojson) throw new Error('GeoJSON vacío o error en descarga');

      const features = new GeoJSON().readFeatures(geojson, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      });
      if (assignColorIdx) {
        features.forEach((f, i) => f.set('_colorIdx', i % PASTEL_BARRIOS.length));
      }
      source.addFeatures(features);
      console.log(`[GeoData] "${layerId}": ${features.length} features${geoCache.isReady(url) ? ' (cached)' : ''}`);
      if (onLoaded) onLoaded(features);
    })
    .catch(err => console.error(`[GeoData ERROR] "${layerId}":`, err));
}

/**
 * Extrae propiedades (sin geometría) de un array de features OL.
 * Útil para pasar datos a paneles laterales.
 */
export function extractFeatureProperties(features) {
  return features.map(f => {
    const p = { ...f.getProperties() };
    delete p.geometry;
    return p;
  });
}
