import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { getGeoJsonApiUrl } from '../../../config/layers';
import { UBA_IDS, SIS_UBA_IDS } from '../../../constants/ubas';
import { resolveStyleForConfig } from '../styles/featureStyles';
import { loadFeatures } from './loadFeatures';
import { createBarriosLayer } from './createBarriosLayer';
import { createUbaLayer } from './createUbaLayer';
import { createSisbenBarriosLayer, createSisbenUbaLayer } from './createSisbenLayer';

/**
 * Factory principal: crea la capa OL correcta según la configuración.
 *
 * @param {object} layerConfig - Configuración de layers.js
 * @param {object} callbacks - { setSisbenBarriosFeatures }
 * @param {React.MutableRefObject} sisbenHeatmapRef - Ref del estado coroplético
 * @returns {import('ol/layer/Vector').default}
 */
export function createLayerForConfig(layerConfig, callbacks = {}, sisbenHeatmapRef = null) {
  // Barrios urbanos — estilo especial con colores pasteles y etiquetas
  if (layerConfig.id === 'barrios_urbanos') {
    return createBarriosLayer(layerConfig);
  }

  // Sisben barrios — soporte coroplético
  if (layerConfig.id === 'sisben_barrios') {
    return createSisbenBarriosLayer(layerConfig, callbacks, sisbenHeatmapRef);
  }

  // UBAs geográficas (uba1..ubac) — color pastel propio
  if (UBA_IDS.has(layerConfig.id)) {
    return createUbaLayer(layerConfig);
  }

  // Sisben por UBA (sis_uba1..sis_ubac) — geometría UBA + datos Sisben
  if (SIS_UBA_IDS.has(layerConfig.id)) {
    return createSisbenUbaLayer(layerConfig, callbacks, sisbenHeatmapRef);
  }

  // Capa genérica (WMS/WFS/GeoJSON desde PostGIS)
  return createGenericLayer(layerConfig);
}

/**
 * Capa genérica — polígonos, puntos o líneas con estilo basado en config.
 */
function createGenericLayer(layerConfig) {
  const source = new VectorSource();

  const url = layerConfig.apiUrl || getGeoJsonApiUrl(layerConfig);

  loadFeatures(source, url, {
    layerId: layerConfig.id,
  });

  const style = resolveStyleForConfig(layerConfig);

  return new VectorLayer({
    source,
    style,
    properties: { name: layerConfig.id },
    visible: true,
    opacity: layerConfig.opacity || 1,
    zIndex: layerConfig.zIndex || 1
  });
}
