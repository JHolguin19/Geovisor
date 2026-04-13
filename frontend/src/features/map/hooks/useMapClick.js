import { useEffect, useCallback, useContext } from 'react';
import MapContext from '../../../context/MapContext';
import { UBA_IDS } from '../../../constants/ubas';
import { QUERY_PRIORITY, ALUMBRADO_WFS, formatPredios } from '../popups/popupConfig';

/**
 * Hook que maneja clicks en el mapa: detecta features con prioridad y muestra popup.
 *
 * @param {React.MutableRefObject} mapRef - Ref al mapa OL
 * @param {React.MutableRefObject} overlayRef - Ref al overlay del popup
 * @param {React.RefObject} popupContentRef - Ref al div de contenido del popup
 */
export function useMapClick(mapRef, overlayRef, popupContentRef) {
  const {
    activeLayers,
    setSelectedFeature,
    activeTool,
    setSelectedSisbenBarrio
  } = useContext(MapContext);

  const handleMapClick = useCallback((event) => {
    if (activeTool) return;
    const map = mapRef.current;
    if (!map) return;

    const coordinate = event.coordinate;
    let contenido = '';

    // 1. Detectar features WFS de alumbrado (puntos)
    map.forEachFeatureAtPixel(event.pixel, (feature, layer) => {
      if (contenido) return;
      const layerId = layer?.get('name');
      const label = ALUMBRADO_WFS[layerId];
      if (!label || !activeLayers.has(layerId) || layerId === 'rutas_alumbrado_publico') return;
      const p = feature.getProperties();
      contenido = `<strong>⚡ ${label}</strong><br><strong>ID:</strong> ${p.Name || p.name || p.NAME || '(sin identificador)'}`;
    }, { hitTolerance: 10 });

    // 2. Detectar rutas de alumbrado (líneas, tolerancia mayor)
    if (!contenido) {
      map.forEachFeatureAtPixel(event.pixel, (feature, layer) => {
        if (contenido) return;
        if (layer?.get('name') !== 'rutas_alumbrado_publico' || !activeLayers.has('rutas_alumbrado_publico')) return;
        const p = feature.getProperties();
        contenido = `<strong>⚡ Ruta Eléctrica</strong><br><strong>ID:</strong> ${p.Name || p.name || p.NAME || '(sin identificador)'}`;
      }, { hitTolerance: 20 });
    }

    // 3. Detectar sisben_barrios (polygon) → abre panel lateral, no popup
    if (!contenido && activeLayers.has('sisben_barrios')) {
      let sisbenClicked = false;
      map.forEachFeatureAtPixel(event.pixel, (feature, layer) => {
        if (sisbenClicked) return;
        if (layer?.get('name') !== 'sisben_barrios') return;
        const p = { ...feature.getProperties() };
        delete p.geometry;
        setSelectedSisbenBarrio(p);
        sisbenClicked = true;
      });
      if (sisbenClicked) return;
    }

    // 4. Detectar barrios (polygon)
    if (!contenido && activeLayers.has('barrios_urbanos')) {
      map.forEachFeatureAtPixel(event.pixel, (feature, layer) => {
        if (contenido) return;
        if (layer?.get('name') !== 'barrios_urbanos') return;
        const p = feature.getProperties();
        contenido = `<strong>🏘️ Barrio:</strong> ${p.nombre || ''}`;
      });
    }

    // 5. Detectar UBAs (polygon)
    if (!contenido) {
      map.forEachFeatureAtPixel(event.pixel, (feature, layer) => {
        if (contenido) return;
        const layerId = layer?.get('name');
        if (!UBA_IDS.has(layerId) || !activeLayers.has(layerId)) return;
        const p = feature.getProperties();
        const ubaNum = layerId === 'ubac' ? 'C' : layerId.replace('uba', '');
        contenido = `<strong>🏘️ Barrio:</strong> ${p.nombre || ''}<br><strong>🏢 UBA:</strong> ${ubaNum}`;
      });
    }

    // 6. Prioridades vectoriales
    if (!contenido) {
      for (const { id, props } of QUERY_PRIORITY) {
        if (!activeLayers.has(id)) continue;
        map.forEachFeatureAtPixel(event.pixel, (feature, layer) => {
          if (contenido) return;
          if (layer?.get('name') !== id) return;
          const p = feature.getProperties();
          contenido = props(p);
        }, { hitTolerance: 5 });
        if (contenido) break;
      }
    }

    // 7. Fallback: predios urbanos (siempre activo)
    if (!contenido) {
      map.forEachFeatureAtPixel(event.pixel, (feature, layer) => {
        if (contenido) return;
        if (layer?.get('name') !== 'predios_urbanos') return;
        contenido = formatPredios(feature.getProperties());
      }, { hitTolerance: 3 });
    }

    if (!contenido) return;

    popupContentRef.current.innerHTML = contenido;
    overlayRef.current.setPosition(coordinate);
    setSelectedFeature({ coordinate, contenido });
  }, [activeLayers, setSelectedFeature, activeTool, setSelectedSisbenBarrio, mapRef, overlayRef, popupContentRef]);

  // Registrar/re-registrar el click handler
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.on('click', handleMapClick);
    return () => map.un('click', handleMapClick);
  }, [handleMapClick, mapRef]);
}
