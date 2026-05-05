import { useEffect, useRef, useContext } from 'react';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import MapContext from '../../../context/MapContext';
import { makeDelitosStyle, makeDelitosCategorizedStyle } from '../styles/featureStyles';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Hook que gestiona una capa dinámica de delitos controlada por DelitosPanel.
 * Crea una VectorLayer dedicada ('delitos_panel') con datos frescos del API
 * cada vez que cambia delitosConfig (año, tipoDelito, vizMode).
 * La capa es visible cuando alguna capa delitos_* está activa en activeLayers.
 */
export function useDelitosLayer(mapRef) {
  const { activeLayers, delitosConfig } = useContext(MapContext);

  // Crear source y layer una sola vez (lazy init)
  const sourceRef = useRef(null);
  const layerRef = useRef(null);
  const addedToMapRef = useRef(false);

  if (!sourceRef.current) {
    sourceRef.current = new VectorSource();
    layerRef.current = new VectorLayer({
      source: sourceRef.current,
      style: makeDelitosStyle,
      properties: { name: 'delitos_panel' },
      zIndex: 15,
      visible: false,
    });
  }

  // Gestionar visibilidad + refetch cuando cambian activeLayers o delitosConfig
  useEffect(() => {
    if (!mapRef.current) return;

    // Agregar al mapa la primera vez que esté disponible
    if (!addedToMapRef.current) {
      mapRef.current.addLayer(layerRef.current);
      addedToMapRef.current = true;
    }

    const isActive = [...activeLayers].some(id => id.startsWith('delitos_'));
    layerRef.current.setVisible(isActive);

    if (!isActive) return;

    const { anio, tipoDelito, vizMode } = delitosConfig;

    // Actualizar estilo según modo
    layerRef.current.setStyle(
      vizMode === 'categorized' ? makeDelitosCategorizedStyle : makeDelitosStyle
    );

    // Construir URL con filtros
    const params = new URLSearchParams();
    if (anio) params.set('anio', String(anio));
    if (tipoDelito) params.set('tipo_delito', tipoDelito);

    const controller = new AbortController();

    fetch(`/api/delitos/geojson?${params.toString()}`, {
      headers: getAuthHeaders(),
      signal: controller.signal,
    })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(geojson => {
        const features = new GeoJSON().readFeatures(geojson, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857',
        });
        sourceRef.current.clear();
        sourceRef.current.addFeatures(features);
      })
      .catch(err => {
        if (err.name !== 'AbortError') console.error('[DelitosLayer]', err);
      });

    return () => controller.abort();
  }, [activeLayers, delitosConfig, mapRef]);

  // Limpiar capa al desmontar el mapa
  useEffect(() => {
    return () => {
      if (addedToMapRef.current && mapRef.current && layerRef.current) {
        mapRef.current.removeLayer(layerRef.current);
        addedToMapRef.current = false;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
