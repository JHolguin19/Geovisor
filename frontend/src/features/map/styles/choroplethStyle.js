import { Style, Fill, Stroke } from 'ol/style';
import Text from 'ol/style/Text';
import { getChoroplethColor, PASTEL_BARRIOS } from './constants';

// Obtener nombre del barrio de las propiedades (varios nombres posibles)
function getBarrioName(feature) {
  return feature.get('nombre') || feature.get('nombre_barrio')
    || feature.get('NOMBRE') || feature.get('barrio')
    || feature.get('BARRIO') || feature.get('nom_barrio') || '';
}

// Formatea el valor numérico para mostrar en etiqueta
function formatLabel(value, isProportion) {
  if (isProportion) return `${Math.round(value * 100)}%`;
  if (!Number.isInteger(value)) return value.toLocaleString('es-CO', { maximumFractionDigits: 1 });
  return value.toLocaleString('es-CO');
}

/**
 * Crea una función de estilo para capas con soporte coroplético (Sisben barrios/UBA).
 * Cuando sisbenHeatmapRef.current.variable es null, usa colores pasteles por barrio.
 * Cuando tiene variable, usa degradado coroplético.
 *
 * @param {React.MutableRefObject} sisbenHeatmapRef - Ref con { variable, min, max, isProportion }
 * @returns {function} Función de estilo para OpenLayers
 */
export function makeChoroplethStyleFn(sisbenHeatmapRef) {
  return (feature) => {
    const { variable, min, max, isProportion } = sisbenHeatmapRef.current;

    if (variable) {
      // Modo coroplético
      const raw = Number(feature.get(variable));
      const value = isNaN(raw) ? 0 : raw;
      const [r, g, b] = getChoroplethColor(value, min, max);
      const labelVal = formatLabel(value, isProportion);
      const barrioName = getBarrioName(feature);
      const labelText = barrioName ? `${labelVal}\n${barrioName}` : labelVal;

      return new Style({
        fill: new Fill({ color: `rgba(${r}, ${g}, ${b}, 0.78)` }),
        stroke: new Stroke({ color: 'rgba(74, 20, 140, 0.5)', width: 1.2 }),
        text: new Text({
          text: labelText,
          font: 'bold 11px sans-serif',
          fill: new Fill({ color: '#1a0030' }),
          stroke: new Stroke({ color: 'rgba(255,255,255,0.9)', width: 3 }),
          overflow: true,
          placement: 'point'
        })
      });
    }

    // Modo predeterminado: colores pasteles por barrio + etiqueta nombre
    const [r, g, b] = PASTEL_BARRIOS[feature.get('_colorIdx') ?? 0];
    const nombre = getBarrioName(feature);
    return new Style({
      fill: new Fill({ color: `rgba(${r}, ${g}, ${b}, 0.65)` }),
      stroke: new Stroke({ color: `rgba(${Math.max(r - 40, 0)}, ${Math.max(g - 40, 0)}, ${Math.max(b - 40, 0)}, 0.9)`, width: 1.8 }),
      text: new Text({
        text: nombre,
        font: 'bold 11px sans-serif',
        fill: new Fill({ color: '#111111' }),
        stroke: new Stroke({ color: 'rgba(255,255,255,0.95)', width: 3 }),
        overflow: true,
        placement: 'point'
      })
    });
  };
}
