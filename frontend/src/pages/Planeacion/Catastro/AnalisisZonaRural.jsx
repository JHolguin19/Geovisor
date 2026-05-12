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
  const mapRef = useRef(null);
  const olMapRef = useRef(null);
  const [mode, setMode] = useState('pct'); // 'pct' or 'abs'
  const [geojson, setGeojson] = useState(null);

  useEffect(() => {
    zonaRuralAvaluosService.getGeoJSON('incremento_pct').then(setGeojson).catch(console.error);
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
      const { Style, Fill, Stroke, Text } = await import('ol/style');
      const { fromLonLat } = await import('ol/proj');

      if (cancelled) return;

      const source = new VectorSource({
        features: new GeoJSON().readFeatures(geojson, { featureProjection: 'EPSG:3857' }),
      });

      const getColor = (feature) => {
        const props = feature.getProperties();
        const val = mode === 'pct'
          ? Number(props.avg_incremento_pct || 0)
          : Number(props.suma_avaluo_nuevo || 0) - Number(props.suma_avaluo_antiguo || 0);

        const steps = mode === 'pct'
          ? [50, 100, 200, 400, 800]
          : [100e6, 500e6, 2e9, 10e9, 50e9];
        const colors = ['#dcfce7','#86efac','#fde047','#fb923c','#ef4444','#7f1d1d'];

        let idx = steps.findIndex(s => val <= s);
        if (idx === -1) idx = colors.length - 1;
        return colors[idx];
      };

      const layer = new VectorLayer({
        source,
        style: (feature) => {
          const props = feature.getProperties();
          return new Style({
            fill: new Fill({ color: getColor(feature) + 'cc' }),
            stroke: new Stroke({ color: '#fff', width: 1 }),
            text: new Text({
              text: props.vereda || '',
              font: 'bold 9px Nunito',
              fill: new Fill({ color: '#1a2332' }),
              stroke: new Stroke({ color: '#fff', width: 2.5 }),
              overflow: true,
            }),
          });
        },
      });

      if (olMapRef.current) { olMapRef.current.setTarget(null); olMapRef.current = null; }

      const map = new ol.Map({
        target: mapRef.current,
        layers: [new TileLayer({ source: new OSM() }), layer],
        view: new ol.View({ center: fromLonLat([-76.48, 3.00]), zoom: 11 }),
      });

      const ext = source.getExtent();
      if (ext[0] !== Infinity) map.getView().fit(ext, { padding: [30, 30, 30, 30], maxZoom: 14 });

      olMapRef.current = map;
    })();

    return () => { cancelled = true; if (olMapRef.current) { olMapRef.current.setTarget(null); olMapRef.current = null; } };
  }, [geojson, mode]);

  const legendSteps = mode === 'pct'
    ? [{ color: '#dcfce7', label: '< 50%' },{ color: '#86efac', label: '50–100%' },{ color: '#fde047', label: '100–200%' },{ color: '#fb923c', label: '200–400%' },{ color: '#ef4444', label: '400–800%' },{ color: '#7f1d1d', label: '> 800%' }]
    : [{ color: '#dcfce7', label: '< $100M' },{ color: '#86efac', label: '$100–500M' },{ color: '#fde047', label: '$500M–2B' },{ color: '#fb923c', label: '$2–10B' },{ color: '#ef4444', label: '$10–50B' },{ color: '#7f1d1d', label: '> $50B' }];

  return (
    <div className="azr-map-wrap">
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      <div className="azr-map-controls">
        <button className={`azr-map-btn ${mode === 'pct' ? 'azr-map-btn--active' : ''}`} onClick={() => setMode('pct')}>% Incremento</button>
        <button className={`azr-map-btn ${mode === 'abs' ? 'azr-map-btn--active' : ''}`} onClick={() => setMode('abs')}>$ Diferencia</button>
      </div>
      <div className="azr-legend">
        <div className="azr-legend-title">{mode === 'pct' ? 'Incremento %' : 'Diferencia en $'}</div>
        {legendSteps.map((s, i) => (
          <div key={i} className="azr-legend-row">
            <div className="azr-legend-swatch" style={{ background: s.color }} />
            <span className="azr-legend-text">{s.label}</span>
          </div>
        ))}
      </div>
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
