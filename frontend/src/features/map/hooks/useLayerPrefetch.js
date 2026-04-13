import { useEffect } from 'react';
import { getAllLayers, getGeoJsonApiUrl } from '../../../config/layers';
import { SIS_UBA_MAP } from '../../../constants/ubas';
import * as geoCache from '../layers/geoJsonCache';

/**
 * IDs de capas pesadas que se prefetchean primero.
 * Orden = prioridad de descarga.
 */
const PRIORITY_LAYERS = [
  'predios_urbanos',
  'nomenclatura_vial',
  'barrios_urbanos',
  'obras_pavimentacion',
  'pavimentacion2',
];

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Construye la URL real para una capa, incluyendo capas sisben_uba con endpoint custom.
 */
function resolveUrl(layer) {
  if (SIS_UBA_MAP[layer.id]) {
    return `/api/sisben/uba/${SIS_UBA_MAP[layer.id]}/geojson`;
  }
  return getGeoJsonApiUrl(layer);
}

/**
 * Hook que al montar el mapa inicia la pre-carga de GeoJSON de todas las capas.
 *
 * - Las capas en PRIORITY_LAYERS se descargan primero (secuencialmente para no
 *   saturar la red mientras el usuario interactúa).
 * - El resto se descargan en paralelo con concurrencia limitada.
 *
 * @param {string} secretariaId - Secretaría activa (para filtrar si se desea)
 */
export function useLayerPrefetch(secretariaId) {
  useEffect(() => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) return; // Sin token no hay nada que prefetchear

    const allLayers = getAllLayers();
    const prioritySet = new Set(PRIORITY_LAYERS);

    // Separar en prioritarias y resto
    const priority = [];
    const rest = [];

    for (const layer of allLayers) {
      const url = resolveUrl(layer);
      if (geoCache.has(url)) continue; // Ya está en caché
      if (prioritySet.has(layer.id)) {
        priority.push({ layer, url });
      } else {
        rest.push({ layer, url });
      }
    }

    // Ordenar prioridad según el array PRIORITY_LAYERS
    priority.sort((a, b) =>
      PRIORITY_LAYERS.indexOf(a.layer.id) - PRIORITY_LAYERS.indexOf(b.layer.id)
    );

    let cancelled = false;

    async function prefetchAll() {
      // Fase 1: capas prioritarias — una por una para que la primera termine ASAP
      for (const { layer, url } of priority) {
        if (cancelled) return;
        console.log(`[Prefetch] Prioritario: ${layer.id}`);
        await geoCache.prefetch(url, headers);
      }

      // Fase 2: resto — en lotes de 3 para no saturar
      const BATCH_SIZE = 3;
      for (let i = 0; i < rest.length; i += BATCH_SIZE) {
        if (cancelled) return;
        const batch = rest.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(({ layer, url }) => {
            console.log(`[Prefetch] ${layer.id}`);
            return geoCache.prefetch(url, headers);
          })
        );
      }

      if (!cancelled) {
        console.log(`[Prefetch] Completado — ${priority.length + rest.length} capas cacheadas`);
      }
    }

    prefetchAll();

    return () => { cancelled = true; };
  }, [secretariaId]);
}
