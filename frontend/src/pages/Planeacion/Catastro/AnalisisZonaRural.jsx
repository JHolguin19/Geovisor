import { useState, useEffect, useRef, useCallback, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import AuthContext from '../../../context/AuthContext';
import { zonaRuralAvaluosService } from '../../../services/api';
import '../Planeacion.css';
import './AnalisisZonaRural.css';

/* ── Formatters ── */
const fmtM = n => {
  if (n == null) return '—';
  const v = Number(n);
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)} B`;
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)} B`;
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(1)} M`;
  return `$${v.toLocaleString('es-CO')}`;
};
const fmtN = n => n == null ? '—' : Number(n).toLocaleString('es-CO');
const fmtPct = n => n == null ? '—' : `${Number(n).toFixed(1)}%`;

/* ── Pareto / bracket color palettes ── */
const BRACKET_COLORS_NEW = ['#22c55e','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#991b1b'];
const BRACKET_COLORS_OLD = ['#86efac','#93c5fd','#c4b5fd','#fcd34d','#fca5a5'];
const PARETO_COLOR = '#1e40af';

export default function AnalisisZonaRural() {
  const { user } = useContext(AuthContext);
  const [stats, setStats]       = useState(null);
  const [brackets, setBrackets] = useState(null);
  const [pareto, setPareto]     = useState(null);
  const [veredas, setVeredas]   = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [s, b, p, v] = await Promise.all([
          zonaRuralAvaluosService.getStats(),
          zonaRuralAvaluosService.getBrackets(),
          zonaRuralAvaluosService.getPareto(),
          zonaRuralAvaluosService.getVeredas(),
        ]);
        setStats(s); setBrackets(b); setPareto(p); setVeredas(v);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="azr-page">
      {/* Header */}
      <header className="plan-header">
        <div className="plan-header-brand">
          <img src="/logos/logocolombia.png" alt="Colombia" className="plan-logo" />
          <img src="/logos/alcaldia.png"     alt="Alcaldía" className="plan-logo" />
          <div className="plan-header-text">
            <span className="plan-entity">Alcaldía Municipal · Santander de Quilichao</span>
            <span className="plan-header-name" style={{ color: '#A5D6A7' }}>Análisis Impacto Catastral Rural</span>
          </div>
        </div>
        <div className="plan-header-right">
          {user && (
            <span className="azr-user-badge">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="7" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              {user.username}
            </span>
          )}
          <Link to="/planeacion/catastro" className="plan-back-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Catastro
          </Link>
        </div>
      </header>
      <div className="plan-band" style={{ background: '#2E7D32' }} />

      <div className="azr-scroll">
        <div className="azr-container">

          {/* ── KPI CARDS ── */}
          <section className="azr-section">
            <h2 className="azr-section-title">
              <span className="azr-dot" style={{ background: '#2E7D32' }} />
              Resumen General — Actualización Catastral Rural 2025
            </h2>
            {loading ? <KpiSkeleton /> : <KpiGrid stats={stats} />}
          </section>

          {/* ── REVENUE IMPACT BANNER ── */}
          {!loading && stats && (
            <div className="azr-impact-banner">
              <ImpactCard
                label="Recaudo anterior"
                value={fmtM(stats.recaudo_antiguo_old_tarifa)}
                sub="Avalúo antiguo × tarifa anterior"
                color="#64748b"
              />
              <ImpactCard
                label="Recaudo proyectado"
                value={fmtM(stats.recaudo_nuevo_new_tarifa)}
                sub="Avalúo nuevo × tarifa nueva"
                color="#2E7D32"
              />
              <ImpactCard
                label="Incremento en recaudo"
                value={stats.recaudo_antiguo_old_tarifa > 0
                  ? `+${(((stats.recaudo_nuevo_new_tarifa / stats.recaudo_antiguo_old_tarifa) - 1) * 100).toFixed(0)}%`
                  : '—'}
                sub={`+${fmtM(stats.recaudo_nuevo_new_tarifa - stats.recaudo_antiguo_old_tarifa)} adicionales`}
                color="#dc2626"
              />
            </div>
          )}

          {/* ── BRACKET DISTRIBUTION ── */}
          <section className="azr-section">
            <div className="azr-row-2">
              <div className="azr-card">
                <div className="azr-card-header">
                  <span className="azr-card-title">Distribución — Tarifas Nuevas</span>
                  <span className="azr-card-badge azr-card-badge--green">Avalúo actualizado</span>
                </div>
                <div className="azr-card-body">
                  {loading ? <BarsSkeleton /> : brackets && (
                    <BracketBars data={brackets.nuevo} colors={BRACKET_COLORS_NEW} totalPredios={Number(stats?.total_predios || 1)} />
                  )}
                </div>
              </div>
              <div className="azr-card">
                <div className="azr-card-header">
                  <span className="azr-card-title">Distribución — Tarifas Anteriores</span>
                  <span className="azr-card-badge azr-card-badge--amber">Avalúo antiguo</span>
                </div>
                <div className="azr-card-body">
                  {loading ? <BarsSkeleton /> : brackets && (
                    <BracketBars data={brackets.antiguo} colors={BRACKET_COLORS_OLD} totalPredios={Number(stats?.total_predios || 1)} />
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ── PARETO CHART ── */}
          <section className="azr-section">
            <div className="azr-card">
              <div className="azr-card-header">
                <span className="azr-card-title">Diagrama de Pareto — Concentración del Recaudo</span>
                <span className="azr-card-badge azr-card-badge--blue">Principio 80/20</span>
              </div>
              <div className="azr-card-body">
                {loading ? <div className="azr-skel" style={{ height: 280 }} /> : pareto && <ParetoChart data={pareto} />}
              </div>
            </div>
          </section>

          {/* ── MAP ── */}
          <section className="azr-section">
            <div className="azr-card">
              <div className="azr-card-header">
                <span className="azr-card-title">Mapa Coroplético — Predios Rurales</span>
                <span className="azr-card-badge azr-card-badge--green">Avalúo nuevo vs antiguo</span>
              </div>
              <MapSection />
            </div>
          </section>

          {/* ── VEREDA IMPACT TABLE ── */}
          <section className="azr-section">
            {loading
              ? <div className="azr-card"><div className="azr-skel" style={{ height: 300, margin: 16 }} /></div>
              : veredas && <VeredaTable data={veredas} />
            }
          </section>

        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   SUB-COMPONENTS
   ============================================================================ */

function KpiGrid({ stats }) {
  if (!stats) return null;
  const s = stats;
  return (
    <div className="azr-kpi-grid">
      <div className="azr-kpi" style={{ '--kpi-color': '#2E7D32' }}>
        <div className="azr-kpi-label">Predios únicos</div>
        <div className="azr-kpi-value">{fmtN(s.total_predios)}</div>
        <div className="azr-kpi-sub">{fmtN(s.total_veredas)} veredas</div>
      </div>
      <div className="azr-kpi" style={{ '--kpi-color': '#1565C0' }}>
        <div className="azr-kpi-label">Avalúo promedio nuevo</div>
        <div className="azr-kpi-value">{fmtM(s.avg_avaluo_nuevo)}</div>
        <div className="azr-kpi-sub">Antes: {fmtM(s.avg_avaluo_antiguo)}</div>
      </div>
      <div className="azr-kpi" style={{ '--kpi-color': '#dc2626' }}>
        <div className="azr-kpi-label">Incremento promedio</div>
        <div className="azr-kpi-value">+{fmtPct(s.avg_pct_incremento)}</div>
        <div className="azr-kpi-sub azr-kpi-sub--up">Actualización IGAC 2025</div>
      </div>
      <div className="azr-kpi" style={{ '--kpi-color': '#6A1B9A' }}>
        <div className="azr-kpi-label">Base gravable total</div>
        <div className="azr-kpi-value">{fmtM(s.suma_avaluo_nuevo)}</div>
        <div className="azr-kpi-sub">Antes: {fmtM(s.suma_avaluo_antiguo)}</div>
      </div>
      <div className="azr-kpi" style={{ '--kpi-color': '#E65100' }}>
        <div className="azr-kpi-label">Recaudo proyectado</div>
        <div className="azr-kpi-value">{fmtM(s.recaudo_nuevo_new_tarifa)}</div>
        <div className="azr-kpi-sub">Antes: {fmtM(s.recaudo_antiguo_old_tarifa)}</div>
      </div>
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="azr-kpi-grid">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="azr-kpi">
          <div className="azr-skel" style={{ height: 10, width: '50%', marginBottom: 8 }} />
          <div className="azr-skel" style={{ height: 26, width: '70%', marginBottom: 6 }} />
          <div className="azr-skel" style={{ height: 10, width: '60%' }} />
        </div>
      ))}
    </div>
  );
}

function BarsSkeleton() {
  return Array.from({ length: 5 }).map((_, i) => (
    <div key={i} className="azr-bracket-row">
      <div className="azr-skel" style={{ height: 12, width: 80 }} />
      <div className="azr-skel" style={{ height: 24, flex: 1 }} />
    </div>
  ));
}

/* ── Bracket horizontal bars ── */
function BracketBars({ data, colors, totalPredios }) {
  const maxRecaudo = Math.max(...data.map(d => Number(d.recaudo_estimado)));
  return data.map((d, i) => {
    const pct = (Number(d.predios) / totalPredios * 100).toFixed(1);
    const barW = Math.max(4, Number(d.recaudo_estimado) / maxRecaudo * 100);
    return (
      <div key={i} className="azr-bracket-row">
        <div className="azr-bracket-label">{d.rango}<br/><span className="azr-bracket-tarifa">{d.tarifa}‰</span></div>
        <div className="azr-bracket-bar-wrap">
          <div className="azr-bracket-bar" style={{ width: `${barW}%`, background: colors[i] || '#64748b' }}>
            {barW > 18 && `${fmtN(d.predios)} (${pct}%)`}
          </div>
        </div>
        <div className="azr-bracket-vals">
          <strong>{fmtN(d.predios)}</strong> predios<br/>
          Recaudo: <strong>{fmtM(d.recaudo_estimado)}</strong>
        </div>
      </div>
    );
  });
}

/* ── Pareto SVG chart ── */
function ParetoChart({ data }) {
  const W = 700, H = 280, pad = { t: 20, r: 60, b: 40, l: 50 };
  const cw = W - pad.l - pad.r;
  const ch = H - pad.t - pad.b;

  const pts = data.map(d => ({
    x: pad.l + (Number(d.pct_predios) / 100) * cw,
    y: pad.t + ch - (Number(d.pct_acum_recaudo) / 100) * ch,
    pctP: Number(d.pct_predios),
    pctR: Number(d.pct_acum_recaudo),
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = linePath + ` L ${pts[pts.length - 1].x} ${pad.t + ch} L ${pad.l} ${pad.t + ch} Z`;

  let cross80 = null;
  for (let i = 0; i < pts.length; i++) {
    if (pts[i].pctR >= 80) { cross80 = pts[i]; break; }
  }

  const yTicks = [0, 20, 40, 60, 80, 100];
  const xTicks = [0, 20, 40, 60, 80, 100];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="azr-pareto-svg">
      {yTicks.map(t => (
        <g key={`y${t}`}>
          <line className="azr-pareto-grid" x1={pad.l} x2={W - pad.r} y1={pad.t + ch - t / 100 * ch} y2={pad.t + ch - t / 100 * ch} />
          <text x={pad.l - 6} y={pad.t + ch - t / 100 * ch + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="600">{t}%</text>
        </g>
      ))}
      {xTicks.map(t => (
        <text key={`x${t}`} x={pad.l + t / 100 * cw} y={H - pad.b + 16} textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="600">{t}%</text>
      ))}
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="700">% Acumulado de Predios (mayor avalúo → menor)</text>
      <text x={12} y={H / 2} textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="700" transform={`rotate(-90 12 ${H / 2})`}>% Acum. Recaudo</text>
      <line className="azr-pareto-rule" x1={pad.l} x2={W - pad.r} y1={pad.t + ch - 0.8 * ch} y2={pad.t + ch - 0.8 * ch} />
      <text className="azr-pareto-label-80" x={W - pad.r + 4} y={pad.t + ch - 0.8 * ch + 3}>80%</text>
      {cross80 && (
        <>
          <line className="azr-pareto-rule" x1={cross80.x} x2={cross80.x} y1={pad.t} y2={pad.t + ch} />
          <text className="azr-pareto-label-80" x={cross80.x} y={pad.t - 4} textAnchor="middle">
            {cross80.pctP.toFixed(0)}% predios → {cross80.pctR.toFixed(0)}% recaudo
          </text>
        </>
      )}
      <path d={areaPath} fill={PARETO_COLOR} className="azr-pareto-area" />
      <path d={linePath} stroke={PARETO_COLOR} className="azr-pareto-line" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#fff" stroke={PARETO_COLOR} className="azr-pareto-dot" />
      ))}
    </svg>
  );
}

/* ── Impact card ── */
function ImpactCard({ label, value, sub, color }) {
  return (
    <div className="azr-impact-card">
      <div className="azr-impact-label">{label}</div>
      <div className="azr-impact-val" style={{ color }}>{value}</div>
      <div className="azr-impact-sub">{sub}</div>
    </div>
  );
}

/* ── Map section with OL Overlay popup ── */
function MapSection() {
  const wrapRef = useRef(null);
  const mapRef = useRef(null);
  const popupRef = useRef(null);
  const olMapRef = useRef(null);
  const overlayRef = useRef(null);
  const [mode, setMode] = useState('impuesto');
  const [geojson, setGeojson] = useState(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [popupData, setPopupData] = useState(null);

  useEffect(() => {
    setMapLoading(true);
    zonaRuralAvaluosService.getPropertyGeoJSON(null, mode)
      .then(data => { setGeojson(data); setMapLoading(false); })
      .catch(e => { console.error(e); setMapLoading(false); });
  }, []);

  const closePopup = useCallback(() => {
    setPopupData(null);
    overlayRef.current?.setPosition(undefined);
  }, []);

  // ── Fullscreen ──
  const toggleFullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      (el.requestFullscreen?.() || el.webkitRequestFullscreen?.())?.catch(() => {});
    } else {
      document.exitFullscreen?.() || document.webkitExitFullscreen?.();
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      setTimeout(() => olMapRef.current?.updateSize(), 50);
      setTimeout(() => olMapRef.current?.updateSize(), 350);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  // ── Map init ──
  useEffect(() => {
    if (!geojson || !mapRef.current) return;
    let cancelled = false;

    (async () => {
      const ol = await import('ol');
      const { default: Overlay } = await import('ol/Overlay');
      const { default: TileLayer } = await import('ol/layer/Tile');
      const { default: VectorLayer } = await import('ol/layer/Vector');
      const { default: VectorSource } = await import('ol/source/Vector');
      const { default: OSM } = await import('ol/source/OSM');
      const { default: GeoJSON } = await import('ol/format/GeoJSON');
      const { Style, Fill, Stroke } = await import('ol/style');
      const { fromLonLat } = await import('ol/proj');

      if (cancelled) return;

      const source = new VectorSource({
        features: new GeoJSON().readFeatures(geojson, { featureProjection: 'EPSG:3857' }),
      });

      const ZR_COLORS = [
        '#d1fae5','#a7f3d0','#6ee7b7','#34d399',
        '#fef9c3','#fde047','#facc15',
        '#fdba74','#fb923c','#f97316',
        '#f87171','#ef4444','#dc2626','#7f1d1d'
      ];
      const NO_DATA_COLOR = '#cbd5e1';

      const getColor = (feature) => {
        const p = feature.getProperties();
        let raw, steps;
        if (mode === 'impuesto') {
          raw = p.impuesto_nuevo;
          steps = [20000,50000,100000,200000,400000,800000,1500000,3000000,5000000,8000000,15000000,30000000,60000000];
        } else if (mode === 'avaluo') {
          raw = p.avaluo_nuevo;
          steps = [3e6,7e6,10e6,20e6,40e6,60e6,100e6,250e6,500e6,1e9,2e9,5e9,10e9];
        } else {
          raw = p.incremento_pct;
          steps = [-10,0,10,30,60,100,200,400,700,1200,2000,4000,8000];
        }
        if (raw == null) return NO_DATA_COLOR;
        const val = Number(raw);
        let idx = steps.findIndex(s => val <= s);
        if (idx === -1) idx = ZR_COLORS.length - 1;
        return ZR_COLORS[idx];
      };

      const layer = new VectorLayer({
        source,
        style: (feature) => new Style({
          fill: new Fill({ color: getColor(feature) + 'c0' }),
          stroke: new Stroke({ color: '#166534', width: 0.5 }),
        }),
      });

      if (olMapRef.current) { olMapRef.current.setTarget(null); olMapRef.current = null; }

      // Create OL Overlay anchored to popup DOM node
      const overlay = new Overlay({
        element: popupRef.current,
        autoPan: { animation: { duration: 200 }, margin: 60 },
        positioning: 'bottom-center',
        offset: [0, -12],
      });
      overlayRef.current = overlay;

      const map = new ol.Map({
        target: mapRef.current,
        layers: [new TileLayer({ source: new OSM() }), layer],
        view: new ol.View({ center: fromLonLat([-76.48, 3.00]), zoom: 11 }),
        overlays: [overlay],
      });

      const ext = source.getExtent();
      if (ext[0] !== Infinity) map.getView().fit(ext, { padding: [40, 40, 40, 40], maxZoom: 14 });

      // Click → set overlay position at map coordinate
      map.on('click', (evt) => {
        const feature = map.forEachFeatureAtPixel(evt.pixel, f => f);
        if (feature) {
          const props = feature.getProperties();
          setPopupData(props);
          overlay.setPosition(evt.coordinate);
        } else {
          setPopupData(null);
          overlay.setPosition(undefined);
        }
      });

      map.on('pointermove', (evt) => {
        const hit = map.hasFeatureAtPixel(evt.pixel);
        map.getTargetElement().style.cursor = hit ? 'pointer' : '';
      });

      olMapRef.current = map;
    })();

    return () => {
      cancelled = true;
      if (olMapRef.current) { olMapRef.current.setTarget(null); olMapRef.current = null; }
    };
  }, [geojson, mode]);

  const handleMode = useCallback((m) => {
    setMode(m);
    closePopup();
  }, [closePopup]);

  const LEGEND_MAP = {
    impuesto: [
      { color: '#d1fae5', label: '< $20K' },     { color: '#a7f3d0', label: '$20K–50K' },
      { color: '#6ee7b7', label: '$50K–100K' },   { color: '#34d399', label: '$100K–200K' },
      { color: '#fef9c3', label: '$200K–400K' },   { color: '#fde047', label: '$400K–800K' },
      { color: '#facc15', label: '$800K–1.5M' },   { color: '#fdba74', label: '$1.5M–3M' },
      { color: '#fb923c', label: '$3M–5M' },       { color: '#f97316', label: '$5M–8M' },
      { color: '#f87171', label: '$8M–15M' },      { color: '#ef4444', label: '$15M–30M' },
      { color: '#dc2626', label: '$30M–60M' },     { color: '#7f1d1d', label: '> $60M' },
    ],
    avaluo: [
      { color: '#d1fae5', label: '< $3M' },       { color: '#a7f3d0', label: '$3M–7M' },
      { color: '#6ee7b7', label: '$7M–10M' },     { color: '#34d399', label: '$10M–20M' },
      { color: '#fef9c3', label: '$20M–40M' },     { color: '#fde047', label: '$40M–60M' },
      { color: '#facc15', label: '$60M–100M' },    { color: '#fdba74', label: '$100M–250M' },
      { color: '#fb923c', label: '$250M–500M' },   { color: '#f97316', label: '$500M–1B' },
      { color: '#f87171', label: '$1B–2B' },       { color: '#ef4444', label: '$2B–5B' },
      { color: '#dc2626', label: '$5B–10B' },      { color: '#7f1d1d', label: '> $10B' },
    ],
    incremento: [
      { color: '#d1fae5', label: 'Negativo' },     { color: '#a7f3d0', label: '0%' },
      { color: '#6ee7b7', label: '0–10%' },        { color: '#34d399', label: '10–30%' },
      { color: '#fef9c3', label: '30–60%' },        { color: '#fde047', label: '60–100%' },
      { color: '#facc15', label: '100–200%' },      { color: '#fdba74', label: '200–400%' },
      { color: '#fb923c', label: '400–700%' },      { color: '#f97316', label: '700–1200%' },
      { color: '#f87171', label: '1200–2000%' },    { color: '#ef4444', label: '2000–4000%' },
      { color: '#dc2626', label: '4000–8000%' },    { color: '#7f1d1d', label: '> 8000%' },
    ],
  };

  const TITLES = { impuesto: 'Impuesto predial anual', avaluo: 'Avalúo catastral nuevo', incremento: '% Incremento avalúo' };

  return (
    <div ref={wrapRef} className={`azr-map-wrap${isFullscreen ? ' azr-map-wrap--fs' : ''}`}>
      <div ref={mapRef} className="azr-map-target" />

      {mapLoading && (
        <div className="azr-map-loading">
          <div className="azr-map-loading-spinner" />
          Cargando predios...
        </div>
      )}

      {/* Controls */}
      <div className="azr-map-controls">
        {['impuesto','avaluo','incremento'].map(m => (
          <button key={m} className={`azr-map-btn${mode === m ? ' azr-map-btn--active' : ''}`} onClick={() => handleMode(m)}>
            {m === 'impuesto' ? 'Impuesto' : m === 'avaluo' ? 'Avalúo' : '% Cambio'}
          </button>
        ))}
        <button className="azr-map-btn azr-map-btn--fs" onClick={toggleFullscreen} title={isFullscreen ? 'Salir (Esc)' : 'Pantalla completa'}>
          {isFullscreen ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v4a1 1 0 0 1-1 1H3"/><path d="M21 8h-4a1 1 0 0 1-1-1V3"/><path d="M3 16h4a1 1 0 0 1 1 1v4"/><path d="M16 21v-4a1 1 0 0 1 1-1h4"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8V5a2 2 0 0 1 2-2h3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M21 16v3a2 2 0 0 1-2 2h-3"/>
            </svg>
          )}
        </button>
      </div>

      {/* Legend */}
      <div className="azr-legend">
        <div className="azr-legend-title">{TITLES[mode]}</div>
        {LEGEND_MAP[mode].map((s, i) => (
          <div key={i} className="azr-legend-row">
            <div className="azr-legend-swatch" style={{ background: s.color }} />
            <span className="azr-legend-text">{s.label}</span>
          </div>
        ))}
        <div className="azr-legend-row" style={{ marginTop: 4 }}>
          <div className="azr-legend-swatch" style={{ background: '#cbd5e1' }} />
          <span className="azr-legend-text">Sin datos</span>
        </div>
      </div>

      {/* OL Overlay popup — always in DOM, visibility controlled by OL */}
      <div ref={popupRef} className="azr-popup-anchor">
        {popupData && (
          <div className="azr-popup">
            <button className="azr-popup-close" onClick={closePopup}>×</button>
            <div className="azr-popup-title">{popupData.codigo || 'Sin código'}</div>

            <div className="azr-popup-group">
              <PopupRow label="Propietario" value={popupData.propietario || '—'} />
              <PopupRow label="Vereda" value={popupData.vereda || '—'} />
              <PopupRow label="Área predio" value={popupData.area_predio != null ? fmtN(popupData.area_predio) + ' m²' : '—'} />
              <PopupRow label="Área construida" value={popupData.area_construida != null ? fmtN(popupData.area_construida) + ' m²' : '—'} />
            </div>

            <div className="azr-popup-group">
              <div className="azr-popup-group-label">Avalúo catastral</div>
              <PopupRow label="Anterior" value={fmtM(popupData.avaluo_antiguo)} />
              <PopupRow label="Nuevo" value={fmtM(popupData.avaluo_nuevo)} highlight />
              <PopupRow label="Incremento" value={fmtPct(popupData.incremento_pct)} />
            </div>

            <div className="azr-popup-group">
              <div className="azr-popup-group-label">Impuesto predial</div>
              <PopupRow label="Tarifa anterior" value={fmtM(popupData.impuesto_antiguo)} />
              <PopupRow label="Tarifa nueva" value={fmtM(popupData.impuesto_nuevo)} highlight />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PopupRow({ label, value, highlight }) {
  return (
    <div className="azr-popup-row">
      <span className="azr-popup-label">{label}</span>
      <span className={`azr-popup-val${highlight ? ' azr-popup-val--highlight' : ''}`}>{value}</span>
    </div>
  );
}

/* ── Vereda impact table with sorting, filtering, and tax columns ── */

const COLUMNS = [
  { key: 'vereda',              label: 'Vereda',                 align: 'left',  sortable: true,  type: 'text' },
  { key: 'predios',             label: 'Predios',                align: 'right', sortable: true,  type: 'number' },
  { key: 'avg_avaluo_antiguo',  label: 'Avalúo Prom. Antiguo',   align: 'right', sortable: true,  type: 'money' },
  { key: 'avg_avaluo_nuevo',    label: 'Avalúo Prom. Nuevo',     align: 'right', sortable: true,  type: 'money' },
  { key: 'avg_pct_incremento',  label: 'Incremento',             align: 'right', sortable: true,  type: 'pct' },
  { key: 'avg_impuesto_antiguo',label: 'Predial Prom. Anterior',  align: 'right', sortable: true,  type: 'money' },
  { key: 'avg_impuesto_nuevo',  label: 'Predial Prom. Nuevo',     align: 'right', sortable: true,  type: 'money' },
  { key: 'recaudo_antiguo',     label: 'Recaudo Anterior',       align: 'right', sortable: true,  type: 'money' },
  { key: 'recaudo_nuevo',       label: 'Recaudo Proyectado',     align: 'right', sortable: true,  type: 'money' },
  { key: 'delta_recaudo',       label: 'Diferencia Recaudo',     align: 'right', sortable: true,  type: 'money', computed: true },
  { key: 'pct_delta_recaudo',   label: '% Cambio Recaudo',       align: 'right', sortable: true,  type: 'pct',   computed: true },
];

function VeredaTable({ data }) {
  const [sortCol, setSortCol]     = useState('avg_pct_incremento');
  const [sortDir, setSortDir]     = useState('desc');
  const [filterText, setFilter]   = useState('');
  const [filterCol, setFilterCol] = useState(null);
  const [filterRange, setRange]   = useState({ min: '', max: '' });

  const enriched = useMemo(() => data.map(r => ({
    ...r,
    delta_recaudo: Number(r.recaudo_nuevo) - Number(r.recaudo_antiguo),
    pct_delta_recaudo: Number(r.recaudo_antiguo) > 0
      ? ((Number(r.recaudo_nuevo) / Number(r.recaudo_antiguo)) - 1) * 100
      : null,
  })), [data]);

  const filtered = useMemo(() => {
    let rows = enriched;
    if (filterText) {
      const q = filterText.toLowerCase();
      rows = rows.filter(r => r.vereda.toLowerCase().includes(q));
    }
    if (filterCol && (filterRange.min !== '' || filterRange.max !== '')) {
      rows = rows.filter(r => {
        const val = Number(r[filterCol]);
        if (isNaN(val)) return false;
        if (filterRange.min !== '' && val < Number(filterRange.min)) return false;
        if (filterRange.max !== '' && val > Number(filterRange.max)) return false;
        return true;
      });
    }
    return rows;
  }, [enriched, filterText, filterCol, filterRange]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let va = a[sortCol], vb = b[sortCol];
      if (sortCol === 'vereda') {
        va = (va || '').toLowerCase(); vb = (vb || '').toLowerCase();
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      va = Number(va) || 0; vb = Number(vb) || 0;
      return sortDir === 'asc' ? va - vb : vb - va;
    });
    return arr;
  }, [filtered, sortCol, sortDir]);

  const toggleSort = key => {
    if (sortCol === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(key); setSortDir('desc'); }
  };

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <span className="azr-sort-icon azr-sort-icon--idle">&#x21C5;</span>;
    return <span className="azr-sort-icon">{sortDir === 'asc' ? '&#x25B2;' : '&#x25BC;'}</span>;
  };

  const pctChip = pct => {
    const n = Number(pct);
    if (isNaN(n)) return '—';
    const cls = n < 100 ? 'azr-pct-chip--low' : n < 300 ? 'azr-pct-chip--med' : 'azr-pct-chip--high';
    return <span className={`azr-pct-chip ${cls}`}>{n >= 0 ? '+' : ''}{fmtPct(pct)}</span>;
  };

  const deltaChip = val => {
    const n = Number(val);
    if (isNaN(n)) return '—';
    const cls = n >= 0 ? 'azr-delta--up' : 'azr-delta--down';
    return <span className={`azr-delta-chip ${cls}`}>{n >= 0 ? '+' : ''}{fmtM(n)}</span>;
  };

  const renderCell = (r, col) => {
    const v = r[col.key];
    switch (col.key) {
      case 'vereda':              return <td key={col.key} className="name">{v}</td>;
      case 'predios':             return <td key={col.key} className="n">{fmtN(v)}</td>;
      case 'avg_avaluo_antiguo':  return <td key={col.key} className="r" style={{ fontWeight: 600 }}>{fmtM(v)}</td>;
      case 'avg_avaluo_nuevo':    return <td key={col.key} className="n">{fmtM(v)}</td>;
      case 'avg_pct_incremento':  return <td key={col.key} className="r">{pctChip(v)}</td>;
      case 'avg_impuesto_antiguo':return <td key={col.key} className="r" style={{ fontWeight: 600 }}>{fmtM(v)}</td>;
      case 'avg_impuesto_nuevo':  return <td key={col.key} className="n g">{fmtM(v)}</td>;
      case 'recaudo_antiguo':     return <td key={col.key} className="r" style={{ fontWeight: 600 }}>{fmtM(v)}</td>;
      case 'recaudo_nuevo':       return <td key={col.key} className="n g">{fmtM(v)}</td>;
      case 'delta_recaudo':       return <td key={col.key} className="r">{deltaChip(v)}</td>;
      case 'pct_delta_recaudo':   return <td key={col.key} className="r">{pctChip(v)}</td>;
      default:                    return <td key={col.key} className="r">{v}</td>;
    }
  };

  const numericCols = COLUMNS.filter(c => c.type !== 'text');
  const clearFilters = () => { setFilter(''); setFilterCol(null); setRange({ min: '', max: '' }); };
  const hasActiveFilters = filterText || (filterCol && (filterRange.min !== '' || filterRange.max !== ''));

  return (
    <div className="azr-card">
      <div className="azr-card-header">
        <span className="azr-card-title">Impacto Financiero por Vereda</span>
        <span className="azr-card-badge azr-card-badge--green">
          {sorted.length}{sorted.length !== data.length ? ` de ${data.length}` : ''} veredas
        </span>
      </div>

      {/* Filter bar */}
      <div className="azr-filter-bar">
        <div className="azr-filter-group">
          <svg className="azr-filter-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            className="azr-filter-input"
            type="text"
            placeholder="Buscar vereda..."
            value={filterText}
            onChange={e => setFilter(e.target.value)}
          />
        </div>

        <div className="azr-filter-group">
          <svg className="azr-filter-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>
          </svg>
          <select
            className="azr-filter-select"
            value={filterCol || ''}
            onChange={e => { setFilterCol(e.target.value || null); setRange({ min: '', max: '' }); }}
          >
            <option value="">Filtrar columna...</option>
            {numericCols.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          {filterCol && (
            <>
              <input
                className="azr-filter-range"
                type="number"
                placeholder="Min"
                value={filterRange.min}
                onChange={e => setRange(p => ({ ...p, min: e.target.value }))}
              />
              <span className="azr-filter-dash">–</span>
              <input
                className="azr-filter-range"
                type="number"
                placeholder="Max"
                value={filterRange.max}
                onChange={e => setRange(p => ({ ...p, max: e.target.value }))}
              />
            </>
          )}
        </div>

        {hasActiveFilters && (
          <button className="azr-filter-clear" onClick={clearFilters}>
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="azr-table-scroll">
        <table className="azr-table azr-table--sortable">
          <thead>
            <tr>
              <th>#</th>
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  className={`${col.align === 'right' ? 'r' : ''} ${col.sortable ? 'azr-th--sortable' : ''}`}
                  onClick={() => col.sortable && toggleSort(col.key)}
                >
                  {col.label}
                  {col.sortable && <SortIcon col={col.key} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={COLUMNS.length + 1} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>Sin resultados para los filtros aplicados</td></tr>
            ) : sorted.map((r, i) => (
              <tr key={r.vereda}>
                <td className="azr-table-num">{i + 1}</td>
                {COLUMNS.map(col => renderCell(r, col))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
