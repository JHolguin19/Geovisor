import { useEffect, useRef, useContext } from 'react';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import MapContext from '../../../context/MapContext';
import { makeAguasVeredasStyle } from '../styles/featureStyles';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Hook que gestiona la capa dinámica de veredas de acueducto con filtro
 * por SISTEMA_ACUEDUCTO. Reactiva al cambiar aguasConfig.sistemaFiltro.
 * La capa es visible cuando 'aguas_veredas_acueductos' está activa.
 */
export function useAguasLayer(mapRef) {
  const { activeLayers, aguasConfig } = useContext(MapContext);

  const sourceRef = useRef(null);
  const layerRef = useRef(null);
  const addedToMapRef = useRef(false);

  if (!sourceRef.current) {
    sourceRef.current = new VectorSource();
    layerRef.current = new VectorLayer({
      source: sourceRef.current,
      style: makeAguasVeredasStyle(null),
      properties: { name: 'aguas_veredas_panel' },
      zIndex: 12,
      visible: false,
    });
  }

  useEffect(() => {
    if (!mapRef.current) return;

    if (!addedToMapRef.current) {
      mapRef.current.addLayer(layerRef.current);
      addedToMapRef.current = true;
    }

    const isActive = activeLayers.has('aguas_veredas_acueductos');
    layerRef.current.setVisible(isActive);

    // Ocultar la capa estática de useLayerManager para evitar duplicados
    mapRef.current.getLayers().forEach(lyr => {
      if (lyr?.get('name') === 'aguas_veredas_acueductos') {
        lyr.setVisible(false);
      }
    });

    if (!isActive) return;

    // Actualizar estilo según filtro activo
    layerRef.current.setStyle(makeAguasVeredasStyle(aguasConfig));

    // Si ya tiene features y solo cambia el filtro, re-aplicar estilo sin refetch
    if (sourceRef.current.getFeatures().length > 0 && aguasConfig?._styleOnly) {
      return;
    }

    const controller = new AbortController();

    fetch(`/api/geodata/${encodeURIComponent('planeacion_aguas_veredas_acueductos')}`, {
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
        // Re-aplicar estilo con filtro tras cargar
        layerRef.current.setStyle(makeAguasVeredasStyle(aguasConfig));
      })
      .catch(err => {
        if (err.name !== 'AbortError') console.error('[AguasLayer]', err);
      });

    return () => controller.abort();
  }, [activeLayers, mapRef]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-aplicar estilo sin refetch cuando cambia el filtro
  useEffect(() => {
    if (!layerRef.current) return;
    layerRef.current.setStyle(makeAguasVeredasStyle(aguasConfig));
  }, [aguasConfig]);

  useEffect(() => {
    return () => {
      if (addedToMapRef.current && mapRef.current && layerRef.current) {
        mapRef.current.removeLayer(layerRef.current);
        addedToMapRef.current = false;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
