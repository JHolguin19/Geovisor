import { useState, useEffect, useRef, useCallback, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import AuthContext from '../../../context/AuthContext';
import { zonaUrbanaAvaluosService } from '../../../services/api';
import '../Planeacion.css';
import './AnalisisZonaUrbana.css';

/* ── Formatters ── */
const fmtM = n => {
  if (n == null) return '—';
  const v = Number(n);
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)} mM`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)} M`;
  return `$${v.toLocaleString('es-CO')}`;
};
const fmtN   = n => n == null ? '—' : Number(n).toLocaleString('es-CO');
const fmtPct = n => n == null ? '—' : `${Number(n).toFixed(1)}%`;

/* ── Economic destination map ── */
const DEST_ECO = {
  A:'Habitacional', B:'Industrial', C:'Comercial', D:'Agrícola',
  E:'Minería', F:'Cultural', G:'Recreacional', H:'Salud',
  I:'Institucional', J:'Educativo', K:'Religioso', L:'Cultivos',
  M:'Pecuario', N:'Agroindustrial', O:'Forestal', P:'Uso Público',
  Q:'Serv. Especiales', R:'Lote Urbanizable', S:'Lote No Edificado', T:'No Urbanizable',
};

/* ── Color palettes ── */
// 6 colors: 5 urban brackets + commercial (10‰)
const BRACKET_COLORS_NEW = ['#22c55e','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#991b1b'];
const BRACKET_COLORS_OLD = ['#86efac','#93c5fd','#c4b5fd','#fcd34d','#fca5a5'];
const PARETO_COLOR = '#166534';

/* ── Rural-style choropleth colors (green → yellow → orange → red) ── */
const MAP_COLORS = [
  '#d1fae5','#a7f3d0','#6ee7b7','#34d399',
  '#fef9c3','#fde047','#facc15',
  '#fdba74','#fb923c','#f97316',
  '#f87171','#ef4444','#dc2626','#7f1d1d',
];

/* ============================================================================
   MAIN PAGE
   ============================================================================ */

