import { useState, useEffect, useRef, useContext } from 'react';
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
            <span style={{ display:'flex',alignItems:'center',gap:6,padding:'6px 14px',background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.15)',borderRadius:99,color:'rgba(255,255,255,.75)',fontSize:12,fontWeight:600 }}>
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
              {/* New bracket distribution */}
              <div className="azr-card">
                <div className="azr-card-header">
                  <span className="azr-card-title">Distribución — Tarifas Nuevas</span>
                  <span className="azr-card-badge azr-card-badge--green">Avalúo actualizado</span>
                </div>
                <div className="azr-card-body">
                  {loading ? <BarsSkeleton /> : brackets && (
                    <BracketBars
                      data={brackets.nuevo}
                      colors={BRACKET_COLORS_NEW}
                      totalPredios={Number(stats?.total_predios || 1)}
                    />
                  )}
                </div>
              </div>

              {/* Old bracket distribution */}
              <div className="azr-card">
                <div className="azr-card-header">
                  <span className="azr-card-title">Distribución — Tarifas Anteriores</span>
                  <span className="azr-card-badge azr-card-badge--amber">Avalúo antiguo</span>
                </div>
                <div className="azr-card-body">
                  {loading ? <BarsSkeleton /> : brackets && (
                    <BracketBars
                      data={brackets.antiguo}
                      colors={BRACKET_COLORS_OLD}
                      totalPredios={Number(stats?.total_predios || 1)}
                    />
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
                <span className="azr-card-title">Mapa de Incremento por Vereda</span>
                <span className="azr-card-badge azr-card-badge--green">Avalúo nuevo vs antiguo</span>
              </div>
              <MapSection />
            </div>
          </section>

          {/* ── VEREDA IMPACT TABLE ── */}
          <section className="azr-section">
            <div className="azr-card">
              <div className="azr-card-header">
                <span className="azr-card-title">Impacto Financiero por Vereda</span>
                <span className="azr-card-badge azr-card-badge--green">{veredas?.length || '—'} veredas</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                {loading
                  ? <div className="azr-skel" style={{ height: 300, margin: 16 }} />
                  : veredas && <VeredaTable data={veredas} />
                }
              </div>
            </div>
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
        <div className="azr-kpi-sub">{fmtN(s.total_veredas)} veredas · deduplicados</div>
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
        <div className="azr-bracket-label">{d.rango}<br/><span style={{ fontSize: 10, color: 'var(--text-light)' }}>{d.tarifa}‰</span></div>
        <div className="azr-bracket-bar-wrap">
          <div
            className="azr-bracket-bar"
            style={{ width: `${barW}%`, background: colors[i] || '#64748b' }}
          >
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

  // Find 80% crossing
  let cross80 = null;
  for (let i = 0; i < pts.length; i++) {
    if (pts[i].pctR >= 80) { cross80 = pts[i]; break; }
  }

  const yTicks = [0, 20, 40, 60, 80, 100];
  const xTicks = [0, 20, 40, 60, 80, 100];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="azr-pareto-svg">
      {/* Grid */}
      {yTicks.map(t => (
        <g key={`y${t}`}>
          <line className="azr-pareto-grid" x1={pad.l} x2={W - pad.r} y1={pad.t + ch - t / 100 * ch} y2={pad.t + ch - t / 100 * ch} />
          <text x={pad.l - 6} y={pad.t + ch - t / 100 * ch + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="600">{t}%</text>
        </g>
      ))}
      {xTicks.map(t => (
        <text key={`x${t}`} x={pad.l + t / 100 * cw} y={H - pad.b + 16} textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="600">{t}%</text>
      ))}

      {/* Axis labels */}
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="700">% Acumulado de Predios (mayor avalúo → menor)</text>
      <text x={12} y={H / 2} textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="700" transform={`rotate(-90 12 ${H / 2})`}>% Acum. Recaudo</text>

      {/* 80% rule line */}
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

      {/* Area + line */}
      <path d={areaPath} fill={PARETO_COLOR} className="azr-pareto-area" />
      <path d={linePath} stroke={PARETO_COLOR} className="azr-pareto-line" />

      {/* Dots */}
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

/* ── Map section ── */
function MapSection() {
  const wrapRef = useRef(null);
  const mapRef = useRef(null);
  const olMapRef = useRef(null);
  const [mode, setMode] = useState('impuesto'); // 'impuesto' | 'avaluo' | 'incremento'
  const [geojson, setGeojson] = useState(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [popup, setPopup] = useState(null); // { x, y, props }

  useEffect(() => {
    setMapLoading(true);
    zonaRuralAvaluosService.getPropertyGeoJSON(null, mode)
      .then(data => { setGeojson(data); setMapLoading(false); })
      .catch(e => { console.error(e); setMapLoading(false); });
  }, []);

  // ── Fullscreen handling ──
  const toggleFullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      (el.requestFullscreen?.() || el.webkitRequestFullscreen?.())?.catch(err => console.error(err));
    } else {
      document.exitFullscreen?.() || document.webkitExitFullscreen?.();
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      // OL necesita recalcular su tamaño cuando el contenedor cambia
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

  useEffect(() => {
    if (!geojson || !mapRef.current) return;
    let cancelled = false;

    (async () => {
      const ol = await import('ol');
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

      // 14-stop diverging palette: green → yellow → orange → red → dark red
      const ZR_COLORS = [
        '#d1fae5','#a7f3d0','#6ee7b7','#34d399',
        '#fef9c3','#fde047','#facc15',
        '#fdba74','#fb923c','#f97316',
        '#f87171','#ef4444','#dc2626','#7f1d1d'
      ];

      const getColor = (feature) => {
        const p = feature.getProperties();
        let val, steps;
        if (mode === 'impuesto') {
          val = Number(p.impuesto_nuevo || 0);
          // 13 breaks → 14 classes: fine-grained at low end, logarithmic at high end
          steps = [20000,50000,100000,200000,400000,800000,1500000,3000000,5000000,8000000,15000000,30000000,60000000];
        } else if (mode === 'avaluo') {
          val = Number(p.avaluo_nuevo || 0);
          // Aligned with tax bracket boundaries + intermediate splits
          steps = [3e6,7e6,10e6,20e6,40e6,60e6,100e6,250e6,500e6,1e9,2e9,5e9,10e9];
        } else {
          val = Number(p.incremento_pct || 0);
          steps = [-10,0,10,30,60,100,200,400,700,1200,2000,4000,8000];
        }
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

      const map = new ol.Map({
        target: mapRef.current,
        layers: [new TileLayer({ source: new OSM() }), layer],
        view: new ol.View({ center: fromLonLat([-76.48, 3.00]), zoom: 11 }),
      });

      const ext = source.getExtent();
      if (ext[0] !== Infinity) map.getView().fit(ext, { padding: [30, 30, 30, 30], maxZoom: 14 });

      // Click handler for property popup
      map.on('click', (evt) => {
        const feature = map.forEachFeatureAtPixel(evt.pixel, f => f);
        if (feature) {
          const props = feature.getProperties();
          setPopup({ x: evt.pixel[0], y: evt.pixel[1], props });
        } else {
          setPopup(null);
        }
      });

      // Pointer cursor on hover
      map.on('pointermove', (evt) => {
        const hit = map.hasFeatureAtPixel(evt.pixel);
        map.getTargetElement().style.cursor = hit ? 'pointer' : '';
      });

      olMapRef.current = map;
    })();

    return () => { cancelled = true; if (olMapRef.current) { olMapRef.current.setTarget(null); olMapRef.current = null; } };
  }, [geojson, mode]);

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

  const TITLES = { impuesto: 'Impuesto predial anual', avaluo: 'Avaluo catastral nuevo', incremento: '% Incremento avaluo' };

  return (
    <div ref={wrapRef} className={`azr-map-wrap${isFullscreen ? ' azr-map-wrap--fs' : ''}`}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      {mapLoading && (
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', background:'rgba(255,255,255,.9)', padding:'12px 24px', borderRadius:8, fontWeight:600, fontSize:13, color:'#166534', zIndex:20 }}>
          Cargando predios...
        </div>
      )}
      <div className="azr-map-controls">
        <button className={`azr-map-btn ${mode === 'impuesto' ? 'azr-map-btn--active' : ''}`} onClick={() => { setMode('impuesto'); setPopup(null); }}>Impuesto</button>
        <button className={`azr-map-btn ${mode === 'avaluo' ? 'azr-map-btn--active' : ''}`} onClick={() => { setMode('avaluo'); setPopup(null); }}>Avaluo</button>
        <button className={`azr-map-btn ${mode === 'incremento' ? 'azr-map-btn--active' : ''}`} onClick={() => { setMode('incremento'); setPopup(null); }}>% Cambio</button>
        <button
          className="azr-map-btn azr-map-btn--fs"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Salir de pantalla completa (Esc)' : 'Pantalla completa'}
        >
          {isFullscreen ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v4a1 1 0 0 1-1 1H3"/><path d="M21 8h-4a1 1 0 0 1-1-1V3"/><path d="M3 16h4a1 1 0 0 1 1 1v4"/><path d="M16 21v-4a1 1 0 0 1 1-1h4"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8V5a2 2 0 0 1 2-2h3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M21 16v3a2 2 0 0 1-2 2h-3"/>
            </svg>
          )}
          <span style={{ marginLeft: 4 }}>{isFullscreen ? 'Salir' : 'Pantalla completa'}</span>
        </button>
      </div>
      <div className="azr-legend">
        <div className="azr-legend-title">{TITLES[mode]}</div>
        {LEGEND_MAP[mode].map((s, i) => (
          <div key={i} className="azr-legend-row">
            <div className="azr-legend-swatch" style={{ background: s.color }} />
            <span className="azr-legend-text">{s.label}</span>
          </div>
        ))}
      </div>
      {/* Property popup */}
      {popup && (
        <div className="azr-popup" style={{ left: popup.x, top: popup.y }}>
          <button className="azr-popup-close" onClick={() => setPopup(null)}>×</button>
          <div className="azr-popup-title">{popup.props.codigo || '—'}</div>
          <div className="azr-popup-row">
            <span className="azr-popup-label">Propietario</span>
            <span className="azr-popup-val">{popup.props.propietario || '—'}</span>
          </div>
          <div className="azr-popup-row">
            <span className="azr-popup-label">Vereda</span>
            <span className="azr-popup-val">{popup.props.vereda || '—'}</span>
          </div>
          <div className="azr-popup-row">
            <span className="azr-popup-label">Área del predio</span>
            <span className="azr-popup-val">{popup.props.area_predio != null ? fmtN(popup.props.area_predio) + ' m²' : '—'}</span>
          </div>
          <div className="azr-popup-row">
            <span className="azr-popup-label">Área construida</span>
            <span className="azr-popup-val">{popup.props.area_construida != null ? fmtN(popup.props.area_construida) + ' m²' : '—'}</span>
          </div>
          <hr className="azr-popup-hr" />
          <div className="azr-popup-row">
            <span className="azr-popup-label">Avalúo anterior</span>
            <span className="azr-popup-val">{fmtM(popup.props.avaluo_antiguo)}</span>
          </div>
          <div className="azr-popup-row">
            <span className="azr-popup-label">Avalúo nuevo</span>
            <span className="azr-popup-val azr-popup-val--highlight">{fmtM(popup.props.avaluo_nuevo)}</span>
          </div>
          <div className="azr-popup-row">
            <span className="azr-popup-label">Incremento</span>
            <span className="azr-popup-val">{fmtPct(popup.props.incremento_pct)}</span>
          </div>
          <hr className="azr-popup-hr" />
          <div className="azr-popup-row">
            <span className="azr-popup-label">Impuesto (tarifa anterior)</span>
            <span className="azr-popup-val">{fmtM(popup.props.impuesto_antiguo)}</span>
          </div>
          <div className="azr-popup-row">
            <span className="azr-popup-label">Impuesto (tarifa nueva)</span>
            <span className="azr-popup-val azr-popup-val--highlight">{fmtM(popup.props.impuesto_nuevo)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Vereda impact table ── */
function VeredaTable({ data }) {
  const pctChip = pct => {
    const n = Number(pct);
    const cls = n < 100 ? 'azr-pct-chip--low' : n < 300 ? 'azr-pct-chip--med' : 'azr-pct-chip--high';
    return <span className={`azr-pct-chip ${cls}`}>+{fmtPct(pct)}</span>;
  };

  return (
    <table className="azr-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Vereda</th>
          <th className="r">Predios</th>
          <th className="r">Avalúo Prom. Antiguo</th>
          <th className="r">Avalúo Prom. Nuevo</th>
          <th className="r">Incremento</th>
          <th className="r">Recaudo Anterior</th>
          <th className="r">Recaudo Proyectado</th>
        </tr>
      </thead>
      <tbody>
        {data.map((r, i) => (
          <tr key={r.vereda}>
            <td style={{ color: 'var(--text-light)', fontSize: 11 }}>{i + 1}</td>
            <td className="name">{r.vereda}</td>
            <td className="n">{fmtN(r.predios)}</td>
            <td className="r" style={{ fontWeight: 600 }}>{fmtM(r.avg_avaluo_antiguo)}</td>
            <td className="n">{fmtM(r.avg_avaluo_nuevo)}</td>
            <td className="r">{pctChip(r.avg_pct_incremento)}</td>
            <td className="r" style={{ fontWeight: 600 }}>{fmtM(r.recaudo_antiguo)}</td>
            <td className="n g">{fmtM(r.recaudo_nuevo)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
