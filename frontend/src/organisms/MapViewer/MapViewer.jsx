import { useEffect, useRef, useCallback, useContext, useState } from 'react';
import OLMap from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import ImageLayer from 'ol/layer/Image';
import VectorLayer from 'ol/layer/Vector';
import Overlay from 'ol/Overlay';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Style, Circle, Fill, Stroke } from 'ol/style';
import Text from 'ol/style/Text';
import Feature from 'ol/Feature';
import Draw from 'ol/interaction/Draw';
import { getLength, getArea } from 'ol/sphere';
import { circular } from 'ol/geom/Polygon';
import MapContext from '../../context/MapContext';
import MAP_CONFIG from '../../config/mapConfig';
import { getGeoJsonApiUrl, getLayerById } from '../../config/layers';
import './MapViewer.css';

// Colores pasteles por UBA (RGB) — tono suave de cada color identitario
const UBA_PASTEL = {
  uba1: [255, 182, 193],  // rosa pastel
  uba2: [180, 238, 180],  // verde pastel
  uba3: [173, 216, 230],  // azul pastel
  uba4: [255, 218, 185],  // durazno pastel
  uba5: [216, 191, 216],  // violeta pastel
  ubac: [175, 238, 238],  // cian pastel
};

// Paleta de colores pasteles para barrios (RGB)
const PASTEL_BARRIOS = [
  [255, 179, 186], [255, 223, 186], [255, 255, 186], [186, 255, 201],
  [186, 225, 255], [232, 186, 255], [255, 217, 186], [186, 255, 236],
  [255, 228, 186], [212, 186, 255], [201, 255, 229], [255, 179, 217],
  [179, 229, 255], [255, 229, 179], [217, 255, 179], [255, 204, 179],
  [204, 179, 255], [179, 255, 204], [255, 210, 210], [210, 255, 210],
];

// Capas que participan en el conteo de UBAs (no generan popup de prioridad)
const UBA_IDS = new Set(['uba1', 'uba2', 'uba3', 'uba4', 'uba5', 'ubac']);

// Capas Sisben por UBA (sis_uba*) → ubaId para el endpoint
const SIS_UBA_IDS = new Set(['sis_uba1', 'sis_uba2', 'sis_uba3', 'sis_uba4', 'sis_uba5', 'sis_ubac']);
const SIS_UBA_MAP = {
  sis_uba1: 'uba1', sis_uba2: 'uba2', sis_uba3: 'uba3',
  sis_uba4: 'uba4', sis_uba5: 'uba5', sis_ubac: 'ubac'
};

// Capas WFS de alumbrado — popup via forEachFeatureAtPixel
const ALUMBRADO_WFS = {
  alumbrado_publico:        'Transformador',
  luminarias_tradicionales: 'Luminaria Tradicional',
  apoyos_alumbrado_publico: 'Apoyo Alumbrado',
  luminarias_led:           'Luminaria LED',
  rutas_alumbrado_publico:  'Ruta Eléctrica',
};