export default function AnalisisZonaUrbana() {
  const { user } = useContext(AuthContext);

  const [barrio, setBarrio]             = useState(null);
  const [barrios, setBarrios]           = useState([]);
  const [stats, setStats]               = useState(null);
  const [brackets, setBrackets]         = useState(null);
  const [pareto, setPareto]             = useState(null);
  const [barrioImpact, setBarrioImpact] = useState(null);
  const [loading, setLoading]           = useState(true);

  /* Initial load — barrios list + static barrioImpact */
  useEffect(() => {
    Promise.all([
      zonaUrbanaAvaluosService.getBarrios(),
      zonaUrbanaAvaluosService.getBarrioImpact(),
    ]).then(([bl, impact]) => {
      setBarrios(bl);
      setBarrioImpact(impact);
    }).catch(console.error);
  }, []);

  /* Re-fetch filterable data whenever barrio changes */
  useEffect(() => {
    setLoading(true);
    Promise.all([
      zonaUrbanaAvaluosService.getStats(barrio),
      zonaUrbanaAvaluosService.getBrackets(barrio),
      zonaUrbanaAvaluosService.getPareto(barrio),
    ]).then(([s, b, p]) => {
      setStats(s); setBrackets(b); setPareto(p);
    }).catch(console.error)
    .finally(() => setLoading(false));
  }, [barrio]);

  const clearBarrio = useCallback(() => setBarrio(null), []);
  const isFiltered  = barrio !== null;

  return (
    <div className="azu-page">

      {/* Header */}
      <header className="plan-header">
        <div className="plan-header-brand">
          <img src="/logos/logocolombia.png" alt="Colombia" className="plan-logo" />
          <img src="/logos/alcaldia.png"     alt="Alcaldía" className="plan-logo" />
          <div className="plan-header-text">
            <span className="plan-entity">Alcaldía Municipal · Santander de Quilichao</span>
            <span className="plan-header-name" style={{ color: '#90CAF9' }}>Análisis Impacto Catastral Urbano</span>
          </div>
        </div>
        <div className="plan-header-right">
          {user && (
            <span className="azu-user-badge">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="7" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
              {user.username}
            </span>
          )}
          <Link to="/planeacion/catastro" className="plan-back-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Catastro
          </Link>
        </div>
      </header>
      <div className="plan-band" style={{ background: '#1565C0' }} />

      <div className="azu-scroll">
        <div className="azu-container">

          {/* ── BARRIO FILTER BANNER ── */}
          <div className="azu-filter-banner">
            <div className="azu-filter-banner-inner">
              <div className="azu-filter-banner-label">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                Filtrar por barrio
              </div>
              <select
                className="azu-filter-banner-select"
                value={barrio === null ? '' : barrio}
                onChange={e => setBarrio(e.target.value || null)}
              >
                <option value="">Todos los barrios ({barrios.length})</option>
                {barrios.map(b => (
                  <option key={b.barrio} value={b.barrio}>
                    {b.barrio} — {fmtN(b.predios)} predios
                  </option>
                ))}
              </select>
              {isFiltered && (
                <>
                  <span className="azu-filter-chip">{barrio}</span>
                  <button
                    type="button"
                    className="azu-filter-clear-btn"
                    onClick={clearBarrio}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                    Limpiar
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ── KPI CARDS ── */}
          <section className="azu-section">
            <h2 className="azu-section-title">
              <span className="azu-dot" style={{ background: '#1565C0' }} />
              {isFiltered
                ? `Barrio: ${barrio}`
                : 'Resumen General — Actualización Catastral Urbana 2026'}
            </h2>
            {loading ? <KpiSkeleton /> : <KpiGrid stats={stats} />}
          </section>

          {/* ── REVENUE IMPACT BANNER ── */}
          {!loading && stats && (
            <div className="azu-impact-banner">
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
                color="#1565C0"
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
          <section className="azu-section">
            <div className="azu-row-2">
              <div className="azu-card">
                <div className="azu-card-header">
                  <span className="azu-card-title">Distribución — Tarifas Nuevas</span>
                  <span className="azu-card-badge azu-card-badge--blue">Avalúo actualizado</span>
                </div>
                <div className="azu-card-body">
                  {loading ? <BarsSkeleton /> : brackets && (
                    <BracketBars data={brackets.nuevo} colors={BRACKET_COLORS_NEW} totalPredios={Number(stats?.total_predios || 1)} />
                  )}
                </div>
              </div>
              <div className="azu-card">
                <div className="azu-card-header">
                  <span className="azu-card-title">Distribución — Tarifas Anteriores</span>
                  <span className="azu-card-badge azu-card-badge--amber">Avalúo antiguo</span>
                </div>
                <div className="azu-card-body">
                  {loading ? <BarsSkeleton /> : brackets && (
                    <BracketBars data={brackets.antiguo} colors={BRACKET_COLORS_OLD} totalPredios={Number(stats?.total_predios || 1)} />
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ── PARETO CHART ── */}
          <section className="azu-section">
            <div className="azu-card">
              <div className="azu-card-header">
                <span className="azu-card-title">Diagrama de Pareto — Concentración del Recaudo</span>
                <span className="azu-card-badge azu-card-badge--blue">Principio 80/20</span>
              </div>
              <div className="azu-card-body">
                {loading
                  ? <div className="azu-skel" style={{ height: 280 }} />
                  : pareto && <ParetoChart data={pareto} />}
              </div>
            </div>
          </section>

          {/* ── MAP ── */}
          <section className="azu-section">
            <div className="azu-card">
              <div className="azu-card-header">
                <span className="azu-card-title">
                  {barrio ? `Predios Individuales — ${barrio}` : 'Mapa Coroplético — Barrios Urbanos'}
                </span>
                <span className="azu-card-badge azu-card-badge--green">
                  {barrio ? `Barrio: ${barrio}` : 'Clic en un barrio → ver predios individuales'}
                </span>
              </div>
              <MapSection barrio={barrio} onSelectBarrio={setBarrio} />
            </div>
          </section>

          {/* ── BARRIO IMPACT TABLE ── */}
          <section className="azu-section">
            {!barrioImpact
              ? <div className="azu-card"><div className="azu-skel" style={{ height: 300, margin: 16 }} /></div>
              : <BarrioTable data={barrioImpact} selectedBarrio={barrio} onSelectBarrio={setBarrio} onClearBarrio={clearBarrio} />
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
    <div className="azu-kpi-grid">
      <div className="azu-kpi" style={{ '--kpi-color': '#1565C0' }}>
        <div className="azu-kpi-label">Predios urbanos</div>
        <div className="azu-kpi-value">{fmtN(s.total_predios)}</div>
        <div className="azu-kpi-sub">{fmtN(s.total_barrios)} barrios</div>
      </div>
      <div className="azu-kpi" style={{ '--kpi-color': '#0288D1' }}>
        <div className="azu-kpi-label">Avalúo promedio nuevo</div>
        <div className="azu-kpi-value">{fmtM(s.avg_avaluo_nuevo)}</div>
        <div className="azu-kpi-sub">Antes: {fmtM(s.avg_avaluo_antiguo)}</div>
      </div>
      <div className="azu-kpi" style={{ '--kpi-color': '#dc2626' }}>
        <div className="azu-kpi-label">Incremento promedio</div>
        <div className="azu-kpi-value">+{fmtPct(s.avg_pct_incremento)}</div>
        <div className="azu-kpi-sub azu-kpi-sub--up">Actualización IGAC 2026</div>
      </div>
      <div className="azu-kpi" style={{ '--kpi-color': '#6A1B9A' }}>
        <div className="azu-kpi-label">Base gravable total</div>
        <div className="azu-kpi-value">{fmtM(s.suma_avaluo_nuevo)}</div>
        <div className="azu-kpi-sub">Antes: {fmtM(s.suma_avaluo_antiguo)}</div>
      </div>
      <div className="azu-kpi" style={{ '--kpi-color': '#E65100' }}>
        <div className="azu-kpi-label">Recaudo proyectado</div>
        <div className="azu-kpi-value">{fmtM(s.recaudo_nuevo_new_tarifa)}</div>
        <div className="azu-kpi-sub">Antes: {fmtM(s.recaudo_antiguo_old_tarifa)}</div>
      </div>
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="azu-kpi-grid">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="azu-kpi">
          <div className="azu-skel" style={{ height: 10, width: '50%', marginBottom: 8 }} />
          <div className="azu-skel" style={{ height: 26, width: '70%', marginBottom: 6 }} />
          <div className="azu-skel" style={{ height: 10, width: '60%' }} />
        </div>
      ))}
    </div>
  );
}

function BarsSkeleton() {
  return Array.from({ length: 6 }).map((_, i) => (
    <div key={i} className="azu-bracket-row">
      <div className="azu-skel" style={{ height: 12, width: 80 }} />
      <div className="azu-skel" style={{ height: 24, flex: 1 }} />
    </div>
  ));
}

function BracketBars({ data, colors, totalPredios }) {
  const maxRecaudo = Math.max(...data.map(d => Number(d.recaudo_estimado)));
  return data.map((d, i) => {
    const pct = (Number(d.predios) / totalPredios * 100).toFixed(1);
    const barW = Math.max(4, Number(d.recaudo_estimado) / maxRecaudo * 100);
    return (
      <div key={i} className="azu-bracket-row">
        <div className="azu-bracket-label">
          {d.rango}<br/>
          <span className="azu-bracket-tarifa">{d.tarifa}‰</span>
        </div>
        <div className="azu-bracket-bar-wrap">
          <div className="azu-bracket-bar" style={{ width: `${barW}%`, background: colors[i] || '#64748b' }}>
            {barW > 18 && `${fmtN(d.predios)} (${pct}%)`}
          </div>
        </div>
        <div className="azu-bracket-vals">
          <strong>{fmtN(d.predios)}</strong> predios<br/>
          Recaudo: <strong>{fmtM(d.recaudo_estimado)}</strong>
        </div>
      </div>
    );
  });
}

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

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="azu-pareto-svg">
      {[0,20,40,60,80,100].map(t => (
        <g key={`y${t}`}>
          <line className="azu-pareto-grid" x1={pad.l} x2={W-pad.r} y1={pad.t+ch-t/100*ch} y2={pad.t+ch-t/100*ch} />
          <text x={pad.l-6} y={pad.t+ch-t/100*ch+3} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="600">{t}%</text>
        </g>
      ))}
      {[0,20,40,60,80,100].map(t => (
        <text key={`x${t}`} x={pad.l+t/100*cw} y={H-pad.b+16} textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="600">{t}%</text>
      ))}
      <text x={W/2} y={H-4} textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="700">% Acumulado de Predios (mayor avalúo → menor)</text>
      <text x={12} y={H/2} textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="700" transform={`rotate(-90 12 ${H/2})`}>% Acum. Recaudo</text>
      <line className="azu-pareto-rule" x1={pad.l} x2={W-pad.r} y1={pad.t+ch-0.8*ch} y2={pad.t+ch-0.8*ch} />
      <text className="azu-pareto-label-80" x={W-pad.r+4} y={pad.t+ch-0.8*ch+3}>80%</text>
      {cross80 && (
        <>
          <line className="azu-pareto-rule" x1={cross80.x} x2={cross80.x} y1={pad.t} y2={pad.t+ch} />
          <text className="azu-pareto-label-80" x={cross80.x} y={pad.t-4} textAnchor="middle">
            {cross80.pctP.toFixed(0)}% predios → {cross80.pctR.toFixed(0)}% recaudo
          </text>
        </>
      )}
      <path d={areaPath} fill={PARETO_COLOR} className="azu-pareto-area" />
      <path d={linePath} stroke={PARETO_COLOR} className="azu-pareto-line" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#fff" stroke={PARETO_COLOR} className="azu-pareto-dot" />
      ))}
    </svg>
  );
}

