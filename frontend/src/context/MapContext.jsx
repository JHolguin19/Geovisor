import { createContext, useState, useCallback, useRef, useEffect } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat } from 'ol/proj';

const MapContext = createContext(null);

// Centro de Santander de Quilichao
const CENTER = [-76.483765, 3.012569];

export function MapProvider({ children }) {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [activeLayers, setActiveLayers] = useState(new Set());
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [activeTool, setActiveTool] = useState(null);
  const [bufferRadius, setBufferRadius] = useState(100);
  const [selectionResults, setSelectionResults] = useState(null);
  const [toolVersion, setToolVersion] = useState(0);
  const [selectedSisbenBarrio, setSelectedSisbenBarrio] = useState(null);
  const [sisbenHeatmapVariable, setSisbenHeatmapVariable] = useState(null);
  const [sisbenBarriosFeatures, setSisbenBarriosFeatures] = useState(null);

  const clearTools = useCallback(() => {
    setActiveTool(null);
    setSelectionResults(null);
    setToolVersion(v => v + 1);
  }, []);

  // Inicializar mapa
  const initMap = useCallback((targetElement) => {
    if (mapRef.current) {
      mapRef.current.setTarget(undefined);
    }

    const newMap = new Map({
      target: targetElement,
      layers: [
        new TileLayer({
          source: new OSM(),
          name: 'osm'
        })
      ],
      view: new View({
        center: fromLonLat(CENTER),
        zoom: 14,
        projection: 'EPSG:3857'
      })
    });

    mapRef.current = newMap;
    setMap(newMap);
    setMapReady(true);

    return newMap;
  }, []);

  // Limpiar mapa al desmontar
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.setTarget(undefined);
      }
    };
  }, []);

  // Agregar capa
  const addLayer = useCallback((layer) => {
    if (map) {
      map.addLayer(layer);
    }
  }, [map]);

  // Remover capa
  const removeLayer = useCallback((layer) => {
    if (map) {
      map.removeLayer(layer);
    }
  }, [map]);

  // Obtener capa por nombre
  const getLayerByName = useCallback((name) => {
    if (!map) return null;
    const layers = map.getLayers().getArray();
    return layers.find(layer => layer.get('name') === name);
  }, [map]);

  // Alternar visibilidad de capa
  const toggleLayerVisibility = useCallback((layerName) => {
    const layer = getLayerByName(layerName);
    if (layer) {
      layer.setVisible(!layer.getVisible());
    }
  }, [getLayerByName]);

  // Zoom a extensión
  const zoomToExtent = useCallback((extent) => {
    if (map) {
      map.getView().fit(extent, { padding: [50, 50, 50, 50] });
    }
  }, [map]);

  // Obtener información en un punto (GetFeatureInfo)
  const getFeatureInfoAt = useCallback(async (coordinate, layers, options = {}) => {
    if (!map) return null;

    const view = map.getView();
    const resolution = view.getResolution();
    const projection = view.getProjection();

    // Implementar GetFeatureInfo para cada capa
    const results = [];

    for (const layer of layers) {
      if (layer.getSource && layer.getSource().getFeatureInfoUrl) {
        const url = layer.getSource().getFeatureInfoUrl(
          coordinate,
          resolution,
          projection,
          {
            INFO_FORMAT: options.format || 'application/json',
            FEATURE_COUNT: options.featureCount || 10,
            ...options.params
          }
        );

        try {
          const response = await fetch(url);
          const data = await response.json();
          if (data.features && data.features.length > 0) {
            results.push({
              layerName: layer.get('name'),
              features: data.features
            });
          }
        } catch (error) {
          console.error(`Error en GetFeatureInfo para ${layer.get('name')}:`, error);
        }
      }
    }

    return results;
  }, [map]);

  const value = {
    map,
    mapReady,
    activeLayers,
    selectedFeature,
    initMap,
    setMap,
    addLayer,
    removeLayer,
    getLayerByName,
    toggleLayerVisibility,
    zoomToExtent,
    getFeatureInfoAt,
    setActiveLayers,
    setSelectedFeature,
    activeTool,
    setActiveTool,
    bufferRadius,
    setBufferRadius,
    selectionResults,
    setSelectionResults,
    toolVersion,
    clearTools,
    selectedSisbenBarrio,
    setSelectedSisbenBarrio,
    sisbenHeatmapVariable,
    setSisbenHeatmapVariable,
    sisbenBarriosFeatures,
    setSisbenBarriosFeatures
  };

  return (
    <MapContext.Provider value={value}>
      {children}
    </MapContext.Provider>
  );
}

export default MapContext;