import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Style, Fill, Stroke } from 'ol/style';
import { UBA_PASTEL } from '../styles/constants';
import { getGeoJsonApiUrl } from '../../../config/layers';
import { loadFeatures } from './loadFeatures';

export function createUbaLayer(layerConfig) {
  const source = new VectorSource();

  loadFeatures(source, getGeoJsonApiUrl(layerConfig), {
    layerId: layerConfig.id,
  });

  const [r, g, b] = UBA_PASTEL[layerConfig.id] || [200, 200, 200];

  const ubaStyle = new Style({
    fill: new Fill({ color: `rgba(${r}, ${g}, ${b}, 0.35)` }),
    stroke: new Stroke({ color: `rgba(${Math.max(r - 50, 0)}, ${Math.max(g - 50, 0)}, ${Math.max(b - 50, 0)}, 0.8)`, width: 1.5 })
  });

  return new VectorLayer({
    source,
    style: ubaStyle,
    properties: { name: layerConfig.id },
    visible: true,
    zIndex: 3
  });
}
