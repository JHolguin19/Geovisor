import { useEffect, useRef, useState } from 'react';
import api from '../../../services/api';
import Dashboard from './components/Dashboard_VisorPotencialRecaudo';
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

const colorPorTarifa = (tarifa) => {
  const t = (tarifa || '').toString();
  if (t.includes('1')) return [220, 53, 69];
  if (t.includes('2')) return [255, 193, 7];
  if (t.includes('3')) return [13, 110, 253];
  if (t.includes('4')) return [25, 135, 84];
  return [108, 117, 125];
};

const fmt = (v) => new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(v||0);

const VisorPotencialRecaudo = () => {
  const mapRef    = useRef(null);
  const popupRef  = useRef(null);
  const olMapRef  = useRef(null);
  const overlayRef= useRef(null);
  const layerRef  = useRef(null);

  const [predios,    setPredios]    = useState(null);
  const [tarifa,     setTarifa]     = useState(null);
  const [zona,       setZona]       = useState(null);
  const [codigo,     setCodigo]     = useState('');
  const [enfoque,    setEnfoque]    = useState(null);
  const [cargando,   setCargando]   = useState(true);
  const [error,      setError]      = useState(null);

  /* ── Inicializar mapa ── */
  useEffect(() => {
    const overlay = new Overlay({ element: popupRef.current, autoPan: { animation: { duration: 250 } } });
    const olMap = new Map({
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
        popupRef.current.innerHTML = `
          <div class="plan-popup">
            <div class="plan-popup-header plan-popup-header--dark">🏡 Predio Catastral</div>
            <div class="plan-popup-body">
              <div class="plan-popup-row">
                <span class="plan-popup-key">Código</span>
                <span class="plan-popup-val" style="font-family:monospace;font-size:12px">${p.codigo||'S/N'}</span>
              </div>
              <div class="plan-popup-row">
                <span class="plan-popup-key">Zona</span>
                <span class="plan-popup-pill plan-popup-pill--muted">${p.zona||'N/A'}</span>
              </div>
              <div class="plan-popup-row">
                <span class="plan-popup-key">Avalúo</span>
                <span class="plan-popup-pill plan-popup-pill--success">${fmt(p.avaluo)}</span>
              </div>
              <div class="plan-popup-row">
                <span class="plan-popup-key">Tarifa</span>
                <span class="plan-popup-pill plan-popup-pill--dark">${p.tarifa||'0'}</span>
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
    api.get('/catastro/predios')
      .then(r  => { setPredios(r.data); setCargando(false); })
      .catch(() => { setError('No se pudo conectar con el servidor catastral'); setCargando(false); });
  }, []);

  /* ── Actualizar capa ── */
  useEffect(() => {
    if (!predios || !olMapRef.current) return;
    if (layerRef.current) olMapRef.current.removeLayer(layerRef.current);

    const filtradas = predios.features.filter(f => {
      const cumpleTarifa = tarifa === null || f.properties.tarifa === tarifa;
      const cumpleZona   = zona   === null || (f.properties.zona||'').toLowerCase().includes(zona);
      return cumpleTarifa && cumpleZona;
    });

    const source = new VectorSource({
      features: new GeoJSON().readFeatures(
        { type:'FeatureCollection', features: filtradas },
        { featureProjection: 'EPSG:3857' }
      )
    });

    const layer = new VectorLayer({
      source,
      style: (feat) => {
        const p  = feat.getProperties();
        const [r,g,b] = colorPorTarifa(p.tarifa);
        const buscado = enfoque && p.codigo === enfoque.properties.codigo;
        return new Style({
          fill:   new Fill({ color: buscado ? 'rgba(0,255,255,0.9)' : `rgba(${r},${g},${b},0.6)` }),
          stroke: new Stroke({ color: buscado ? '#0B2545' : 'rgba(255,255,255,0.7)', width: buscado ? 2.5 : 0.8 }),
        });
      }
    });

    olMapRef.current.addLayer(layer);
    layerRef.current = layer;
  }, [predios, tarifa, zona, enfoque]);

  const buscar = () => {
    if (!codigo.trim() || !predios) return;
    const found = predios.features.find(f => f.properties.codigo === codigo.trim());
    if (found) {
      setEnfoque(found); setTarifa(null); setZona(null);
      const feat   = new GeoJSON().readFeature(found, { featureProjection:'EPSG:3857' });
      const extent = feat.getGeometry().getExtent();
      olMapRef.current.getView().fit(extent, { padding:[60,60,60,60], maxZoom:18, duration:1400 });
    } else {
      alert(`No existe el código: ${codigo}`);
    }
  };

  return (
    <div style={{ height:'100%', width:'100%', position:'relative' }}>

      {/* Barra de búsqueda */}
      <div className="visor-search-wrap">
        <div className="visor-search-group">
          <input
            className="visor-search-input"
            placeholder="Ingrese el código del predio..."
            value={codigo}
            onChange={e => setCodigo(e.target.value)}
            onKeyDown={e => e.key==='Enter' && buscar()}
          />
          <button className="visor-search-btn" onClick={buscar}>Buscar</button>
        </div>
      </div>

      {/* Cargando */}
      {cargando && (
        <div className="visor-loader">
          <div className="visor-loader-spinner" />
          <span className="visor-loader-text">Cargando predios catastrales…</span>
        </div>
      )}

      {error && <div className="visor-error">{error}</div>}

      {/* Panel lateral */}
      {predios && (
        <Dashboard
          datos={predios}
          tarifaActiva={tarifa} onSelectTarifa={setTarifa}
          zonaActiva={zona}     onSelectZona={setZona}
        />
      )}

      {/* Popup */}
      <div ref={popupRef} style={{ display:'none' }} />

      {/* Mapa */}
      <div ref={mapRef} style={{ height:'100%', width:'100%' }} />
    </div>
  );
};

export default VisorPotencialRecaudo;
