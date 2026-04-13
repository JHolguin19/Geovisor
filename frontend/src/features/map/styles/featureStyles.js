import { Style, Circle, Fill, Stroke } from 'ol/style';

// Convertir color hex a rgba con opacidad
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Predios urbanos: solo outline rojo fino (catastral)
export function makePrediosStyle() {
  return new Style({
    fill: new Fill({ color: 'rgba(0,0,0,0)' }),
    stroke: new Stroke({ color: '#E53935', width: 0.8 })
  });
}

// Obras de pavimentación: gris semitransparente
export function makePavimentacionStyle() {
  return new Style({
    fill: new Fill({ color: 'rgba(87,83,78,0.55)' }),
    stroke: new Stroke({ color: '#292524', width: 1.2 })
  });
}

// Estilo genérico para capas vectoriales (polígonos y puntos)
export function makeDefaultStyle(layerConfig) {
  const layerColor = layerConfig.color || '#3388ff';
  const pointColor = layerConfig.style?.fillColor || layerColor;

  return new Style({
    fill: new Fill({ color: hexToRgba(layerColor, 0.35) }),
    stroke: new Stroke({ color: layerColor, width: 1.5 }),
    image: new Circle({
      radius: layerConfig.style?.radius || 6,
      fill: new Fill({ color: pointColor }),
      stroke: new Stroke({ color: layerConfig.style?.strokeColor || '#ffffff', width: 1.5 })
    })
  });
}

// Estilo para líneas (rutas de alumbrado, etc.)
export function makeLineStyle(layerConfig) {
  return new Style({
    stroke: new Stroke({
      color: layerConfig.style?.strokeColor || '#facc15',
      width: layerConfig.style?.strokeWidth || 2
    })
  });
}

// Estilo para puntos (alumbrado, etc.)
export function makePointStyle(layerConfig) {
  return new Style({
    image: new Circle({
      radius: layerConfig.style?.radius || 6,
      fill: new Fill({ color: layerConfig.style?.fillColor || '#ff5722' }),
      stroke: new Stroke({ color: layerConfig.style?.strokeColor || '#ffffff', width: 1 })
    })
  });
}

// Resolución de estilo por configuración de capa
export function resolveStyleForConfig(layerConfig) {
  if (layerConfig.id === 'predios_urbanos') return makePrediosStyle();
  if (layerConfig.id === 'obras_pavimentacion' || layerConfig.id === 'pavimentacion2') return makePavimentacionStyle();
  if (layerConfig.geometryType === 'line') return makeLineStyle(layerConfig);
  // Para WFS de puntos usamos point style
  if (layerConfig.type === 'wfs' || layerConfig.type === 'geojson') {
    if (layerConfig.geometryType === 'point') return makePointStyle(layerConfig);
  }
  return makeDefaultStyle(layerConfig);
}
