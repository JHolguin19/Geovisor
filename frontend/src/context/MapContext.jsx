import { createContext, useState, useCallback } from 'react';

const MapContext = createContext(null);

export function MapProvider({ children }) {
  const [map, setMap] = useState(null);
  const [activeLayers, setActiveLayers] = useState(new Set());
  const [selectedFeature, setSelectedFeature] = useState(null);
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

  const value = {
    map,
    setMap,
    activeLayers,
    setActiveLayers,
    selectedFeature,
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
    setSisbenBarriosFeatures,
  };

  return (
    <MapContext.Provider value={value}>
      {children}
    </MapContext.Provider>
  );
}

export default MapContext;
