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

// Module-level cache: url → GeoJSON object (persists for the browser session)
const _geoCache = new Map();

const FORMAT = new GeoJSON();

function parseFeatures(geojson) {
  return FORMAT.readFeatures(geojson, {
    dataProjection: 'EPSG:4326',
    featureProjection: 'EPSG:3857',
  });
}

/**
 * Hook that manages a dynamic zonarural property layer controlled by ZonaRuralPanel.
 * Creates a VectorLayer ('zonarural_panel') with property-level polygons.
 *
 * Optimizations:
 *  - /geojson now reads from a materialized view (pre-computed ST_Union per vereda)
 *  - Module-level cache avoids re-fetching the same URL while the tab is open
 *  - The cached GeoJSON is stored as already-parsed OL features
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

    const url = vereda
      ? `/api/zonarural-avaluos/geojson/predios?vereda=${encodeURIComponent(vereda)}&colorBy=${colorBy}`
      : `/api/zonarural-avaluos/geojson?mode=${colorBy}`;

    // Use cached features if available — no network request needed
    if (_geoCache.has(url)) {
      sourceRef.current.clear();
      sourceRef.current.addFeatures(_geoCache.get(url));
      return;
    }

    const controller = new AbortController();

    fetch(url, {
      headers: getAuthHeaders(),
      signal: controller.signal,
    })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(geojson => {
        const features = parseFeatures(geojson);
        _geoCache.set(url, features);
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
