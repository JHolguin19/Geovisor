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

// Paleta YlOrRd de 10 rangos para IPM (0=verde claro, 9=rojo muy oscuro)
const IPM_COLORS = [
  '#ffffcc', // 0–10
  '#ffeda0', // 10–20
  '#fed976', // 20–30
  '#feb24c', // 30–40
  '#fd8d3c', // 40–50
  '#fc4e2a', // 50–60
  '#e31a1c', // 60–70
  '#bd0026', // 70–80
  '#800026', // 80–90
  '#4d0013', // 90–100
];

// Estilo coroplético para IPM — 10 rangos de 0-100
export function makeIpmStyle(feature) {
  const ipm = Number(feature.get('ipm') ?? 0);
  const rangeIdx = Math.min(Math.floor(ipm / 10), 9);
  const hex = IPM_COLORS[rangeIdx];
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return new Style({
    fill: new Fill({ color: `rgba(${r},${g},${b},0.80)` }),
    stroke: new Stroke({ color: 'rgba(80,0,20,0.55)', width: 0.8 })
  });
}

// Resolución de estilo por configuración de capa
export function resolveStyleForConfig(layerConfig) {
  if (layerConfig.id === 'predios_urbanos') return makePrediosStyle();
  if (layerConfig.id === 'obras_pavimentacion' || layerConfig.id === 'pavimentacion2') return makePavimentacionStyle();
  if (layerConfig.id === 'ipm_santander') return makeIpmStyle;
  if (layerConfig.geometryType === 'line') return makeLineStyle(layerConfig);
  // Para WFS de puntos usamos point style
  if (layerConfig.type === 'wfs' || layerConfig.type === 'geojson') {
    if (layerConfig.geometryType === 'point') return makePointStyle(layerConfig);
  }
  return makeDefaultStyle(layerConfig);
}
