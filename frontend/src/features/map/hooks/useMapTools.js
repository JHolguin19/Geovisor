import { useEffect, useRef, useContext } from 'react';
import VectorLayer from 'ol/layer/Vector';
import Overlay from 'ol/Overlay';
import Draw from 'ol/interaction/Draw';
import Feature from 'ol/Feature';
import { Style, Circle, Fill, Stroke } from 'ol/style';
import { getLength, getArea } from 'ol/sphere';
import { circular } from 'ol/geom/Polygon';
import { toLonLat } from 'ol/proj';
import MapContext from '../../../context/MapContext';

/**
 * Hook que gestiona herramientas SIG: medición de distancia/área, buffer, selección por polígono.
 *
 * @param {React.MutableRefObject} mapRef - Ref al mapa OL
 * @param {React.MutableRefObject} toolSourceRef - Ref al VectorSource de herramientas
 */
export function useMapTools(mapRef, toolSourceRef) {
  const { activeTool, bufferRadius, setSelectionResults, activeLayers, toolVersion } = useContext(MapContext);
  const drawInteractionRef = useRef(null);
  const bufferClickRef = useRef(null);
  const measureOverlaysRef = useRef([]);

  // Gestionar interacciones de herramientas SIG
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !toolSourceRef.current) return;

    // Limpiar interacción anterior
    if (drawInteractionRef.current) {
      map.removeInteraction(drawInteractionRef.current);
      drawInteractionRef.current = null;
    }
    if (bufferClickRef.current) {
      map.un('singleclick', bufferClickRef.current);
      bufferClickRef.current = null;
    }
    if (!activeTool) return;

    const dotStyle = new Style({
      fill: new Fill({ color: 'rgba(0,120,255,0.10)' }),
      stroke: new Stroke({ color: '#0078FF', width: 2, lineDash: [6, 4] }),
      image: new Circle({ radius: 4, fill: new Fill({ color: '#0078FF' }), stroke: new Stroke({ color: '#fff', width: 1.5 }) })
    });

    if (activeTool === 'measure-distance' || activeTool === 'measure-area') {
      const drawType = activeTool === 'measure-distance' ? 'LineString' : 'Polygon';
      const draw = new Draw({ source: toolSourceRef.current, type: drawType, style: dotStyle });

      let activeEl = null;
      let activeOverlay = null;

      draw.on('drawstart', evt => {
        activeEl = document.createElement('div');
        activeEl.className = 'map-measure-tooltip';
        activeOverlay = new Overlay({ element: activeEl, offset: [15, 0], positioning: 'center-left', stopEvent: false });
        map.addOverlay(activeOverlay);
        measureOverlaysRef.current.push(activeOverlay);

        evt.feature.getGeometry().on('change', e => {
          const geom = e.target;
          try {
            let text, coord;
            if (drawType === 'LineString') {
              const len = getLength(geom);
              text = len >= 1000 ? `${(len / 1000).toFixed(2)} km` : `${Math.round(len)} m`;
              coord = geom.getLastCoordinate();
            } else {
              const area = getArea(geom);
              text = area >= 10000 ? `${(area / 10000).toFixed(2)} ha` : `${Math.round(area)} m²`;
              coord = geom.getInteriorPoint().getCoordinates();
            }
            activeEl.textContent = text;
            activeOverlay.setPosition(coord);
          } catch (_) {}
        });
      });

      draw.on('drawend', () => {
        if (activeEl) activeEl.classList.add('map-measure-tooltip--done');
        activeEl = null;
        activeOverlay = null;
      });

      map.addInteraction(draw);
      drawInteractionRef.current = draw;
    }

    if (activeTool === 'buffer') {
      const handler = evt => {
        const center = toLonLat(evt.coordinate);
        const radius = bufferRadius || 100;
        const geom = circular(center, radius, 64);
        geom.transform('EPSG:4326', 'EPSG:3857');
        // Reemplazar buffer anterior
        toolSourceRef.current.getFeatures()
          .filter(f => f.get('_tool') === 'buffer')
          .forEach(f => toolSourceRef.current.removeFeature(f));
        const feat = new Feature({ geometry: geom });
        feat.set('_tool', 'buffer');
        toolSourceRef.current.addFeature(feat);
      };
      map.on('singleclick', handler);
      bufferClickRef.current = handler;
    }

    if (activeTool === 'select-polygon') {
      const selStyle = new Style({
        fill: new Fill({ color: 'rgba(255,140,0,0.15)' }),
        stroke: new Stroke({ color: '#FF8C00', width: 2, lineDash: [6, 4] }),
        image: new Circle({ radius: 4, fill: new Fill({ color: '#FF8C00' }), stroke: new Stroke({ color: '#fff', width: 1.5 }) })
      });
      const draw = new Draw({ source: toolSourceRef.current, type: 'Polygon', style: selStyle });

      draw.on('drawend', evt => {
        const polygon = evt.feature.getGeometry();
        const found = [];

        map.getLayers().getArray().forEach(layer => {
          if (!(layer instanceof VectorLayer)) return;
          const lid = layer.get('name');
          if (!lid || lid === '__tool__') return;
          if (!activeLayers.has(lid)) return;
          layer.getSource().getFeatures().forEach(f => {
            const geom = f.getGeometry();
            if (!geom) return;
            let coord;
            try {
              const t = geom.getType();
              if (t === 'Point') coord = geom.getCoordinates();
              else if (t.includes('Polygon')) coord = geom.getInteriorPoint().getCoordinates();
              else if (t === 'LineString') coord = geom.getCoordinateAt(0.5);
            } catch (_) {}
            if (coord && polygon.intersectsCoordinate(coord)) {
              const props = { ...f.getProperties() };
              delete props.geometry;
              found.push({ layerId: lid, properties: props });
            }
          });
        });

        setSelectionResults(found);
        map.removeInteraction(draw);
        drawInteractionRef.current = null;
      });

      map.addInteraction(draw);
      drawInteractionRef.current = draw;
    }

    return () => {
      if (drawInteractionRef.current) { map.removeInteraction(drawInteractionRef.current); drawInteractionRef.current = null; }
      if (bufferClickRef.current) { map.un('singleclick', bufferClickRef.current); bufferClickRef.current = null; }
    };
  }, [activeTool, bufferRadius, activeLayers, setSelectionResults, mapRef, toolSourceRef]);

  // Limpiar herramientas cuando se dispara clearTools()
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    toolSourceRef.current?.clear();
    measureOverlaysRef.current.forEach(o => map.removeOverlay(o));
    measureOverlaysRef.current = [];
  }, [toolVersion, mapRef, toolSourceRef]);
}
