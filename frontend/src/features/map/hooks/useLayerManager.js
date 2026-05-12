import { useEffect, useRef, useContext } from 'react';
import MapContext from '../../../context/MapContext';
import { getLayerById } from '../../../config/layers';
import { SIS_UBA_IDS } from '../../../constants/ubas';
import { createLayerForConfig } from '../layers/layerFactory';

/**
 * Hook que gestiona agregar/quitar capas OL según activeLayers del contexto.
 *
 * @param {React.MutableRefObject} mapRef - Ref al mapa OL
 * @param {React.MutableRefObject} sisbenHeatmapRef - Ref del estado coroplético
 * @returns {React.MutableRefObject<Map>} layersRef — mapa de layerId → OL Layer
 */
export function useLayerManager(mapRef, sisbenHeatmapRef) {
  const layersRef = useRef(new globalThis.Map());
  const {
    activeLayers,
    setSisbenBarriosFeatures,
    setSelectedSisbenBarrio,
    setSisbenHeatmapVariable
  } = useContext(MapContext);

  useEffect(() => {
    if (!mapRef.current) return;

    const currentIds = new Set(layersRef.current.keys());
    const callbacks = { setSisbenBarriosFeatures };

    // Agregar capas nuevas
    activeLayers.forEach(layerId => {
      // Las capas delitos_* son gestionadas por useDelitosLayer (panel dinámico)
      if (layerId.startsWith('delitos_')) return;
      // zonarural_avaluos es gestionada por useZonaRuralLayer (panel dinámico)
      if (layerId === 'zonarural_avaluos') return;

      if (!currentIds.has(layerId)) {
        const layerConfig = getLayerById(layerId);
        if (!layerConfig) {
          console.warn(`[Layers] No se encontró config para layerId: "${layerId}"`);
          return;
        }
        const newLayer = createLayerForConfig(layerConfig, callbacks, sisbenHeatmapRef);
        layersRef.current.set(layerId, newLayer);
        mapRef.current.addLayer(newLayer);
      }
    });

    // Quitar capas deseleccionadas
    currentIds.forEach(layerId => {
      if (!activeLayers.has(layerId)) {
        // Limpiar estado sisben al desactivar la capa
        if (layerId === 'sisben_barrios' || SIS_UBA_IDS.has(layerId)) {
          setSelectedSisbenBarrio(null);
          setSisbenBarriosFeatures(null);
          setSisbenHeatmapVariable(null);
          if (sisbenHeatmapRef) {
            sisbenHeatmapRef.current = { variable: null, min: 0, max: 1 };
          }
        }
        const layer = layersRef.current.get(layerId);
        if (layer) {
          mapRef.current.removeLayer(layer);
          layersRef.current.delete(layerId);
        }
      }
    });
  }, [activeLayers, setSisbenBarriosFeatures, setSelectedSisbenBarrio, setSisbenHeatmapVariable, mapRef, sisbenHeatmapRef]);

  return layersRef;
}
