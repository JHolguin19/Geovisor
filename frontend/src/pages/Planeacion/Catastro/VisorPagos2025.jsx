import { useEffect, useRef, useState } from 'react';
import api from '../../../services/api';
import Dashboard from './components/Dashboard_VisorPagos2025';
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
const fmt = (v) => new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(v||0);

const VisorPagos2025 = () => {
  const mapRef    = useRef(null);
  const popupRef  = useRef(null);
  const olMapRef  = useRef(null);
  const overlayRef= useRef(null);
  const layerRef  = useRef(null);

  const [predios,  setPredios]  = useState(null);
  const [estado,   setEstado]   = useState(null);
  const [zona,     setZona]     = useState(null);
  const [tarifa,   setTarifa]   = useState(null);
  const [codigo,   setCodigo]   = useState('');
  const [enfoque,  setEnfoque]  = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState(null);

  /* ── Init mapa ── */
  useEffect(() => {
    const overlay = new Overlay({ element: popupRef.current, autoPan: { animation: { duration: 250 } } });
    const olMap   = new Map({
      target: mapRef.current,
      layers: [new TileLayer({ source: new OSM() })],
      view: new View({ center: CENTRO, zoom: 13 }),
      overlays: [overlay],
    });
    overlayRef.current = overlay;
    olMapRef.current   = olMap;

    olMap.on('singleclick', (evt) => {
      const feat = olMap.forEachFeatureAtPixel(evt.pixel, f => f);
      if (feat) {
        const p = feat.getProperties();
        const rec    = p.valorrecaudo || 0;
        const fecha  = p.fecharecaudo ? new Date(p.fecharecaudo).toLocaleDateString('es-CO') : 'Sin registro';
        const estado = rec > 0;

        popupRef.current.innerHTML = `
          <div class="plan-popup">
            <div class="plan-popup-header plan-popup-header--blue">💰 Estado de Cuenta 2025</div>
            <div class="plan-popup-body">
              <div class="plan-popup-row">
                <span class="plan-popup-key">Código</span>
                <span class="plan-popup-val" style="font-family:monospace;font-size:12px">${p.codigo||'S/N'}</span>
              </div>
              <div class="plan-popup-row">
                <span class="plan-popup-key">Estado</span>
                <span class="plan-popup-pill ${estado ? 'plan-popup-pill--success' : 'plan-popup-pill--danger'}">${estado ? 'Pagado' : 'En Deuda'}</span>
              </div>
              <div class="plan-popup-row">
                <span class="plan-popup-key">Tarifa</span>
                <span class="plan-popup-pill plan-popup-pill--info">${p.tarifa||'S/N'}</span>
              </div>
              <div class="plan-popup-row">
                <span class="plan-popup-key">Avalúo</span>
                <span class="plan-popup-val" style="font-size:12px">${fmt(p.avaluo)}</span>
              </div>
              <div class="plan-popup-row">
                <span class="plan-popup-key">Total Pagado</span>
                <span class="plan-popup-val" style="color:var(--success)">${fmt(rec)}</span>
              </div>
              <div class="plan-popup-row">
                <span class="plan-popup-key">Último pago</span>
                <span class="plan-popup-val" style="font-size:12px">${fecha}</span>
              </div>
            </div>
            <button class="plan-popup-closer" onclick="this.closest('.plan-popup').parentElement.style.display='none'">✕</button>
          </div>
        `;
        popupRef.current.style.display = 'block';
        overlay.setPosition(evt.coordinate);
      } else {
        popupRef.current.style.display = 'none';
        overlay.setPosition(undefined);
      }
    });

    return () => { olMap.setTarget(null); };
  }, []);

  /* ── Cargar datos ── */
  useEffect(() => {
    api.get('/catastro/predios-pagos-2025')
      .then(r  => { setPredios(r.data); setCargando(false); })
      .catch(() => { setError('No se pudo conectar con el servidor financiero'); setCargando(false); });
  }, []);

  /* ── Actualizar capa ── */
  useEffect(() => {
    if (!predios || !olMapRef.current) return;
    if (layerRef.current) olMapRef.current.removeLayer(layerRef.current);

    const filtradas = predios.features.filter(f => {
      const rec  = f.properties.valorrecaudo || 0;
      const zona_ = (f.properties.zona||'').toLowerCase();
      let ok = true;
      if (estado === 'pagado') ok = ok && rec > 0;
      if (estado === 'deudor') ok = ok && rec === 0;
      if (zona)   ok = ok && zona_.includes(zona);
      if (tarifa) ok = ok && f.properties.tarifa === tarifa;
      return ok;
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
        const p      = feat.getProperties();
        const rec    = p.valorrecaudo || 0;
        const buscado= enfoque && p.codigo === enfoque.properties.codigo;
        const color  = buscado ? 'rgba(13,202,240,0.9)' : rec > 0 ? 'rgba(25,135,84,0.65)' : 'rgba(220,53,69,0.65)';
        return new Style({
          fill:   new Fill({ color }),
          stroke: new Stroke({ color: buscado ? '#0B2545' : 'rgba(255,255,255,0.6)', width: buscado ? 2.5 : 0.8 }),
        });
      }
    });

    olMapRef.current.addLayer(layer);
    layerRef.current = layer;
  }, [predios, estado, zona, tarifa, enfoque]);

  const buscar = () => {
    if (!codigo.trim() || !predios) return;
    const found = predios.features.find(f => f.properties.codigo === codigo.trim());
    if (found) {
      setEnfoque(found); setEstado(null); setZona(null); setTarifa(null);
      const feat   = new GeoJSON().readFeature(found, { featureProjection:'EPSG:3857' });
      olMapRef.current.getView().fit(feat.getGeometry().getExtent(), { padding:[60,60,60,60], maxZoom:18, duration:1400 });
    } else {
      alert(`No existe el código: ${codigo}`);
    }
  };

  return (
    <div style={{ height:'100%', width:'100%', position:'relative' }}>

      <div className="visor-search-wrap">
        <div className="visor-search-group">
          <input
            className="visor-search-input"
            placeholder="Buscar código para ver pagos…"
            value={codigo}
            onChange={e => setCodigo(e.target.value)}
            onKeyDown={e => e.key==='Enter' && buscar()}
          />
          <button className="visor-search-btn" onClick={buscar}>Buscar</button>
        </div>
      </div>

      {cargando && (
        <div className="visor-loader">
          <div className="visor-loader-spinner" />
          <span className="visor-loader-text">Cargando datos financieros 2025…</span>
        </div>
      )}

      {error && <div className="visor-error">{error}</div>}

      {predios && (
        <Dashboard
          datos={predios}
          estadoActivo={estado}  onSelectEstado={setEstado}
          zonaActiva={zona}      onSelectZona={setZona}
          tarifaActiva={tarifa}  onSelectTarifa={setTarifa}
        />
      )}

      <div ref={popupRef} style={{ display:'none' }} />
      <div ref={mapRef}   style={{ height:'100%', width:'100%' }} />
    </div>
  );
};

export default VisorPagos2025;