// Orden de prioridad para GetFeatureInfo (igual que el aplicativo original)
const QUERY_PRIORITY = [
  // 1. Uso de suelo
  { id: 'uso_estanco',      props: (p) => `<strong>🏢 Establecimiento:</strong> ${p.nombre_establecimiento || ''}<br>📍 <strong>Dirección:</strong> ${p.direccion || ''}<br>🏷️ <strong>Tipo:</strong> ${p.tipo_establecimiento || ''}` },
  { id: 'uso_discotecas',   props: (p) => `<strong>🏢 Establecimiento:</strong> ${p.nombre_establecimiento || ''}<br>📍 <strong>Dirección:</strong> ${p.direccion || ''}<br>🏷️ <strong>Tipo:</strong> ${p.tipo_establecimiento || ''}` },
  { id: 'uso_droguerias',   props: (p) => `<strong>🏢 Establecimiento:</strong> ${p.nombre_establecimiento || ''}<br>📍 <strong>Dirección:</strong> ${p.direccion || ''}<br>🏷️ <strong>Tipo:</strong> ${p.tipo_establecimiento || ''}` },
  { id: 'uso_ferreterias',  props: (p) => `<strong>🏢 Establecimiento:</strong> ${p.nombre_establecimiento || ''}<br>📍 <strong>Dirección:</strong> ${p.direccion || ''}<br>🏷️ <strong>Tipo:</strong> ${p.tipo_establecimiento || ''}` },
  { id: 'uso_ips',          props: (p) => `<strong>🏢 Establecimiento:</strong> ${p.nombre_establecimiento || ''}<br>📍 <strong>Dirección:</strong> ${p.direccion || ''}<br>🏷️ <strong>Tipo:</strong> ${p.tipo_establecimiento || ''}` },
  { id: 'uso_restaurantes', props: (p) => `<strong>🏢 Establecimiento:</strong> ${p.nombre_establecimiento || ''}<br>📍 <strong>Dirección:</strong> ${p.direccion || ''}<br>🏷️ <strong>Tipo:</strong> ${p.tipo_establecimiento || ''}` },
  { id: 'uso_servicios',    props: (p) => `<strong>🏢 Establecimiento:</strong> ${p.nombre_establecimiento || ''}<br>📍 <strong>Dirección:</strong> ${p.direccion || ''}<br>🏷️ <strong>Tipo:</strong> ${p.tipo_establecimiento || ''}` },
  // 2. Equipo institucional
  { id: 'equipo_institucional', props: (p) => `<strong>Descripción:</strong> ${p.Nombre || ''}<br>📍 <strong>Barrio:</strong> ${p.NOMBRE_2 || ''}` },
  // 3. Predios educativos
  { id: 'predios_educativos', props: (p) => `<strong>Nombre:</strong> ${p.Nombre || ''}<br><strong>Sede:</strong> ${p.sede || ''}<br><strong>Barrio:</strong> ${p.NOMBRE_2 || ''}<br><strong>Tipo:</strong> ${p.educacion || ''}<br><strong>Estudiantes:</strong> ${p.numero_estudiantes || ''}` },
  // 4. Iglesias
  { id: 'iglesias', props: (p) => `<strong>⛪ Nombre:</strong> ${p.NOMBRE || p.Nombre || p.nombre || '—'}<br>🆔 <strong>Código:</strong> ${p.COD || p.cod || '—'}` },
  // 5. Zonas verdes
  { id: 'zonas_verdes', props: (p) => `<strong>Descripción:</strong> ${p.Equipament || ''}<br>📍 <strong>Barrio:</strong> ${p.NOMBRE || ''}` },
  // 5b. Obras de pavimentación (lote 1)
  { id: 'obras_pavimentacion', props: (p) => {
    const f1 = p['obras2 \uFFFD_1'];
    const f2 = p['obras2 \uFFFD_2'];
    const f3 = p['obras2 \uFFFD_3'];
    const f4 = p['obras2 \uFFFD_4'];
    const f6 = p['obras2 \uFFFD_6'];
    const f7 = p['obras2 \uFFFD_7'];
    const presupuesto = f6
      ? Number(f6).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })
      : '—';
    return `<strong>🏗️ Obras de Pavimentación</strong><br>
      <strong>📍 Ubicación:</strong> ${f1 || '—'}<br>
      <strong>📏 Longitud:</strong> ${f3 != null ? f3 : '—'} m<br>
      <strong>🔧 Tipo de Obra:</strong> ${f2 || '—'}<br>
      <strong>👥 Beneficiarios:</strong> ${f4 != null ? f4 : '—'}<br>
      <strong>💰 Presupuesto:</strong> ${presupuesto}<br>
      <strong>✅ Estado:</strong> ${f7 || '—'}`;
  }},
  // 5c. Pavimentación 2
  { id: 'pavimentacion2', props: (p) => {
    const f1 = p['obras1 \uFFFD_1'];
    const f2 = p['obras1 \uFFFD_2'];
    const f3 = p['obras1 \uFFFD_3'];
    const f4 = p['obras1 \uFFFD_4'];
    const f6 = p['obras1 \uFFFD_6'];
    const f7 = p['obras1 \uFFFD_7'];
    const presupuesto = f6
      ? Number(f6).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })
      : '—';
    return `<strong>🏗️ Pavimentación 2 - Infraestructura</strong><br>
      <strong>📍 Ubicación:</strong> ${f1 || '—'}<br>
      <strong>📏 Longitud:</strong> ${f3 != null ? f3 : '—'} m<br>
      <strong>🔧 Tipo de Obra:</strong> ${f2 || '—'}<br>
      <strong>👥 Beneficiarios:</strong> ${f4 != null ? f4 : '—'}<br>
      <strong>💰 Presupuesto:</strong> ${presupuesto}<br>
      <strong>✅ Estado:</strong> ${f7 || '—'}`;
  }},
  // 6. UBAs
  { id: 'uba1', props: (p) => `<strong>🏘️ Barrio:</strong> ${p.nombre || ''}<br><strong>🏢 UBA:</strong> 1` },
  { id: 'uba2', props: (p) => `<strong>🏘️ Barrio:</strong> ${p.nombre || ''}<br><strong>🏢 UBA:</strong> 2` },
  { id: 'uba3', props: (p) => `<strong>🏘️ Barrio:</strong> ${p.nombre || ''}<br><strong>🏢 UBA:</strong> 3` },
  { id: 'uba4', props: (p) => `<strong>🏘️ Barrio:</strong> ${p.nombre || ''}<br><strong>🏢 UBA:</strong> 4` },
  { id: 'uba5', props: (p) => `<strong>🏘️ Barrio:</strong> ${p.nombre || ''}<br><strong>🏢 UBA:</strong> 5` },
  { id: 'ubac', props: (p) => `<strong>🏘️ Barrio:</strong> ${p.nombre || ''}<br><strong>🏢 UBA:</strong> C` },
  // 7. Barrios urbanos
  { id: 'barrios_urbanos', props: (p) => `<strong>🏘️ Barrio:</strong> ${p.nombre || ''}` },
  // 8. Nomenclatura vial
  { id: 'nomenclatura_vial', props: (p) => `<strong>🛣️ Nombre de vía:</strong> ${p.texto || ''}` },
];

