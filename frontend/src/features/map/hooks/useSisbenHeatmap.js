import { useEffect, useRef, useContext } from 'react';
import MapContext from '../../../context/MapContext';
import { SIS_UBA_IDS } from '../../../constants/ubas';

/**
 * Hook que gestiona el estado coroplético de Sisben y refresca estilos.
 *
 * @param {React.MutableRefObject<Map>} layersRef - Ref del mapa layerId → OL Layer
 * @returns {React.MutableRefObject} sisbenHeatmapRef - Ref con { variable, min, max, isProportion }
 */
export function useSisbenHeatmap(layersRef) {
  const { sisbenHeatmapVariable, sisbenBarriosFeatures } = useContext(MapContext);
  const sisbenHeatmapRef = useRef({ variable: null, min: 0, max: 1, isProportion: false });

  useEffect(() => {
    if (sisbenHeatmapVariable && sisbenBarriosFeatures?.length) {
      const values = sisbenBarriosFeatures
        .map(p => Number(p[sisbenHeatmapVariable]))
        .filter(v => !isNaN(v) && isFinite(v));
      const min = values.length ? Math.min(...values) : 0;
      const max = values.length ? Math.max(...values) : 1;
      const isProportion = values.length > 0
        && values.every(v => v >= 0 && v <= 1)
        && values.some(v => v > 0 && v < 1);
      sisbenHeatmapRef.current = { variable: sisbenHeatmapVariable, min, max, isProportion };
    } else {
      sisbenHeatmapRef.current = { variable: null, min: 0, max: 1, isProportion: false };
    }

    // Refrescar estilos en sisben_barrios y en cualquier sis_uba* activa
    const barLayer = layersRef.current.get('sisben_barrios');
    if (barLayer) barLayer.changed();
    SIS_UBA_IDS.forEach(id => {
      const l = layersRef.current.get(id);
      if (l) l.changed();
    });
  }, [sisbenHeatmapVariable, sisbenBarriosFeatures, layersRef]);

  return sisbenHeatmapRef;
}
