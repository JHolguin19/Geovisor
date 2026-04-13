import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { getGeoJsonApiUrl } from '../../../config/layers';
import { SIS_UBA_MAP } from '../../../constants/ubas';
import { makeChoroplethStyleFn } from '../styles/choroplethStyle';
import { loadFeatures, extractFeatureProperties } from './loadFeatures';

/**
 * Crea capa Sisben Barrios — polígonos con soporte coroplético.
 *
 * @param {object} layerConfig - Configuración de la capa
 * @param {object} callbacks - { setSisbenBarriosFeatures }
 * @param {React.MutableRefObject} sisbenHeatmapRef - Ref del estado coroplético
 */
export function createSisbenBarriosLayer(layerConfig, callbacks, sisbenHeatmapRef) {
  const source = new VectorSource();

  loadFeatures(source, getGeoJsonApiUrl(layerConfig), {
    assignColorIdx: true,
    layerId: layerConfig.id,
    onLoaded: (features) => {
      if (callbacks.setSisbenBarriosFeatures) {
        callbacks.setSisbenBarriosFeatures(extractFeatureProperties(features));
      }
    },
  });

  return new VectorLayer({
    source,
    style: makeChoroplethStyleFn(sisbenHeatmapRef),
    properties: { name: layerConfig.id },
    visible: true,
    zIndex: 5
  });
}

/**
 * Crea capa Sisben por UBA — geometría UBA + datos Sisben cruzados.
 * Usa el endpoint /api/sisben/uba/:ubaId/geojson.
 *
 * @param {object} layerConfig - Configuración de la capa (id debe estar en SIS_UBA_MAP)
 * @param {object} callbacks - { setSisbenBarriosFeatures }
 * @param {React.MutableRefObject} sisbenHeatmapRef - Ref del estado coroplético
 */
export function createSisbenUbaLayer(layerConfig, callbacks, sisbenHeatmapRef) {
  const ubaId = SIS_UBA_MAP[layerConfig.id];
  const apiUrl = `/api/sisben/uba/${ubaId}/geojson`;
  const source = new VectorSource();

  loadFeatures(source, apiUrl, {
    assignColorIdx: true,
    layerId: layerConfig.id,
    onLoaded: (features) => {
      if (callbacks.setSisbenBarriosFeatures) {
        callbacks.setSisbenBarriosFeatures(extractFeatureProperties(features));
      }
    },
  });

  return new VectorLayer({
    source,
    style: makeChoroplethStyleFn(sisbenHeatmapRef),
    properties: { name: layerConfig.id },
    visible: true,
    zIndex: 5
  });
}
