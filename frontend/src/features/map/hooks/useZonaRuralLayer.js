import { useEffect, useRef, useContext } from 'react';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import MapContext from '../../../context/MapContext';
import {
  makeZonaRuralImpuestoStyle,
  makeZonaRuralAvaluoStyle,
  makeZonaRuralIncrementoStyle,
} from '../styles/featureStyles';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const STYLE_MAP = {
  impuesto:   makeZonaRuralImpuestoStyle,
  avaluo:     makeZonaRuralAvaluoStyle,
  incremento: makeZonaRuralIncrementoStyle,
};

/**
 * Hook that manages a dynamic zonarural property layer controlled by ZonaRuralPanel.
 * Creates a VectorLayer ('zonarural_panel') with property-level polygons.
 */
export function useZonaRuralLayer(mapRef) {
  const { activeLayers, zonaRuralConfig } = useContext(MapContext);

  const sourceRef = useRef(null);
  const layerRef = useRef(null);
  const addedToMapRef = useRef(false);

  if (!sourceRef.current) {
    sourceRef.current = new VectorSource();
    layerRef.current = new VectorLayer({
      source: sourceRef.current,
      style: makeZonaRuralImpuestoStyle,
      properties: { name: 'zonarural_panel' },
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

    const isActive = activeLayers.has('zonarural_avaluos');
    layerRef.current.setVisible(isActive);

    if (!isActive) return;

    const { vereda, colorBy } = zonaRuralConfig;

    layerRef.current.setStyle(STYLE_MAP[colorBy] || makeZonaRuralImpuestoStyle);

    const params = new URLSearchParams();
    if (vereda) params.set('vereda', vereda);
    if (colorBy) params.set('colorBy', colorBy);

    const controller = new AbortController();

    fetch(`/api/zonarural-avaluos/geojson/predios?${params.toString()}`, {
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
        if (err.name !== 'AbortError') console.error('[ZonaRuralLayer]', err);
      });

    return () => controller.abort();
  }, [activeLayers, zonaRuralConfig, mapRef]);

  useEffect(() => {
    return () => {
      if (addedToMapRef.current && mapRef.current && layerRef.current) {
        mapRef.current.removeLayer(layerRef.current);
        addedToMapRef.current = false;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
