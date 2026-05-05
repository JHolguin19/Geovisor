import { useRef, useEffect } from 'react';
import { useMapInit } from '../../features/map/hooks/useMapInit';
import { useLayerManager } from '../../features/map/hooks/useLayerManager';
import { useMapClick } from '../../features/map/hooks/useMapClick';
import { useMapTools } from '../../features/map/hooks/useMapTools';
import { useSisbenHeatmap } from '../../features/map/hooks/useSisbenHeatmap';
import { useDelitosLayer } from '../../features/map/hooks/useDelitosLayer';
import BasemapSwitcher from '../../features/map/components/BasemapSwitcher';
import PopupOverlay from '../../features/map/components/PopupOverlay';
import './MapViewer.css';

export default function MapViewer() {
  const mapContainerRef = useRef(null);
  const popupRef = useRef(null);
  const popupContentRef = useRef(null);
  const popupCloserRef = useRef(null);

  // Hook 1: Inicializa mapa OL, basemaps, overlay, tool layer
  const { mapRef, overlayRef, toolSourceRef, basemap, setBasemap } =
    useMapInit(mapContainerRef, popupRef);

  // Hook 2: Estado coroplético de Sisben (debe ir antes de useLayerManager)
  // Necesitamos layersRef pero useSisbenHeatmap lo recibe — usamos un ref intermedio
  const layersRefProxy = useRef(new globalThis.Map());
  const sisbenHeatmapRef = useSisbenHeatmap(layersRefProxy);

  // Hook 3: Gestiona capas activas (add/remove según activeLayers)
  const layersRef = useLayerManager(mapRef, sisbenHeatmapRef);

  // Sincronizar layersRefProxy con layersRef real
  useEffect(() => {
    layersRefProxy.current = layersRef.current;
  });

  // Hook 4: Click en mapa — detecta features con prioridad, muestra popup
  useMapClick(mapRef, overlayRef, popupContentRef);

  // Hook 5: Herramientas SIG (medición, buffer, selección)
  useMapTools(mapRef, toolSourceRef);

  // Hook 6: Capa dinámica de delitos (controlada por DelitosPanel)
  useDelitosLayer(mapRef);

  // Cerrar popup al hacer click en el botón X
  useEffect(() => {
    if (popupCloserRef.current && overlayRef.current) {
      popupCloserRef.current.onclick = () => {
        overlayRef.current.setPosition(undefined);
        return false;
      };
    }
  }, [overlayRef]);

  return (
    <div className="map-viewer-container">
      <div ref={mapContainerRef} className="map-container" />
      <BasemapSwitcher basemap={basemap} onChange={setBasemap} />
      <PopupOverlay
        popupRef={popupRef}
        closerRef={popupCloserRef}
        contentRef={popupContentRef}
      />
    </div>
  );
}