// Color coroplético para mapa de calor Sisben — degradado lavanda → púrpura oscuro
function getChoroplethColor(value, min, max) {
  const t = max === min ? 0.5 : Math.max(0, Math.min(1, (value - min) / (max - min)));
  const r = Math.round(243 - t * 169); // 243 → 74
  const g = Math.round(229 - t * 209); // 229 → 20
  const b = Math.round(245 - t * 105); // 245 → 140
  return [r, g, b];
}

// Siempre consultar predios urbanos como fallback
function formatPredios(p) {
  return `<strong>📌 Matrícula:</strong> ${p.matriculainmobiliaria || p.matricula_inmobiliaria || '—'}<br>
    <strong>📌 Número Predial:</strong> ${p.codigo || '—'}<br>
    <strong>📍 Dirección:</strong> ${p.direccion || '—'}<br>
    <strong>🏞️ Área Terreno:</strong> ${p.areaterreno_m2 || p.area_terreno || '—'} m²<br>
    <strong>🏗️ Área Construida:</strong> ${p.areaconstruida_m2 || p.area_construida || '—'} m²<br>
    <strong>💰 Avalúo:</strong> ${p.avaluo || '—'}<br>
    <strong>🏢 Destino Económico:</strong> ${p.destinoeconomico || p.destino_economico || '—'}`;
}

