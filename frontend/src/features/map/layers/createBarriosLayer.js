import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Style, Fill, Stroke } from 'ol/style';
import Text from 'ol/style/Text';
import { PASTEL_BARRIOS } from '../styles/constants';
import { getGeoJsonApiUrl } from '../../../config/layers';
import { loadFeatures } from './loadFeatures';

export function createBarriosLayer(layerConfig) {
  const source = new VectorSource();

  loadFeatures(source, getGeoJsonApiUrl(layerConfig), {
    assignColorIdx: true,
    layerId: layerConfig.id,
  });

  const styleFunction = (feature) => {
    const [r, g, b] = PASTEL_BARRIOS[feature.get('_colorIdx') ?? 0];
    return new Style({
      fill: new Fill({ color: `rgba(${r}, ${g}, ${b}, 0.35)` }),
      stroke: new Stroke({ color: `rgba(${r - 40}, ${g - 40}, ${b - 40}, 0.8)`, width: 1.5 }),
      text: new Text({
        text: feature.get('nombre') || '',
        font: 'bold 11px sans-serif',
        fill: new Fill({ color: '#222222' }),
        stroke: new Stroke({ color: 'rgba(255,255,255,0.9)', width: 3 }),
        overflow: true,
        placement: 'point'
      })
    });
  };

  return new VectorLayer({
    source,
    style: styleFunction,
    properties: { name: layerConfig.id },
    visible: true,
    zIndex: 4
  });
}
