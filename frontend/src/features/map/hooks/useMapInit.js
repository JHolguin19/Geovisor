import { useEffect, useRef, useState, useContext } from 'react';
import OLMap from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Overlay from 'ol/Overlay';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import { fromLonLat } from 'ol/proj';
import { Style, Circle, Fill, Stroke } from 'ol/style';
import MapContext from '../../../context/MapContext';
import MAP_CONFIG from '../../../config/mapConfig';

/**
 * Hook que inicializa el mapa OpenLayers, basemaps, overlay de popup y tool layer.
 *
 * @param {React.RefObject} mapContainerRef - Ref al div contenedor del mapa
 * @param {React.RefObject} popupRef - Ref al elemento del popup overlay
 * @returns {{ mapRef, overlayRef, toolSourceRef, basemap, setBasemap, basemapLayerRef, labelsLayerRef }}
 */
export function useMapInit(mapContainerRef, popupRef) {
  const { setMap } = useContext(MapContext);
  const mapRef = useRef(null);
  const overlayRef = useRef(null);
  const toolSourceRef = useRef(null);
  const basemapLayerRef = useRef(null);
  const labelsLayerRef = useRef(null);
  const [basemap, setBasemap] = useState('osm');

  // Inicializar mapa
  useEffect(() => {
    if (mapRef.current) return;

    const overlay = new Overlay({
      element: popupRef.current,
      autoPan: { animation: { duration: 250 } }
    });
    overlayRef.current = overlay;

    const basemapLayer = new TileLayer({
      source: new OSM(),
      properties: { name: 'basemap' },
      zIndex: 0
    });
    basemapLayerRef.current = basemapLayer;

    const labelsLayer = new TileLayer({
      source: new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
        attributions: 'Labels &copy; Esri'
      }),
      properties: { name: 'labels' },
      visible: false,
      zIndex: 1
    });
    labelsLayerRef.current = labelsLayer;

    const map = new OLMap({
      target: mapContainerRef.current,
      layers: [basemapLayer, labelsLayer],
      overlays: [overlay],
      view: new View({
        center: fromLonLat(MAP_CONFIG.defaultCenter),
        zoom: MAP_CONFIG.defaultZoom,
        projection: 'EPSG:3857'
      }),
      controls: []
    });

    // Tool layer para mediciones, buffers y selecciones
    const toolSrc = new VectorSource();
    toolSourceRef.current = toolSrc;
    const toolLayer = new VectorLayer({
      source: toolSrc,
      style: (feature) => {
        const tool = feature.get('_tool');
        if (tool === 'buffer') {
          return new Style({
            fill: new Fill({ color: 'rgba(0,120,255,0.12)' }),
            stroke: new Stroke({ color: '#0078FF', width: 2, lineDash: [6, 4] })
          });
        }
        return new Style({
          fill: new Fill({ color: 'rgba(255,140,0,0.12)' }),
          stroke: new Stroke({ color: '#FF8C00', width: 2, lineDash: [6, 4] }),
          image: new Circle({ radius: 4, fill: new Fill({ color: '#0078FF' }), stroke: new Stroke({ color: '#fff', width: 1.5 }) })
        });
      },
      properties: { name: '__tool__' },
      zIndex: 50
    });
    map.addLayer(toolLayer);

    mapRef.current = map;
    setMap(map);

    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
    };
  }, [setMap, mapContainerRef, popupRef]);

  // Cambiar mapa base
  useEffect(() => {
    if (!basemapLayerRef.current || !labelsLayerRef.current) return;

    if (basemap === 'osm') {
      basemapLayerRef.current.setSource(new OSM());
      labelsLayerRef.current.setVisible(false);
    } else {
      basemapLayerRef.current.setSource(new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
        attributions: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics'
      }));
      labelsLayerRef.current.setVisible(basemap === 'hybrid');
    }
  }, [basemap]);

  return { mapRef, overlayRef, toolSourceRef, basemap, setBasemap, basemapLayerRef, labelsLayerRef };
}