function ImpactCard({ label, value, sub, color }) {
  return (
    <div className="azu-impact-card">
      <div className="azu-impact-label">{label}</div>
      <div className="azu-impact-val" style={{ color }}>{value}</div>
      <div className="azu-impact-sub">{sub}</div>
    </div>
  );
}

/* ── Popup sub-components ── */
function PopupRow({ label, value, highlight, rise, fall }) {
  const cls = highlight ? ' azu-popup-val--highlight'
            : rise      ? ' azu-popup-val--rise'
            : fall      ? ' azu-popup-val--fall'
            : '';
  return (
    <div className="azu-popup-row">
      <span className="azu-popup-label">{label}</span>
      <span className={`azu-popup-val${cls}`}>{value}</span>
    </div>
  );
}

function DestEcoChip({ code }) {
  const label = code ? (DEST_ECO[code] || code) : 'No especificado';
  return (
    <span className="azu-dest-eco-chip">
      {code && <strong>{code}</strong>}
      {code && ' · '}
      {label}
    </span>
  );
}

/* ── Map section ── */
function MapSection({ barrio, onSelectBarrio }) {
  const wrapRef    = useRef(null);
  const mapRef     = useRef(null);
  const popupRef   = useRef(null);
  const olMapRef   = useRef(null);
  const overlayRef = useRef(null);
  const [mode, setMode]             = useState('impuesto');
  const [geojson, setGeojson]       = useState(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [popupData, setPopupData]   = useState(null);

  /* Fetch GeoJSON — barrio choropleth when no filter, individual predios when filtered */
  useEffect(() => {
    setMapLoading(true);
    setPopupData(null);
    setGeojson(null);
    const req = barrio
      ? zonaUrbanaAvaluosService.getPropertyGeoJSON(barrio)
      : zonaUrbanaAvaluosService.getBarrioGeoJSON();
    req
      .then(data => { setGeojson(data); setMapLoading(false); })
      .catch(e => { console.error(e); setMapLoading(false); });
  }, [barrio]);

  const closePopup = useCallback(() => {
    setPopupData(null);
    overlayRef.current?.setPosition(undefined);
  }, []);

  /* Fullscreen */
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
      setIsFullscreen(!!document.fullscreenElement);
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

  /* Map init / rebuild whenever geojson or mode changes */
  useEffect(() => {
    if (!geojson || !mapRef.current) return;
    let cancelled = false;

    (async () => {
      const ol = await import('ol');
      const { default: Overlay }      = await import('ol/Overlay');
      const { default: TileLayer }    = await import('ol/layer/Tile');
      const { default: VectorLayer }  = await import('ol/layer/Vector');
      const { default: VectorSource } = await import('ol/source/Vector');
      const { default: OSM }          = await import('ol/source/OSM');
      const { default: GeoJSON }      = await import('ol/format/GeoJSON');
      const { Style, Fill, Stroke }   = await import('ol/style');
      const { fromLonLat }            = await import('ol/proj');
      if (cancelled) return;

      const NO_DATA = '#cbd5e1';

      const getColor = (feature) => {
        const p = feature.getProperties();
        let raw, steps;
        if (mode === 'impuesto') {
          raw   = p.impuesto_nuevo;
          steps = [20000,50000,100000,200000,400000,800000,1500000,3000000,5000000,8000000,15000000,30000000,60000000];
        } else if (mode === 'avaluo') {
          raw   = p.avaluo_nuevo;
          steps = [3e6,7e6,10e6,20e6,40e6,60e6,100e6,250e6,500e6,1e9,2e9,5e9,10e9];
        } else {
          raw   = p.incremento_pct;
          steps = [-10,0,10,30,60,100,200,400,700,1200,2000,4000,8000];
        }
        if (raw == null) return NO_DATA;
        const val = Number(raw);
        let idx = steps.findIndex(s => val <= s);
        if (idx === -1) idx = MAP_COLORS.length - 1;
        return MAP_COLORS[idx];
      };

      const source = new VectorSource({
        features: new GeoJSON().readFeatures(geojson, { featureProjection: 'EPSG:3857' }),
      });

      const layer = new VectorLayer({
        source,
        style: (feature) => new Style({
          fill:   new Fill({ color: getColor(feature) + 'c8' }),
          stroke: new Stroke({ color: '#166534', width: 0.5 }),
        }),
      });

      if (olMapRef.current) { olMapRef.current.setTarget(null); olMapRef.current = null; }

      const overlay = new Overlay({
        element: popupRef.current,
        autoPan: { animation: { duration: 200 }, margin: 60 },
        positioning: 'bottom-center',
        offset: [0, -12],
      });
      overlayRef.current = overlay;

      const map = new ol.Map({
        target:   mapRef.current,
        layers:   [new TileLayer({ source: new OSM() }), layer],
        view:     new ol.View({ center: fromLonLat([-76.48, 3.00]), zoom: 12 }),
        overlays: [overlay],
      });

      const ext = source.getExtent();
      if (ext[0] !== Infinity) map.getView().fit(ext, { padding: [40,40,40,40], maxZoom: 16 });

      map.on('click', (evt) => {
        const feature = map.forEachFeatureAtPixel(evt.pixel, f => f);
        if (feature) {
          const props = feature.getProperties();
          if (!barrio && props.barrio) {
            /* Barrio choropleth mode: drill into the clicked barrio */
            onSelectBarrio(props.barrio);
          } else {
            setPopupData(props);
            overlay.setPosition(evt.coordinate);
          }
        } else {
          setPopupData(null);
          overlay.setPosition(undefined);
        }
      });

      map.on('pointermove', (evt) => {
        map.getTargetElement().style.cursor = map.hasFeatureAtPixel(evt.pixel) ? 'pointer' : '';
      });

      olMapRef.current = map;
    })();

    return () => {
      cancelled = true;
      if (olMapRef.current) { olMapRef.current.setTarget(null); olMapRef.current = null; }
    };
  }, [geojson, mode]);

  const handleMode = useCallback((m) => { setMode(m); closePopup(); }, [closePopup]);

  const LEGEND_MAP = {
    impuesto: [
      { color: MAP_COLORS[0],  label: '< $20K' },       { color: MAP_COLORS[1],  label: '$20K–50K' },
      { color: MAP_COLORS[2],  label: '$50K–100K' },     { color: MAP_COLORS[3],  label: '$100K–200K' },
      { color: MAP_COLORS[4],  label: '$200K–400K' },    { color: MAP_COLORS[5],  label: '$400K–800K' },
      { color: MAP_COLORS[6],  label: '$800K–1.5M' },    { color: MAP_COLORS[7],  label: '$1.5M–3M' },
      { color: MAP_COLORS[8],  label: '$3M–5M' },        { color: MAP_COLORS[9],  label: '$5M–8M' },
      { color: MAP_COLORS[10], label: '$8M–15M' },       { color: MAP_COLORS[11], label: '$15M–30M' },
      { color: MAP_COLORS[12], label: '$30M–60M' },      { color: MAP_COLORS[13], label: '> $60M' },
    ],
    avaluo: [
      { color: MAP_COLORS[0],  label: '< $3M' },         { color: MAP_COLORS[1],  label: '$3M–7M' },
      { color: MAP_COLORS[2],  label: '$7M–10M' },       { color: MAP_COLORS[3],  label: '$10M–20M' },
      { color: MAP_COLORS[4],  label: '$20M–40M' },      { color: MAP_COLORS[5],  label: '$40M–60M' },
      { color: MAP_COLORS[6],  label: '$60M–100M' },     { color: MAP_COLORS[7],  label: '$100M–250M' },
      { color: MAP_COLORS[8],  label: '$250M–500M' },    { color: MAP_COLORS[9],  label: '$500M–1B' },
      { color: MAP_COLORS[10], label: '$1B–2B' },        { color: MAP_COLORS[11], label: '$2B–5B' },
      { color: MAP_COLORS[12], label: '$5B–10B' },       { color: MAP_COLORS[13], label: '> $10B' },
    ],
    incremento: [
      { color: MAP_COLORS[0],  label: 'Negativo' },      { color: MAP_COLORS[1],  label: '0%' },
      { color: MAP_COLORS[2],  label: '0–10%' },         { color: MAP_COLORS[3],  label: '10–30%' },
      { color: MAP_COLORS[4],  label: '30–60%' },        { color: MAP_COLORS[5],  label: '60–100%' },
      { color: MAP_COLORS[6],  label: '100–200%' },      { color: MAP_COLORS[7],  label: '200–400%' },
      { color: MAP_COLORS[8],  label: '400–700%' },      { color: MAP_COLORS[9],  label: '700–1200%' },
      { color: MAP_COLORS[10], label: '1200–2000%' },    { color: MAP_COLORS[11], label: '2000–4000%' },
      { color: MAP_COLORS[12], label: '4000–8000%' },    { color: MAP_COLORS[13], label: '> 8000%' },
    ],
  };

  const TITLES = {
    impuesto:   'Impuesto predial anual',
    avaluo:     'Avalúo catastral nuevo',
    incremento: '% Incremento avalúo',
  };

  /* ── Popup content for individual predio ── */
  const PredioPopup = ({ d }) => {
    const impNuevo = d.impuesto_nuevo != null ? Number(d.impuesto_nuevo) : null;
    const impAnt   = d.impuesto_antiguo != null ? Number(d.impuesto_antiguo) : null;
    const diff     = impNuevo != null && impAnt != null ? impNuevo - impAnt : null;
    const pctImp   = impAnt > 0 && impNuevo != null
      ? ((impNuevo / impAnt) - 1) * 100 : null;

    return (
      <>
        <div className="azu-popup-title">{d.codigo || 'Sin código'}</div>

        <div className="azu-popup-group">
          <PopupRow label="Propietario" value={d.propietario || '—'} />
          <PopupRow label="Barrio" value={d.barrio || '—'} />
          <div className="azu-popup-row">
            <span className="azu-popup-label">Destinación</span>
            <DestEcoChip code={d.dest_eco} />
          </div>
          <PopupRow label="Área predio"     value={d.area_predio     != null ? fmtN(d.area_predio)     + ' m²' : '—'} />
          <PopupRow label="Área construida" value={d.area_construida != null ? fmtN(d.area_construida) + ' m²' : '—'} />
        </div>

        <div className="azu-popup-group">
          <div className="azu-popup-group-label">Avalúo catastral</div>
          <PopupRow label="Anterior"   value={fmtM(d.avaluo_antiguo)} />
          <PopupRow label="Nuevo"      value={fmtM(d.avaluo_nuevo)} highlight />
          <PopupRow label="Incremento" value={d.incremento_pct != null ? `+${fmtPct(d.incremento_pct)}` : '—'} />
        </div>

        <div className="azu-popup-group">
          <div className="azu-popup-group-label">Impuesto predial estimado</div>
          <PopupRow label="Anterior"      value={fmtM(impAnt)} />
          <PopupRow label="Proyectado"    value={fmtM(impNuevo)} highlight />
          <PopupRow label="Tarifa"        value={d.tarifa_nueva != null ? `${d.tarifa_nueva}‰` : '—'} />
          {diff != null && (
            <PopupRow
              label="Diferencia"
              value={`${diff >= 0 ? '+' : ''}${fmtM(diff)}`}
              rise={diff > 0}
              fall={diff < 0}
            />
          )}
          {pctImp != null && (
            <PopupRow
              label="% cambio impuesto"
              value={`${pctImp >= 0 ? '+' : ''}${fmtPct(pctImp)}`}
              rise={pctImp > 0}
              fall={pctImp < 0}
            />
          )}
        </div>
      </>
    );
  };

  return (
    <div ref={wrapRef} className={`azu-map-wrap${isFullscreen ? ' azu-map-wrap--fs' : ''}`}>
      <div ref={mapRef} className="azu-map-target" />

      {mapLoading && (
        <div className="azu-map-loading">
          <div className="azu-map-loading-spinner" />
          {barrio ? `Cargando predios de ${barrio}...` : 'Cargando mapa de barrios...'}
        </div>
      )}

      {/* Controls */}
      <div className="azu-map-controls">
        {['impuesto','avaluo','incremento'].map(m => (
          <button
            key={m}
            className={`azu-map-btn${mode === m ? ' azu-map-btn--active' : ''}`}
            onClick={() => handleMode(m)}
          >
            {m === 'impuesto' ? 'Impuesto' : m === 'avaluo' ? 'Avalúo' : '% Cambio'}
          </button>
        ))}
        <button className="azu-map-btn azu-map-btn--fs" onClick={toggleFullscreen}
          title={isFullscreen ? 'Salir (Esc)' : 'Pantalla completa'}>
          {isFullscreen ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v4a1 1 0 0 1-1 1H3"/><path d="M21 8h-4a1 1 0 0 1-1-1V3"/>
              <path d="M3 16h4a1 1 0 0 1 1 1v4"/><path d="M16 21v-4a1 1 0 0 1 1-1h4"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8V5a2 2 0 0 1 2-2h3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
              <path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M21 16v3a2 2 0 0 1-2 2h-3"/>
            </svg>
          )}
        </button>
      </div>

      {/* Legend */}
      <div className="azu-legend">
        <div className="azu-legend-title">{TITLES[mode]}</div>
        {LEGEND_MAP[mode].map((s, i) => (
          <div key={i} className="azu-legend-row">
            <div className="azu-legend-swatch" style={{ background: s.color }} />
            <span className="azu-legend-text">{s.label}</span>
          </div>
        ))}
        <div className="azu-legend-row" style={{ marginTop: 4 }}>
          <div className="azu-legend-swatch" style={{ background: '#cbd5e1' }} />
          <span className="azu-legend-text">Sin datos</span>
        </div>
      </div>

      {/* Popup */}
      <div ref={popupRef} className="azu-popup-anchor">
        {popupData && (
          <div className="azu-popup">
            <button className="azu-popup-close" onClick={closePopup}>×</button>
            <PredioPopup d={popupData} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Barrio impact table ── */

const COLUMNS = [
  { key: 'barrio',              label: 'Barrio',                 align: 'left',  sortable: true, type: 'text'   },
  { key: 'predios',             label: 'Predios',                align: 'right', sortable: true, type: 'number' },
  { key: 'avg_avaluo_antiguo',  label: 'Avalúo Prom. Antiguo',   align: 'right', sortable: true, type: 'money'  },
  { key: 'avg_avaluo_nuevo',    label: 'Avalúo Prom. Nuevo',     align: 'right', sortable: true, type: 'money'  },
  { key: 'avg_pct_incremento',  label: 'Incremento',             align: 'right', sortable: true, type: 'pct'    },
  { key: 'avg_impuesto_antiguo',label: 'Predial Prom. Anterior', align: 'right', sortable: true, type: 'money'  },
  { key: 'avg_impuesto_nuevo',  label: 'Predial Prom. Nuevo',    align: 'right', sortable: true, type: 'money'  },
  { key: 'recaudo_antiguo',     label: 'Recaudo Anterior',       align: 'right', sortable: true, type: 'money'  },
  { key: 'recaudo_nuevo',       label: 'Recaudo Proyectado',     align: 'right', sortable: true, type: 'money'  },
  { key: 'delta_recaudo',       label: 'Diferencia Recaudo',     align: 'right', sortable: true, type: 'money', computed: true },
  { key: 'pct_delta_recaudo',   label: '% Cambio Recaudo',       align: 'right', sortable: true, type: 'pct',   computed: true },
];

function BarrioTable({ data, selectedBarrio, onSelectBarrio, onClearBarrio }) {
  const [sortCol, setSortCol]     = useState('recaudo_nuevo');
  const [sortDir, setSortDir]     = useState('desc');
  const [filterText, setFilter]   = useState('');
  const [filterCol, setFilterCol] = useState(null);
  const [filterRange, setRange]   = useState({ min: '', max: '' });

  const enriched = useMemo(() => data.map(r => ({
    ...r,
    delta_recaudo:    Number(r.recaudo_nuevo) - Number(r.recaudo_antiguo),
    pct_delta_recaudo: Number(r.recaudo_antiguo) > 0
      ? ((Number(r.recaudo_nuevo) / Number(r.recaudo_antiguo)) - 1) * 100
      : null,
  })), [data]);

  const filtered = useMemo(() => {
    let rows = enriched;
    if (filterText) {
      const q = filterText.toLowerCase();
      rows = rows.filter(r => r.barrio?.toLowerCase().includes(q));
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
      if (sortCol === 'barrio') {
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
    if (sortCol !== col) return <span className="azu-sort-icon azu-sort-icon--idle">&#x21C5;</span>;
    return <span className="azu-sort-icon">{sortDir === 'asc' ? '▲' : '▼'}</span>;
  };

  const pctChip = pct => {
    const n = Number(pct);
    if (isNaN(n)) return '—';
    const cls = n < 20 ? 'azu-pct-chip--low' : n < 80 ? 'azu-pct-chip--med' : 'azu-pct-chip--high';
    return <span className={`azu-pct-chip ${cls}`}>{n >= 0 ? '+' : ''}{fmtPct(pct)}</span>;
  };

  const deltaChip = val => {
    const n = Number(val);
    if (isNaN(n)) return '—';
    const cls = n >= 0 ? 'azu-delta--up' : 'azu-delta--down';
    return <span className={`azu-delta-chip ${cls}`}>{n >= 0 ? '+' : ''}{fmtM(n)}</span>;
  };

  const renderCell = (r, col) => {
    const v = r[col.key];
    switch (col.key) {
      case 'barrio':              return <td key={col.key} className="name">{v}</td>;
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
  const clearSearch = () => { setFilter(''); setFilterCol(null); setRange({ min: '', max: '' }); };
  const hasSearch   = filterText || (filterCol && (filterRange.min !== '' || filterRange.max !== ''));

  return (
    <div className="azu-card">
      <div className="azu-card-header">
        <span className="azu-card-title">Impacto Financiero por Barrio</span>
        <span className="azu-card-badge azu-card-badge--blue">
          {sorted.length}{sorted.length !== data.length ? ` de ${data.length}` : ''} barrios
        </span>
      </div>

      <div className="azu-filter-bar">
        {/* Active barrio indicator + clear */}
        {selectedBarrio && (
          <div className="azu-filter-group azu-filter-group--barrio">
            <svg className="azu-filter-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span className="azu-filter-active-label">Barrio activo:</span>
            <span className="azu-filter-chip azu-filter-chip--sm">{selectedBarrio}</span>
            <button
              type="button"
              className="azu-filter-clear"
              onClick={() => { onClearBarrio(); }}
            >
              Quitar filtro
            </button>
          </div>
        )}

        {/* Text search */}
        <div className="azu-filter-group">
          <svg className="azu-filter-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            className="azu-filter-input"
            type="text"
            placeholder="Buscar barrio..."
            value={filterText}
            onChange={e => setFilter(e.target.value)}
          />
        </div>

        {/* Column range filter */}
        <div className="azu-filter-group">
          <svg className="azu-filter-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>
          </svg>
          <select
            className="azu-filter-select"
            value={filterCol || ''}
            onChange={e => { setFilterCol(e.target.value || null); setRange({ min: '', max: '' }); }}
          >
            <option value="">Filtrar columna...</option>
            {numericCols.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          {filterCol && (
            <>
              <input className="azu-filter-range" type="number" placeholder="Min"
                value={filterRange.min} onChange={e => setRange(p => ({ ...p, min: e.target.value }))} />
              <span className="azu-filter-dash">–</span>
              <input className="azu-filter-range" type="number" placeholder="Max"
                value={filterRange.max} onChange={e => setRange(p => ({ ...p, max: e.target.value }))} />
            </>
          )}
        </div>

        {hasSearch && (
          <button type="button" className="azu-filter-clear" onClick={clearSearch}>
            Limpiar búsqueda
          </button>
        )}
      </div>

      <div className="azu-table-scroll">
        <table className="azu-table azu-table--sortable">
          <thead>
            <tr>
              <th>#</th>
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  className={`${col.align === 'right' ? 'r' : ''} ${col.sortable ? 'azu-th--sortable' : ''}`}
                  onClick={() => col.sortable && toggleSort(col.key)}
                >
                  {col.label}
                  {col.sortable && <SortIcon col={col.key} />}
                </th>
              ))}
              <th className="r">Acción</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + 2} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                  Sin resultados
                </td>
              </tr>
            ) : sorted.map((r, i) => (
              <tr
                key={r.barrio}
                className={selectedBarrio === r.barrio ? 'azu-row--selected' : ''}
                onClick={() => onSelectBarrio(r.barrio)}
                style={{ cursor: 'pointer' }}
              >
                <td className="azu-table-num">{i + 1}</td>
                {COLUMNS.map(col => renderCell(r, col))}
                <td className="r">
                  {selectedBarrio === r.barrio ? (
                    <button
                      type="button"
                      className="azu-row-action-btn azu-row-action-btn--active"
                      onClick={e => { e.stopPropagation(); onClearBarrio(); }}
                    >
                      Quitar filtro
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="azu-row-action-btn"
                      onClick={e => { e.stopPropagation(); onSelectBarrio(r.barrio); }}
                    >
                      Ver barrio
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
