import { useEffect, useRef, useState } from 'react';
import api from '../../../services/api';
import Dashboard from './components/Dashboard_VisorVillamariana';
import '../Planeacion.css';

import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import GeoJSON from 'ol/format/GeoJSON';
import { Style, Fill, Stroke } from 'ol/style';
import Overlay from 'ol/Overlay';
import { fromLonLat } from 'ol/proj';
import 'ol/ol.css';

const CENTRO = fromLonLat([-76.483765, 3.012569]);

const getColor = (d) => {
  if (d > 20) return 'rgba(0,68,27,0.75)';
  if (d > 10) return 'rgba(35,139,69,0.75)';
  if (d > 5)  return 'rgba(116,196,118,0.75)';
  if (d > 0)  return 'rgba(199,233,192,0.75)';
  return 'rgba(247,252,245,0.75)';
};

const VisorVillaMariana = () => {
  const mapRef     = useRef(null);
  const popupRef   = useRef(null);
  const tooltipRef = useRef(null);
  const olMapRef   = useRef(null);
  const layerRef   = useRef(null);

  const [datos,    setDatos]    = useState(null);
  const [barrio,   setBarrio]   = useState(null);
  const [zona,     setZona]     = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [enfoque,  setEnfoque]  = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState(null);

  /* ── Init mapa ── */
  useEffect(() => {
    const popup   = new Overlay({ element: popupRef.current,   autoPan: { animation: { duration: 250 } } });
    const tooltip = new Overlay({ element: tooltipRef.current, offset: [12, 0], positioning: 'bottom-left' });

    const olMap = new Map({
      target: mapRef.current,
      layers: [new TileLayer({ source: new OSM() })],
      view: new View({ center: CENTRO, zoom: 13 }),
      overlays: [popup, tooltip],
    });
    olMapRef.current = olMap;

    olMap.on('singleclick', (evt) => {
      const feat = olMap.forEachFeatureAtPixel(evt.pixel, f => f);
      if (feat) {
        const p = feat.getProperties();
        popupRef.current.innerHTML = `
          <div class="plan-popup" style="width:270px">
            <div class="plan-popup-header plan-popup-header--green">
              📍 ${p.nombre_barrio||'S/N'}
              <br/><span style="font-family:Nunito,sans-serif;font-size:10px;opacity:.75;font-weight:500;text-transform:none;letter-spacing:0">${p.tipo_zona}</span>
            </div>
            <div class="plan-popup-body">
              <div class="plan-popup-row">
                <span class="plan-popup-key">Familias</span>
                <span class="plan-popup-pill plan-popup-pill--success" style="font-size:13px">${p.total_familias||0}</span>
              </div>
              <div class="plan-popup-row">
                <span class="plan-popup-key">Personas</span>
                <span class="plan-popup-pill plan-popup-pill--info" style="font-size:13px">${p.total_personas||0}</span>
              </div>
              <div class="plan-popup-row">
                <span class="plan-popup-key">Género</span>
                <span class="plan-popup-val" style="font-size:11.5px">👧 ${p.total_mujeres||0} · 👦 ${p.total_hombres||0}</span>
              </div>
              ${p.cabeza_hogar > 0 ? `<div class="plan-popup-row"><span class="plan-popup-key">Madres Cabeza</span><span class="plan-popup-pill plan-popup-pill--muted">👑 ${p.cabeza_hogar}</span></div>` : ''}
              ${p.total_victimas > 0 ? `<div class="plan-popup-row"><span class="plan-popup-key">Víctimas</span><span class="plan-popup-pill plan-popup-pill--danger">🕊️ ${p.total_victimas}</span></div>` : ''}
            </div>
            <button class="plan-popup-closer" onclick="this.closest('.plan-popup').parentElement.style.display='none'">✕</button>
          </div>
        `;
        popupRef.current.style.display = 'block';
        popup.setPosition(evt.coordinate);
      } else {
        popupRef.current.style.display = 'none';
        popup.setPosition(undefined);
      }
    });

    olMap.on('pointermove', (evt) => {
      const feat = olMap.forEachFeatureAtPixel(evt.pixel, f => f);
      if (feat) {
        const p = feat.getProperties();
        tooltipRef.current.innerHTML = `
          <div class="plan-tooltip"><strong>${p.nombre_barrio}</strong> · ${p.total_familias} familias</div>
        `;
        tooltipRef.current.style.display = 'block';
        tooltip.setPosition(evt.coordinate);
        olMap.getTargetElement().style.cursor = 'pointer';
      } else {
        tooltipRef.current.style.display = 'none';
        tooltip.setPosition(undefined);
        olMap.getTargetElement().style.cursor = '';
      }
    });

    return () => { olMap.setTarget(null); };
  }, []);

  /* ── Cargar datos ── */
  useEffect(() => {
    api.get('/vivienda/villamariana')
      .then(r  => { setDatos(r.data); setCargando(false); })
      .catch(() => { setError('No se pudo conectar con el servidor de vivienda'); setCargando(false); });
  }, []);

  /* ── Actualizar capa ── */
  useEffect(() => {
    if (!datos || !olMapRef.current) return;
    if (layerRef.current) olMapRef.current.removeLayer(layerRef.current);

    const filtradas = datos.features.filter(f => {
      const p = f.properties;
      const cumpleBarrio = barrio === null || p.nombre_barrio === barrio;
      const cumpleZona   = zona   === null || (p.tipo_zona||'').toLowerCase().includes(zona);
      return cumpleBarrio && cumpleZona;
    });

    const source = new VectorSource({
      features: new GeoJSON().readFeatures(
        { type:'FeatureCollection', features: filtradas },
        { featureProjection:'EPSG:3857' }
      )
    });

    const layer = new VectorLayer({
      source,
      style: (feat) => {
        const p = feat.getProperties();
        const esBuscado = enfoque && p.nombre_barrio === enfoque.properties.nombre_barrio;
        return new Style({
          fill:   new Fill({ color: esBuscado ? 'rgba(255,193,7,0.9)' : getColor(p.total_familias||0) }),
          stroke: new Stroke({ color: esBuscado ? '#0B2545' : 'rgba(255,255,255,0.7)', width: esBuscado ? 2.5 : 1.2 }),
        });
      }
    });

    olMapRef.current.addLayer(layer);
    layerRef.current = layer;
  }, [datos, barrio, zona, enfoque]);

  const buscar = () => {
    if (!busqueda.trim() || !datos) return;
    const found = datos.features.find(
      f => (f.properties.nombre_barrio||'').toLowerCase().includes(busqueda.trim().toLowerCase())
    );
    if (found) {
      setEnfoque(found); setBarrio(found.properties.nombre_barrio); setZona(null);
      const feat = new GeoJSON().readFeature(found, { featureProjection:'EPSG:3857' });
      olMapRef.current.getView().fit(feat.getGeometry().getExtent(), { padding:[60,60,60,60], maxZoom:16, duration:1400 });
    } else {
      alert(`No hay registros para: ${busqueda}`);
    }
  };

  return (
    <div style={{ height:'100%', width:'100%', position:'relative' }}>

      <div className="visor-search-wrap">
        <div className="visor-search-group">
          <input
            className="visor-search-input"
            placeholder="Buscar por barrio o vereda…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            onKeyDown={e => e.key==='Enter' && buscar()}
          />
          <button className="visor-search-btn" onClick={buscar}>Buscar</button>
        </div>
      </div>

      {cargando && (
        <div className="visor-loader">
          <div className="visor-loader-spinner" style={{ borderTopColor:'#15803d' }} />
          <span className="visor-loader-text">Cargando beneficiarios Villa Mariana…</span>
        </div>
      )}

      {error && <div className="visor-error">{error}</div>}

      {datos && (
        <Dashboard
          datos={datos}
          barrioActivo={barrio}  onSelectBarrio={setBarrio}
          zonaActiva={zona}      onSelectZona={setZona}
        />
      )}

      <div ref={popupRef}   style={{ display:'none' }} />
      <div ref={tooltipRef} style={{ display:'none' }} />
      <div ref={mapRef}     style={{ height:'100%', width:'100%' }} />
    </div>
  );
};

export default VisorVillaMariana;
