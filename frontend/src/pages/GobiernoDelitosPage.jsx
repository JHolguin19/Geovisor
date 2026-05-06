import { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { delitosService } from '../services/api';
import './GobiernoDelitosPage.css';

const YEAR_OPTIONS = [
  { value: '',     label: 'Todos' },
  { value: '2024', label: '2024' },
  { value: '2025', label: '2025' },
];

const TIPO_COLORS = {
  HOMICIDIO:                '#DC2626',
  SECUESTRO:                '#991B1B',
  TERRORISMO:               '#7F1D1D',
  EXTORSION:                '#EA580C',
  'VIOLENCIA INTRAFAMILIAR':'#DB2777',
  'DELITOS SEXUALES':       '#BE185D',
  'LESIONES PERSONALES':    '#E11D48',
  'HURTO A PERSONAS':       '#2563EB',
  'HURTO A COMERCIO':       '#1D4ED8',
  'HURTO A RESIDENCIAS':    '#1E40AF',
  'HURTO AUTOMOTORES':      '#7C3AED',
  'HURTO MOTOCICLETAS':     '#6D28D9',
  'HURTO CELULARES':        '#4F46E5',
  'PIRATERIA TERRESTRE':    '#0891B2',
  ABIGEATO:                 '#059669',
};

const DAY_ORDER = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const DAY_SHORT = { 'Lunes':'Lun', 'Martes':'Mar', 'Miércoles':'Mié', 'Jueves':'Jue', 'Viernes':'Vie', 'Sábado':'Sáb', 'Domingo':'Dom' };
const MES_ORDER = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const MES_LABELS = { ene:'Ene',feb:'Feb',mar:'Mar',abr:'Abr',may:'May',jun:'Jun',jul:'Jul',ago:'Ago',sep:'Sep',oct:'Oct',nov:'Nov',dic:'Dic' };

/* --- SVG Charts --------------------------------------------------------- */

function HBarChart({ data, labelKey, valueKey, colorFn, maxItems = 15 }) {
  const items = data.slice(0, maxItems);
  const max = Math.max(...items.map(d => +d[valueKey]), 1);
  const barH = 26, gap = 4;
  const labelW = 170;
  const barMaxW = 220;
  const valW = 55;
  const svgW = labelW + barMaxW + valW;
  const h = items.length * (barH + gap);

  return (
    <div className="del-chart-scroll">
      <svg viewBox={`0 0 ${svgW} ${h}`} className="del-chart-svg" width={svgW} height={h}
        preserveAspectRatio="xMinYMin meet" style={{ minWidth: `${Math.min(svgW, 420)}px` }}>
        {items.map((d, i) => {
          const w = (+d[valueKey] / max) * barMaxW;
          const y = i * (barH + gap);
          const color = colorFn ? colorFn(d[labelKey]) : 'var(--del-accent)';
          const rawLabel = d[labelKey] || 'Sin dato';
          const label = rawLabel.length > 22 ? rawLabel.slice(0, 20) + '...' : rawLabel;
          return (
            <g key={i}>
              <text x={labelW - 8} y={y + barH / 2 + 4} textAnchor="end" className="del-chart-label">{label}</text>
              <rect x={labelW} y={y + 2} width={Math.max(w, 2)} height={barH - 4} rx="3" fill={color} opacity=".85" />
              <text x={labelW + w + 6} y={y + barH / 2 + 4} className="del-chart-val">{(+d[valueKey]).toLocaleString()}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function VBarChart({ data, labelKey, valueKey, color = 'var(--del-accent)' }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => +d[valueKey]), 1);
  const n = data.length;
  const barW = n > 10 ? 24 : 36;
  const gap = n > 10 ? 3 : 5;

  const maxLabelLen = Math.max(...data.map(d => String(d[labelKey] ?? '').length), 0);
  const rotateLabels = maxLabelLen > 4;
  const padL = rotateLabels ? 22 : 8;
  const padR = 10;
  const w = padL + n * (barW + gap) + padR;
  const chartH = 130;
  const labelAreaH = rotateLabels ? 54 : 24;

  return (
    <div className="del-chart-scroll">
      <svg viewBox={`0 0 ${w} ${chartH + labelAreaH}`} className="del-chart-svg" width={w} height={chartH + labelAreaH}
        preserveAspectRatio="xMinYMin meet" style={{ minWidth: `${Math.min(w, 280)}px` }}>
        {data.map((d, i) => {
          const h = (+d[valueKey] / max) * chartH;
          const x = padL + i * (barW + gap);
          const cx = x + barW / 2;
          const lbl = d[labelKey] != null ? String(d[labelKey]) : 'N/D';
          return (
            <g key={i}>
              <rect x={x} y={chartH - h} width={barW} height={Math.max(h, 1)} rx="3" fill={color} opacity=".82" />
              {+d[valueKey] > 0 && (
                <text x={cx} y={chartH - h - 4} textAnchor="middle" className="del-chart-val-sm">{+d[valueKey]}</text>
              )}
              {rotateLabels ? (
                <text
                  x={cx}
                  y={chartH + 10}
                  textAnchor="middle"
                  transform={`rotate(-45, ${cx}, ${chartH + 10})`}
                  style={{ fontSize: '7px' }}
                  className="del-chart-xlabel"
                >{lbl}</text>
              ) : (
                <text x={cx} y={chartH + 16} textAnchor="middle" className="del-chart-xlabel">{lbl}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function DonutChart({ data, labelKey, valueKey }) {
  const total = data.reduce((s, d) => s + (+d[valueKey] || 0), 0) || 1;
  const colors = ['#DC2626', '#2563EB', '#F59E0B', '#10B981', '#8B5CF6'];
  let cumAngle = 0;

  const arcs = data.map((d, i) => {
    const frac = +d[valueKey] / total;
    const startAngle = cumAngle;
    cumAngle += frac * 360;
    const endAngle = cumAngle;
    const large = frac > 0.5 ? 1 : 0;
    const toRad = a => (a - 90) * Math.PI / 180;
    const r = 60, cx = 80, cy = 80;
    const x1 = cx + r * Math.cos(toRad(startAngle));
    const y1 = cy + r * Math.sin(toRad(startAngle));
    const x2 = cx + r * Math.cos(toRad(endAngle - 0.5));
    const y2 = cy + r * Math.sin(toRad(endAngle - 0.5));

    return (
      <path key={i}
        d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`}
        fill={colors[i % colors.length]}
        opacity=".85"
      />
    );
  });

  return (
    <div className="del-donut-wrap">
      <svg viewBox="0 0 160 160" className="del-donut-svg">
        {arcs}
        <circle cx="80" cy="80" r="35" fill="var(--del-card-bg)" />
        <text x="80" y="76" textAnchor="middle" className="del-donut-total">{total.toLocaleString()}</text>
        <text x="80" y="92" textAnchor="middle" className="del-donut-label">Total</text>
      </svg>
      <div className="del-donut-legend">
        {data.map((d, i) => (
          <div key={i} className="del-legend-item">
            <span className="del-legend-dot" style={{ background: colors[i % colors.length] }} />
            <span className="del-legend-text">{d[labelKey] || 'Sin dato'}</span>
            <span className="del-legend-num">{(+d[valueKey]).toLocaleString()} ({(+d[valueKey] / total * 100).toFixed(1)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthlyChart({ data }) {
  const byYear = {};
  data.forEach(d => {
    if (!byYear[d.anio]) byYear[d.anio] = {};
    byYear[d.anio][d.mes] = +d.total;
  });
  const years = Object.keys(byYear).sort();
  const barW = 18, groupGap = 10, monthW = years.length * barW + groupGap;
  const w = MES_ORDER.length * monthW + 40;
  const chartH = 120;
  const max = Math.max(...data.map(d => +d.total), 1);
  const yearColors = { '2024': '#2563EB', '2025': '#DC2626' };

  return (
    <div>
      <div className="del-chart-scroll">
        <svg viewBox={`0 0 ${w} ${chartH + 32}`} className="del-chart-svg" width={w} height={chartH + 32}
          preserveAspectRatio="xMinYMin meet" style={{ minWidth: `${Math.min(w, 500)}px` }}>
          {MES_ORDER.map((mes, mi) => {
            const gx = mi * monthW + 20;
            return (
              <g key={mes}>
                {years.map((yr, yi) => {
                  const val = byYear[yr]?.[mes] || 0;
                  const h = (val / max) * chartH;
                  const x = gx + yi * barW;
                  return (
                    <g key={yr}>
                      <rect x={x} y={chartH - h} width={barW - 3} height={Math.max(h, 0)} rx="2"
                        fill={yearColors[yr] || '#6B7280'} opacity=".8" />
                      {val > 0 && (
                        <text x={x + (barW - 3) / 2} y={chartH - h - 4} textAnchor="middle" className="del-chart-val-xs">{val}</text>
                      )}
                    </g>
                  );
                })}
                <text x={gx + (years.length * barW) / 2} y={chartH + 14} textAnchor="middle" className="del-chart-xlabel">{MES_LABELS[mes]}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="del-month-legend">
        {years.map(yr => (
          <span key={yr} className="del-legend-item">
            <span className="del-legend-dot" style={{ background: yearColors[yr] || '#6B7280' }} />
            {yr}
          </span>
        ))}
      </div>
    </div>
  );
}

/* --- KPI Card ----------------------------------------------------------- */

function KpiCard({ label, value, icon, accent }) {
  return (
    <div className="del-kpi" style={{ '--kpi-accent': accent || 'var(--del-accent)' }}>
      <div className="del-kpi-icon">{icon}</div>
      <div className="del-kpi-val">{value != null ? value.toLocaleString() : '---'}</div>
      <div className="del-kpi-label">{label}</div>
    </div>
  );
}

/* --- Ranked List -------------------------------------------------------- */

function RankedList({ title, data, labelKey, valueKey }) {
  const max = Math.max(...data.map(d => +d[valueKey]), 1);
  return (
    <div className="del-ranked">
      <h4 className="del-ranked-title">{title}</h4>
      {data.map((d, i) => (
        <div key={i} className="del-ranked-row">
          <span className="del-ranked-pos">{i + 1}</span>
          <span className="del-ranked-name" title={d[labelKey] || ''}>{d[labelKey] || '---'}</span>
          <div className="del-ranked-bar-bg">
            <div className="del-ranked-bar" style={{ width: `${(+d[valueKey] / max) * 100}%` }} />
          </div>
          <span className="del-ranked-num">{(+d[valueKey]).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

/* --- Loading Skeleton --------------------------------------------------- */

function Skeleton() {
  return (
    <div className="del-skeleton-wrap">
      <div className="del-skel-row">
        {[...Array(5)].map((_, i) => <div key={i} className="del-skel-card del-shimmer" />)}
      </div>
      <div className="del-skel-row">
        <div className="del-skel-block del-shimmer" style={{ flex: 2 }} />
        <div className="del-skel-block del-shimmer" style={{ flex: 1 }} />
      </div>
      <div className="del-skel-row">
        <div className="del-skel-block del-shimmer" />
        <div className="del-skel-block del-shimmer" />
      </div>
    </div>
  );
}

/* =========================================================================
   MAIN PAGE
   ========================================================================= */

export default function GobiernoDelitosPage() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [anio, setAnio] = useState('');
  const [tipoDelito, setTipoDelito] = useState('');
  const [tipos, setTipos] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    delitosService.getTipos().then(setTipos).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (anio) params.anio = anio;
    if (tipoDelito) params.tipo_delito = tipoDelito;

    delitosService.getStats(params)
      .then(setStats)
      .catch(err => console.error('Error cargando stats:', err))
      .finally(() => setLoading(false));
  }, [anio, tipoDelito]);

  const kpis = useMemo(() => {
    if (!stats) return {};
    const byTipo = {};
    stats.porTipo.forEach(r => {
      byTipo[r.tipo_delito] = (byTipo[r.tipo_delito] || 0) + (+r.total);
    });
    return {
      total: stats.total,
      homicidios: byTipo['HOMICIDIO'] || 0,
      hurtos: (byTipo['HURTO A PERSONAS'] || 0) + (byTipo['HURTO A COMERCIO'] || 0) +
              (byTipo['HURTO A RESIDENCIAS'] || 0) + (byTipo['HURTO AUTOMOTORES'] || 0) +
              (byTipo['HURTO MOTOCICLETAS'] || 0) + (byTipo['HURTO CELULARES'] || 0),
      lesiones: byTipo['LESIONES PERSONALES'] || 0,
      vif: byTipo['VIOLENCIA INTRAFAMILIAR'] || 0,
    };
  }, [stats]);

  const porTipoAgg = useMemo(() => {
    if (!stats) return [];
    const map = {};
    stats.porTipo.forEach(r => {
      map[r.tipo_delito] = (map[r.tipo_delito] || 0) + (+r.total);
    });
    return Object.entries(map)
      .map(([tipo, total]) => ({ tipo_delito: tipo, total }))
      .sort((a, b) => b.total - a.total);
  }, [stats]);

  const porDiaSorted = useMemo(() => {
    if (!stats) return [];
    const map = {};
    stats.porDia.forEach(r => { map[r.dia_semana] = +r.total; });
    return DAY_ORDER.map(d => ({ dia: DAY_SHORT[d] || d.slice(0, 3), total: map[d] || 0 }));
  }, [stats]);

  return (
    <div className="del-page">
      {/* -- Header -- */}
      <header className="del-header">
        <div className="del-header-left">
          <img src="/logos/logocolombia.png" alt="Colombia" className="del-logo" />
          <img src="/logos/alcaldia.png" alt="Alcaldia" className="del-logo" />
          <div className="del-header-text">
            <span className="del-header-entity">Alcaldia Municipal - Santander de Quilichao</span>
            <span className="del-header-title">Observatorio de Seguridad y Convivencia</span>
          </div>
        </div>

        <div className="del-header-right">
          <div className="del-pills">
            {YEAR_OPTIONS.map(opt => (
              <button key={opt.value}
                className={`del-pill${anio === opt.value ? ' del-pill--active' : ''}`}
                onClick={() => setAnio(opt.value)}
              >{opt.label}</button>
            ))}
          </div>

          <select className="del-select" value={tipoDelito} onChange={e => setTipoDelito(e.target.value)}>
            <option value="">Todos los delitos</option>
            {tipos.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <div className="del-header-actions">
            <button className="del-btn-back" onClick={() => navigate('/portal/gobierno')} title="Portal">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              <span className="del-btn-text">Portal</span>
            </button>

            <button className="del-btn-map" onClick={() => navigate('/mapa/gobierno')} title="Geovisor">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M3.6 9h16.8M3.6 15h16.8"/></svg>
              <span className="del-btn-text">Geovisor</span>
            </button>

            {user && (
              <span className="del-user-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="7" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                <span className="del-user-name">{user.username}</span>
              </span>
            )}

            <button className="btn-logout" onClick={logout} title="Cerrar sesion">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span className="del-btn-text">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <div className="del-band" />

      {/* -- Scroll container -- */}
      <div className="del-scroll">
        {loading ? <Skeleton /> : stats && (
          <div className="del-content">

            {/* -- KPI Row -- */}
            <section className="del-kpi-row">
              <KpiCard label="Total hechos" value={kpis.total} accent="#DC2626"
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>} />
              <KpiCard label="Homicidios" value={kpis.homicidios} accent="#991B1B"
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>} />
              <KpiCard label="Hurtos" value={kpis.hurtos} accent="#2563EB"
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>} />
              <KpiCard label="Lesiones personales" value={kpis.lesiones} accent="#E11D48"
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87"/></svg>} />
              <KpiCard label="Violencia intrafamiliar" value={kpis.vif} accent="#DB2777"
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>} />
            </section>

            {/* -- Charts Grid -- */}
            <div className="del-grid-2">
              <section className="del-card">
                <h3 className="del-card-title">
                  <span className="del-card-dot" />
                  Hechos por tipo de delito
                </h3>
                <HBarChart data={porTipoAgg} labelKey="tipo_delito" valueKey="total"
                  colorFn={tipo => TIPO_COLORS[tipo] || '#6B7280'} />
              </section>

              <div className="del-col-stack">
                <section className="del-card">
                  <h3 className="del-card-title"><span className="del-card-dot" />Por zona</h3>
                  <DonutChart data={stats.porZona} labelKey="zona" valueKey="total" />
                </section>
                <section className="del-card">
                  <h3 className="del-card-title"><span className="del-card-dot" />Por genero</h3>
                  <DonutChart data={stats.porGenero} labelKey="genero" valueKey="total" />
                </section>
              </div>
            </div>

            {/* -- Day + Hour -- */}
            <div className="del-grid-2 del-grid-2--equal">
              <section className="del-card">
                <h3 className="del-card-title"><span className="del-card-dot" />Por dia de la semana</h3>
                <VBarChart data={porDiaSorted} labelKey="dia" valueKey="total" color="#DC2626" />
              </section>
              <section className="del-card">
                <h3 className="del-card-title"><span className="del-card-dot" />Por intervalo horario</h3>
                <VBarChart data={stats.porHora} labelKey="intervalo_hora" valueKey="total" color="#7C3AED" />
              </section>
            </div>

            {/* -- Monthly trend -- */}
            <section className="del-card">
              <h3 className="del-card-title"><span className="del-card-dot" />Tendencia mensual</h3>
              <MonthlyChart data={stats.porMes} />
            </section>

            {/* -- Top barrios + Edad -- */}
            <div className="del-grid-2">
              <section className="del-card">
                <h3 className="del-card-title"><span className="del-card-dot" />Barrios con mas hechos (zona urbana)</h3>
                <HBarChart data={stats.porBarrio} labelKey="barrio_hecho" valueKey="total"
                  colorFn={() => '#DC2626'} maxItems={20} />
              </section>
              <div className="del-col-stack">
                <section className="del-card">
                  <h3 className="del-card-title"><span className="del-card-dot" />Por grupo de edad</h3>
                  <VBarChart data={stats.porEdad} labelKey="grupo_edad" valueKey="total" color="#2563EB" />
                </section>
                <RankedList title="Modalidades mas frecuentes" data={stats.porModalidad} labelKey="modalidad" valueKey="total" />
                <RankedList title="Armas / medios utilizados" data={stats.porArma} labelKey="arma_medio" valueKey="total" />
              </div>
            </div>

            {/* -- Footer -- */}
            <footer className="del-footer">
              <div className="del-footer-line" />
              <p>Fuente: Policia Nacional - Secretaria de Gobierno, Paz y Convivencia</p>
              <p>Alcaldia Municipal de Santander de Quilichao - Sistema de Informacion Geografica QuiliData</p>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}