export default function MapViewer() {
  const mapContainerRef = useRef(null);
  const popupRef = useRef(null);
  const popupContentRef = useRef(null);
  const popupCloserRef = useRef(null);
  const mapRef = useRef(null);
  const overlayRef = useRef(null);
  const layersRef = useRef(new globalThis.Map());

  // Tool refs
  const toolSourceRef = useRef(null);
  const drawInteractionRef = useRef(null);
  const measureOverlaysRef = useRef([]);
  const bufferClickRef = useRef(null);

  // Basemap refs y estado
  const basemapLayerRef = useRef(null);
  const labelsLayerRef = useRef(null);
  const [basemap, setBasemap] = useState('osm'); // 'osm' | 'satellite' | 'hybrid'

  const { setMap, activeLayers, setActiveLayers, setSelectedFeature,
          activeTool, bufferRadius, setSelectionResults, toolVersion,
          sisbenHeatmapVariable, setSisbenBarriosFeatures, sisbenBarriosFeatures,
          setSelectedSisbenBarrio, setSisbenHeatmapVariable } = useContext(MapContext);

  // Ref para pasar el estado del coroplético al style function de OpenLayers
  const sisbenHeatmapRef = useRef({ variable: null, min: 0, max: 1 });

  // Crear capa WMS
  // Helper para obtener token JWT del localStorage
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Crear capa vectorial desde PostGIS (reemplaza WMS y WFS)
  const createWmsLayer = useCallback((layerConfig) => {
    const apiUrl = getGeoJsonApiUrl(layerConfig);
    console.log(`[GeoData] Creando capa "${layerConfig.id}" → ${apiUrl}`);

    const source = new VectorSource();

    fetch(apiUrl, { headers: getAuthHeaders() })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(geojson => {
        const features = new GeoJSON().readFeatures(geojson, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857'
        });
        console.log(`[GeoData] "${layerConfig.id}": ${features.length} features`);
        source.addFeatures(features);
      })
      .catch(err => console.error(`[GeoData ERROR] "${layerConfig.id}":`, err));

    const layerColor = layerConfig.color || '#3388ff';

    // Convertir color hex a rgba con opacidad
    const hexToRgba = (hex, alpha) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    };

    // Predios urbanos: solo outline rojo fino (catastral)
    const prediosStyle = layerConfig.id === 'predios_urbanos'
      ? new Style({
          fill: new Fill({ color: 'rgba(0,0,0,0)' }),
          stroke: new Stroke({ color: '#E53935', width: 0.8 })
        })
      : null;

    // Obras de pavimentación: gris semitransparente
    const pavStyle = (layerConfig.id === 'obras_pavimentacion' || layerConfig.id === 'pavimentacion2')
      ? new Style({
          fill: new Fill({ color: 'rgba(87,83,78,0.55)' }),
          stroke: new Stroke({ color: '#292524', width: 1.2 })
        })
      : null;

    // Estilo genérico: relleno semitransparente + borde del color del sidebar
    const style = new Style({
      fill: new Fill({ color: hexToRgba(layerColor, 0.35) }),
      stroke: new Stroke({ color: layerColor, width: 1.5 }),
      image: new Circle({
        radius: 6,
        fill: new Fill({ color: layerColor }),
        stroke: new Stroke({ color: '#ffffff', width: 1.5 })
      })
    });

    return new VectorLayer({
      source,
      style: prediosStyle || pavStyle || style,
      properties: { name: layerConfig.id },
      visible: true,
      opacity: layerConfig.opacity || 1,
      zIndex: layerConfig.zIndex || 1
    });
  }, []);

  // Crear capa WFS (vectorial) — ahora usa API PostGIS
  const createWfsLayer = useCallback((layerConfig) => {
    const apiUrl = getGeoJsonApiUrl(layerConfig);
    console.log(`[GeoData] Creando capa "${layerConfig.id}" → ${apiUrl}`);

    const source = new VectorSource();

    fetch(apiUrl, { headers: getAuthHeaders() })
      .then(res => {
        console.log(`[GeoData] "${layerConfig.id}" HTTP ${res.status} ${res.statusText}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(geojson => {
        console.log(`[GeoData] "${layerConfig.id}" respuesta:`, geojson);
        const features = new GeoJSON().readFeatures(geojson, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857'
        });
        console.log(`[GeoData] "${layerConfig.id}": ${features.length} features parseados`);
        source.addFeatures(features);
      })
      .catch(err => {
        console.error(`[GeoData ERROR] "${layerConfig.id}":`, err);
      });

    const isLine = layerConfig.geometryType === 'line';
    const style = isLine
      ? new Style({
          stroke: new Stroke({
            color: layerConfig.style?.strokeColor || '#facc15',
            width: layerConfig.style?.strokeWidth || 2
          })
        })
      : new Style({
          image: new Circle({
            radius: layerConfig.style?.radius || 6,
            fill: new Fill({ color: layerConfig.style?.fillColor || '#ff5722' }),
            stroke: new Stroke({ color: layerConfig.style?.strokeColor || '#ffffff', width: 1 })
          })
        });

    return new VectorLayer({
      source,
      style,
      properties: { name: layerConfig.id },
      visible: true,
      zIndex: layerConfig.zIndex || 10
    });
  }, []);

  // Crear capa WFS de barrios con colores pasteles y etiquetas
  const createBarriosLayer = useCallback((layerConfig) => {
    const wfsUrl = getGeoJsonApiUrl(layerConfig);
    console.log(`[GeoData Barrios] Cargando → ${wfsUrl}`);

    const source = new VectorSource();

    fetch(wfsUrl, { headers: getAuthHeaders() })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(geojson => {
        const features = new GeoJSON().readFeatures(geojson, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857'
        });
        features.forEach((f, i) => f.set('_colorIdx', i % PASTEL_BARRIOS.length));
        source.addFeatures(features);
        console.log(`[WFS Barrios] ${features.length} barrios cargados`);
      })
      .catch(err => console.error('[WFS Barrios ERROR]', err));

    const styleFunction = (feature) => {
      const [r, g, b] = PASTEL_BARRIOS[feature.get('_colorIdx') ?? 0];
      return new Style({
        fill: new Fill({ color: `rgba(${r}, ${g}, ${b}, 0.35)` }),
        stroke: new Stroke({ color: `rgba(${r - 40}, ${g - 40}, ${b - 40}, 0.8)`, width: 1.5 }),
        text: new Text({
          text: feature.get('nombre') || '',
          font: 'bold 11px sans-serif',
          fill: new Fill({ color: '#222222' }),
          stroke: new Stroke({ color: 'rgba(255,255,255,0.9)', width: 3 }),
          overflow: true,
          placement: 'point'
        })
      });
    };

    return new VectorLayer({
      source,
      style: styleFunction,
      properties: { name: layerConfig.id },
      visible: true,
      zIndex: 4
    });
  }, []);

  // Crear capa WFS de Sisben Barrios — colores pasteles + etiquetas + soporte coroplético
  const createSisbenBarriosLayer = useCallback((layerConfig) => {
    const wfsUrl = getGeoJsonApiUrl(layerConfig);
    console.log(`[GeoData Sisben Barrios] Cargando → ${wfsUrl}`);

    const source = new VectorSource();

    fetch(wfsUrl, { headers: getAuthHeaders() })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(geojson => {
        const features = new GeoJSON().readFeatures(geojson, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857'
        });
        features.forEach((f, i) => f.set('_colorIdx', i % PASTEL_BARRIOS.length));
        source.addFeatures(features);
        console.log(`[WFS Sisben Barrios] ${features.length} barrios cargados`);
        // Guardar propiedades en contexto para que SisbenHeatmapPanel detecte campos numéricos
        const featuresData = features.map(f => {
          const p = { ...f.getProperties() };
          delete p.geometry;
          return p;
        });
        setSisbenBarriosFeatures(featuresData);
      })
      .catch(err => console.error('[WFS Sisben Barrios ERROR]', err));

    const styleFunction = (feature) => {
      const { variable, min, max, isProportion } = sisbenHeatmapRef.current;

      if (variable) {
        // Modo coroplético
        const raw = Number(feature.get(variable));
        const value = isNaN(raw) ? 0 : raw;
        const [r, g, b] = getChoroplethColor(value, min, max);

        // Formatear el valor como etiqueta
        let labelVal;
        if (isProportion) {
          labelVal = `${Math.round(value * 100)}%`;
        } else if (!Number.isInteger(value)) {
          labelVal = value.toLocaleString('es-CO', { maximumFractionDigits: 1 });
        } else {
          labelVal = value.toLocaleString('es-CO');
        }
        const barrioName = feature.get('nombre') || feature.get('nombre_barrio')
          || feature.get('NOMBRE') || feature.get('barrio')
          || feature.get('BARRIO') || feature.get('nom_barrio') || '';
        const labelText = barrioName ? `${labelVal}\n${barrioName}` : labelVal;

        return new Style({
          fill: new Fill({ color: `rgba(${r}, ${g}, ${b}, 0.78)` }),
          stroke: new Stroke({ color: 'rgba(74, 20, 140, 0.5)', width: 1.2 }),
          text: new Text({
            text: labelText,
            font: 'bold 11px sans-serif',
            fill: new Fill({ color: '#1a0030' }),
            stroke: new Stroke({ color: 'rgba(255,255,255,0.9)', width: 3 }),
            overflow: true,
            placement: 'point'
          })
        });
      }

      // Modo predeterminado: colores pasteles por barrio + etiqueta nombre
      const [r, g, b] = PASTEL_BARRIOS[feature.get('_colorIdx') ?? 0];
      const nombre = feature.get('nombre') || feature.get('nombre_barrio')
        || feature.get('NOMBRE') || feature.get('barrio')
        || feature.get('BARRIO') || feature.get('nom_barrio') || '';
      return new Style({
        fill: new Fill({ color: `rgba(${r}, ${g}, ${b}, 0.65)` }),
        stroke: new Stroke({ color: `rgba(${Math.max(r-40,0)}, ${Math.max(g-40,0)}, ${Math.max(b-40,0)}, 0.9)`, width: 1.8 }),
        text: new Text({
          text: nombre,
          font: 'bold 11px sans-serif',
          fill: new Fill({ color: '#111111' }),
          stroke: new Stroke({ color: 'rgba(255,255,255,0.95)', width: 3 }),
          overflow: true,
          placement: 'point'
        })
      });
    };

    return new VectorLayer({
      source,
      style: styleFunction,
      properties: { name: layerConfig.id },
      visible: true,
      zIndex: 5
    });
  }, [setSisbenBarriosFeatures]);

  // Crear capa WFS de UBA con color pastel propio y etiquetas de barrio
  const createUbaLayer = useCallback((layerConfig) => {
    const wfsUrl = getGeoJsonApiUrl(layerConfig);
    console.log(`[GeoData UBA] "${layerConfig.id}" → ${wfsUrl}`);

    const source = new VectorSource();

    fetch(wfsUrl, { headers: getAuthHeaders() })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(geojson => {
        const features = new GeoJSON().readFeatures(geojson, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857'
        });
        source.addFeatures(features);
        console.log(`[WFS UBA] "${layerConfig.id}": ${features.length} features`);
      })
      .catch(err => console.error(`[WFS UBA ERROR] "${layerConfig.id}":`, err));

    const [r, g, b] = UBA_PASTEL[layerConfig.id] || [200, 200, 200];

    const ubaStyle = new Style({
      fill: new Fill({ color: `rgba(${r}, ${g}, ${b}, 0.35)` }),
      stroke: new Stroke({ color: `rgba(${Math.max(r - 50, 0)}, ${Math.max(g - 50, 0)}, ${Math.max(b - 50, 0)}, 0.8)`, width: 1.5 })
    });

    return new VectorLayer({
      source,
      style: ubaStyle,
      properties: { name: layerConfig.id },
      visible: true,
      zIndex: 3
    });
  }, []);

  // Crear capa Sisben UBA — geometría UBA + datos Sisben cruzados por nombre
  const createSisbenUbaLayer = useCallback((layerConfig) => {
    const ubaId = SIS_UBA_MAP[layerConfig.id];
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const apiUrl = `/api/sisben/uba/${ubaId}/geojson`;
    console.log(`[GeoData SisbenUBA] "${layerConfig.id}" → ${apiUrl}`);

    const source = new VectorSource();

    fetch(apiUrl, { headers })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(geojson => {
        const features = new GeoJSON().readFeatures(geojson, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857'
        });
        features.forEach((f, i) => f.set('_colorIdx', i % PASTEL_BARRIOS.length));
        source.addFeatures(features);
        console.log(`[WFS SisbenUBA] "${layerConfig.id}": ${features.length} barrios`);
        const featuresData = features.map(f => {
          const p = { ...f.getProperties() };
          delete p.geometry;
          return p;
        });
        setSisbenBarriosFeatures(featuresData);
      })
      .catch(err => console.error(`[WFS SisbenUBA ERROR] "${layerConfig.id}":`, err));

    const styleFunction = (feature) => {
      const { variable, min, max, isProportion } = sisbenHeatmapRef.current;

      if (variable) {
        const raw = Number(feature.get(variable));
        const value = isNaN(raw) ? 0 : raw;
        const [r, g, b] = getChoroplethColor(value, min, max);
        let labelVal;
        if (isProportion) {
          labelVal = `${Math.round(value * 100)}%`;
        } else if (!Number.isInteger(value)) {
          labelVal = value.toLocaleString('es-CO', { maximumFractionDigits: 1 });
        } else {
          labelVal = value.toLocaleString('es-CO');
        }
        const barrioName = feature.get('nombre') || feature.get('nombre_barrio')
          || feature.get('NOMBRE') || feature.get('barrio') || feature.get('nom_barrio') || '';
        const labelText = barrioName ? `${labelVal}\n${barrioName}` : labelVal;
        return new Style({
          fill: new Fill({ color: `rgba(${r}, ${g}, ${b}, 0.78)` }),
          stroke: new Stroke({ color: 'rgba(74, 20, 140, 0.5)', width: 1.2 }),
          text: new Text({
            text: labelText,
            font: 'bold 11px sans-serif',
            fill: new Fill({ color: '#1a0030' }),
            stroke: new Stroke({ color: 'rgba(255,255,255,0.9)', width: 3 }),
            overflow: true,
            placement: 'point'
          })
        });
      }

      const [r, g, b] = PASTEL_BARRIOS[feature.get('_colorIdx') ?? 0];
      const nombre = feature.get('nombre') || feature.get('nombre_barrio')
        || feature.get('NOMBRE') || feature.get('barrio') || feature.get('nom_barrio') || '';
      return new Style({
        fill: new Fill({ color: `rgba(${r}, ${g}, ${b}, 0.65)` }),
        stroke: new Stroke({ color: `rgba(${Math.max(r-40,0)}, ${Math.max(g-40,0)}, ${Math.max(b-40,0)}, 0.9)`, width: 1.8 }),
        text: new Text({
          text: nombre,
          font: 'bold 11px sans-serif',
          fill: new Fill({ color: '#111111' }),
          stroke: new Stroke({ color: 'rgba(255,255,255,0.95)', width: 3 }),
          overflow: true,
          placement: 'point'
        })
      });
    };

    return new VectorLayer({
      source,
      style: styleFunction,
      properties: { name: layerConfig.id },
      visible: true,
      zIndex: 5
    });
  }, [setSisbenBarriosFeatures]);

  // Inicializar mapa
  useEffect(() => {
    if (mapRef.current) return;

    // Overlay del popup
    const overlay = new Overlay({
      element: popupRef.current,
      autoPan: { animation: { duration: 250 } }
    });
    overlayRef.current = overlay;

    // Capa base (OSM por defecto)
    const basemapLayer = new TileLayer({
      source: new OSM(),
      properties: { name: 'basemap' },
      zIndex: 0
    });
    basemapLayerRef.current = basemapLayer;

    // Capa de etiquetas para el modo Híbrido (Esri World Boundaries)
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
            stroke: new Stroke({ color: '#0078FF', width: 2, lineDash: [6,4] })
          });
        }
        return new Style({
          fill: new Fill({ color: 'rgba(255,140,0,0.12)' }),
          stroke: new Stroke({ color: '#FF8C00', width: 2, lineDash: [6,4] }),
          image: new Circle({ radius: 4, fill: new Fill({ color: '#0078FF' }), stroke: new Stroke({ color: '#fff', width: 1.5 }) })
        });
      },
      properties: { name: '__tool__' },
      zIndex: 50
    });
    map.addLayer(toolLayer);

    mapRef.current = map;
    setMap(map);

    map.on('click', handleMapClick);

    // Cerrar popup al cerrar
    if (popupCloserRef.current) {
      popupCloserRef.current.onclick = () => {
        overlayRef.current.setPosition(undefined);
        return false;
      };
    }

    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
    };
  }, [setMap]);

  // Manejar click: detección de features vectoriales con prioridad
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
      contenido = `<strong>⚡ ${label}</strong><br><strong>ID:</strong> ${p.Name || p.name || p.NAME || '(sin identificador)'}`;
    }, { hitTolerance: 10 });

    // 2. Detectar rutas de alumbrado (líneas, tolerancia mayor)
    if (!contenido) {
      map.forEachFeatureAtPixel(event.pixel, (feature, layer) => {
        if (contenido) return;
        if (layer?.get('name') !== 'rutas_alumbrado_publico' || !activeLayers.has('rutas_alumbrado_publico')) return;
        const p = feature.getProperties();
        contenido = `<strong>⚡ Ruta Eléctrica</strong><br><strong>ID:</strong> ${p.Name || p.name || p.NAME || '(sin identificador)'}`;
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
        contenido = `<strong>🏘️ Barrio:</strong> ${p.nombre || ''}`;
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
        contenido = `<strong>🏘️ Barrio:</strong> ${p.nombre || ''}<br><strong>🏢 UBA:</strong> ${ubaNum}`;
      });
    }

    // 6. Prioridades vectoriales (ex-WMS)
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

    // 7. Fallback: predios urbanos (siempre activo)
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
  }, [activeLayers, setSelectedFeature, activeTool, setSelectedSisbenBarrio]);

  // Re-registrar el click handler cuando activeLayers cambia
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.un('click', handleMapClick);
    map.on('click', handleMapClick);
  }, [handleMapClick]);

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

  // Agregar o quitar capas según activeLayers
  useEffect(() => {
    if (!mapRef.current) return;

    const currentLayers = new globalThis.Set(layersRef.current.keys());
    const newActive = new globalThis.Set(activeLayers);

    // Agregar capas nuevas
    activeLayers.forEach(layerId => {
      if (!currentLayers.has(layerId)) {
        const layerConfig = getLayerById(layerId);
        if (!layerConfig) {
          console.warn(`[Layers] No se encontró config para layerId: "${layerId}"`);
          return;
        }
        console.log(`[Layers] Agregando capa "${layerId}" tipo: ${layerConfig.type}`);
        const newLayer = layerConfig.id === 'barrios_urbanos'
          ? createBarriosLayer(layerConfig)
          : layerConfig.id === 'sisben_barrios'
            ? createSisbenBarriosLayer(layerConfig)
            : UBA_IDS.has(layerConfig.id)
            ? createUbaLayer(layerConfig)
            : SIS_UBA_IDS.has(layerConfig.id)
            ? createSisbenUbaLayer(layerConfig)
            : layerConfig.type === 'wfs'
              ? createWfsLayer(layerConfig)
              : createWmsLayer(layerConfig);
        layersRef.current.set(layerId, newLayer);
        mapRef.current.addLayer(newLayer);
      }
    });

    // Quitar capas deseleccionadas
    currentLayers.forEach(layerId => {
      if (!newActive.has(layerId)) {
        // Limpiar estado sisben al desactivar la capa
        if (layerId === 'sisben_barrios' || SIS_UBA_IDS.has(layerId)) {
          setSelectedSisbenBarrio(null);
          setSisbenBarriosFeatures(null);
          setSisbenHeatmapVariable(null);
          sisbenHeatmapRef.current = { variable: null, min: 0, max: 1 };
        }
        const layer = layersRef.current.get(layerId);
        if (layer) {
          mapRef.current.removeLayer(layer);
          layersRef.current.delete(layerId);
        }
      }
    });
  }, [activeLayers, createWmsLayer, createWfsLayer, createBarriosLayer, createUbaLayer, createSisbenBarriosLayer,
      createSisbenUbaLayer, setSelectedSisbenBarrio, setSisbenBarriosFeatures, setSisbenHeatmapVariable]);

  // Actualizar estilo coroplético de capas Sisben cuando cambia la variable o los datos
  useEffect(() => {
    if (sisbenHeatmapVariable && sisbenBarriosFeatures?.length) {
      const values = sisbenBarriosFeatures
        .map(p => Number(p[sisbenHeatmapVariable]))
        .filter(v => !isNaN(v) && isFinite(v));
      const min = values.length ? Math.min(...values) : 0;
      const max = values.length ? Math.max(...values) : 1;
      const isProportion = values.length > 0
        && values.every(v => v >= 0 && v <= 1)
        && values.some(v => v > 0 && v < 1);
      sisbenHeatmapRef.current = { variable: sisbenHeatmapVariable, min, max, isProportion };
    } else {
      sisbenHeatmapRef.current = { variable: null, min: 0, max: 1, isProportion: false };
    }

    // Refrescar estilos en sisben_barrios y en cualquier sis_uba* activa
    const barLayer = layersRef.current.get('sisben_barrios');
    if (barLayer) barLayer.changed();
    SIS_UBA_IDS.forEach(id => {
      const l = layersRef.current.get(id);
      if (l) l.changed();
    });
  }, [sisbenHeatmapVariable, sisbenBarriosFeatures]);

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
      stroke: new Stroke({ color: '#0078FF', width: 2, lineDash: [6,4] }),
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
        activeEl = null; activeOverlay = null;
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
        stroke: new Stroke({ color: '#FF8C00', width: 2, lineDash: [6,4] }),
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
  }, [activeTool, bufferRadius]);

  // Limpiar herramientas cuando se dispara clearTools()
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    toolSourceRef.current?.clear();
    measureOverlaysRef.current.forEach(o => map.removeOverlay(o));
    measureOverlaysRef.current = [];
  }, [toolVersion]);

  return (
    <div className="map-viewer-container">
      <div ref={mapContainerRef} className="map-container" />

      {/* Selector de mapa base */}
      <div className="basemap-switcher">
        <button
          className={`bm-btn${basemap === 'osm' ? ' bm-btn--active' : ''}`}
          title="Mapa base OpenStreetMap"
          onClick={() => setBasemap('osm')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 13l4.553 2.276A1 1 0 0021 21.382V10.618a1 1 0 00-.553-.894L15 7m0 13V7m0 0L9 4" />
          </svg>
          Mapa
        </button>
        <button
          className={`bm-btn${basemap === 'satellite' ? ' bm-btn--active' : ''}`}
          title="Imagen satelital Esri (sin etiquetas)"
          onClick={() => setBasemap('satellite')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M6.343 6.343a8 8 0 1011.314 11.314A8 8 0 006.343 6.343zM3.515 3.515l3.536 3.536M20.485 20.485l-3.536-3.536M3.515 20.485l3.536-3.536M20.485 3.515l-3.536 3.536" />
          </svg>
          Satélite
        </button>
        <button
          className={`bm-btn${basemap === 'hybrid' ? ' bm-btn--active' : ''}`}
          title="Satélite con etiquetas (híbrido)"
          onClick={() => setBasemap('hybrid')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
          </svg>
          Híbrido
        </button>
      </div>

      {/* Popup OL Overlay */}
      <div ref={popupRef} className="ol-popup">
        <button ref={popupCloserRef} className="ol-popup-closer">✖</button>
        <div ref={popupContentRef} className="ol-popup-content" />
      </div>
    </div>
  );
}
