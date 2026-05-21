import { useEffect, useCallback, useContext } from 'react';
import MapContext from '../../../context/MapContext';
import { UBA_IDS } from '../../../constants/ubas';
import { QUERY_PRIORITY, ALUMBRADO_WFS, formatPredios, esc } from '../popups/popupConfig';

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
      contenido = `<strong>⚡ ${esc(label)}</strong><br><strong>ID:</strong> ${esc(p.Name || p.name || p.NAME) || '(sin identificador)'}`;
    }, { hitTolerance: 10 });

    // 2. Detectar rutas de alumbrado (líneas, tolerancia mayor)
    if (!contenido) {
      map.forEachFeatureAtPixel(event.pixel, (feature, layer) => {
        if (contenido) return;
        if (layer?.get('name') !== 'rutas_alumbrado_publico' || !activeLayers.has('rutas_alumbrado_publico')) return;
        const p = feature.getProperties();
        contenido = `<strong>⚡ Ruta Eléctrica</strong><br><strong>ID:</strong> ${esc(p.Name || p.name || p.NAME) || '(sin identificador)'}`;
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
        contenido = `<strong>🏘️ Barrio:</strong> ${esc(p.nombre) || ''}`;
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
        contenido = `<strong>🏘️ Barrio:</strong> ${esc(p.nombre) || ''}<br><strong>🏢 UBA:</strong> ${ubaNum}`;
      });
    }

    // 6. Capa dinámica delitos_panel (controlada por DelitosPanel)
    if (!contenido) {
      const hasDelitosActive = [...activeLayers].some(id => id.startsWith('delitos_'));
      if (hasDelitosActive) {
        const panelEntry = QUERY_PRIORITY.find(e => e.id === 'delitos_panel');
        if (panelEntry) {
          map.forEachFeatureAtPixel(event.pixel, (feature, layer) => {
            if (contenido) return;
            if (layer?.get('name') !== 'delitos_panel') return;
            contenido = panelEntry.props(feature.getProperties());
          }, { hitTolerance: 5 });
        }
      }
    }

    // 6b. Capa dinámica aguas_veredas_panel (controlada por AguasPanel)
    if (!contenido) {
      if (activeLayers.has('aguas_veredas_acueductos')) {
        const panelEntry = QUERY_PRIORITY.find(e => e.id === 'aguas_veredas_panel');
        if (panelEntry) {
          map.forEachFeatureAtPixel(event.pixel, (feature, layer) => {
            if (contenido) return;
            if (layer?.get('name') !== 'aguas_veredas_panel') return;
            contenido = panelEntry.props(feature.getProperties());
          }, { hitTolerance: 5 });
        }
      }
    }

    // 7. Prioridades vectoriales
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

    // 8. Fallback: predios urbanos (siempre activo)
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
