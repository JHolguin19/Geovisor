import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { pdmService } from '../services/api';
import './PdmPage.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

// Formatea un valor ya en escala 0-100 como porcentaje
function pct(val) {
  const n = parseFloat(val);
  return isNaN(n) ? '—' : `${Math.round(n * 10) / 10}%`;
}

// Formatea un valor 0-1 como porcentaje (multiplica x100)
function pct01(val) {
  const n = parseFloat(val);
  return isNaN(n) ? '—' : `${Math.round(n * 1000) / 10}%`;
}

// Formatea miles de millones COP
function fmtB(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '—';
  if (n >= 1000) return `$${(n / 1000).toFixed(2)} billones`;
  return `$${n.toFixed(1)} mil millones`;
}

// Color según avance en escala 0-100
function colorPct(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return 'var(--pdm-gray)';
  if (n >= 80)  return 'var(--pdm-green)';
  if (n >= 50)  return 'var(--pdm-amber)';
  return 'var(--pdm-red)';
}

// Color según avance en escala 0-1
function color01(val) {
  return colorPct(parseFloat(val) * 100);
}

function estadoMeta(fisico) {
  const n = parseFloat(fisico);
  if (isNaN(n) || fisico === null) return { label: 'Sin dato', cls: 'estado-sin-dato' };
  if (n >= 0.8) return { label: 'En meta',    cls: 'estado-alta' };
  if (n >= 0.5) return { label: 'En proceso', cls: 'estado-media' };
  return          { label: 'Rezagada',    cls: 'estado-baja' };
}

// ── Barra de progreso ─────────────────────────────────────────────────────────
// value: 0-100

function BarPct({ value, color, height = 8 }) {
  const w   = Math.min(100, Math.max(0, parseFloat(value) || 0));
  const col = color || colorPct(w);
  return (
    <div className="pdm-bar-track" style={{ height }}>
      <div className="pdm-bar-fill" style={{ width: `${w}%`, background: col }} />
    </div>
  );
}

// ── Gauge con SVG ─────────────────────────────────────────────────────────────
// value: 0-100

function Gauge({ value, label, sub, color }) {
  const n   = Math.min(100, Math.max(0, parseFloat(value) || 0));
  const col = color || colorPct(n);
  const r   = 52;
  const circ = 2 * Math.PI * r;
  const dash = (n / 100) * circ;

  return (
    <div className="pdm-gauge">
      <div className="pdm-gauge-wrap">
        <svg width="136" height="136" viewBox="0 0 136 136">
          {/* Track */}
          <circle cx="68" cy="68" r={r} fill="none" stroke="#e9ecef" strokeWidth="14" />
          {/* Fill */}
          <circle
            cx="68" cy="68" r={r}
            fill="none"
            stroke={col}
            strokeWidth="14"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
            transform="rotate(-90 68 68)"
          />
        </svg>
        <div className="pdm-gauge-center">
          <span className="pdm-gauge-value" style={{ color: col }}>{pct(n)}</span>
          <span className="pdm-gauge-label">{label}</span>
        </div>
      </div>
      {sub && <p className="pdm-gauge-sub">{sub}</p>}
    </div>
  );
}

// ── Modal detalle de meta ─────────────────────────────────────────────────────

function MetaModal({ id, onClose }) {
  const [meta, setMeta]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pdmService.getMeta(id).then(setMeta).finally(() => setLoading(false));
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [id, onClose]);

  const años = [2024, 2025, 2026, 2027];

  return (
    <div className="pdm-overlay" onClick={onClose}>
      <div className="pdm-modal" onClick={e => e.stopPropagation()}>
        <button className="pdm-modal-close" onClick={onClose}>×</button>

        {loading ? <div className="pdm-modal-loading">Cargando...</div> : !meta ? (
          <div className="pdm-modal-loading">No encontrado</div>
        ) : (<>
          <div className="pdm-modal-header">
            <div className="pdm-modal-meta-num">Meta #{meta.meta_num}</div>
            <h2 className="pdm-modal-title">{meta.descripcion_meta}</h2>
            <div className="pdm-modal-sec">{meta.secretaria}</div>
          </div>

          <div className="pdm-modal-kpis">
            {[
              { label: 'Avance Físico',       val: meta.avance_fisico,          color: null },
              { label: 'Cumplimiento 4 años', val: meta.cumplimiento_cuatrienio, color: 'var(--pdm-purple)' },
              { label: 'Eficiencia 2025',     val: meta.eficiencia_2025,         color: 'var(--pdm-amber)' },
            ].map(({ label, val, color }) => {
              const n = parseFloat(val);
              const w = isNaN(n) ? 0 : Math.round(n * 100);
              return (
                <div key={label} className="pdm-modal-kpi">
                  <span>{label}</span>
                  <div className="pdm-bar-track" style={{ height: 10 }}>
                    <div className="pdm-bar-fill" style={{ width: `${w}%`, background: color || colorPct(w) }} />
                  </div>
                  <strong style={{ color: color || colorPct(w) }}>{val !== null ? pct01(val) : '—'}</strong>
                </div>
              );
            })}
          </div>

          <div className="pdm-modal-section">
            <h3>Identificación</h3>
            <div className="pdm-modal-grid">
              <div><label>Pilar</label><span>{meta.num_pilar} — {meta.nom_pilar}</span></div>
              <div><label>Macrometa</label><span>{meta.macrometa}</span></div>
              <div><label>Programa</label><span>{meta.nombre_programa}</span></div>
              <div><label>Unidad de medida</label><span>{meta.unidad_medida}</span></div>
              <div><label>Tipo ponderado</label><span>{meta.tipo_ponderado}</span></div>
              <div><label>Meta cuatrienio</label><span>{meta.meta_cuatrienio}</span></div>
            </div>
          </div>

          <div className="pdm-modal-section">
            <h3>Ejecución física por año</h3>
            <table className="pdm-modal-table">
              <thead><tr><th>Año</th><th>Meta PDM</th><th>Realizado</th><th>Eficiencia</th></tr></thead>
              <tbody>
                {años.map(y => {
                  const mp = meta[`meta_pdm_${y}`];
                  const mr = meta[`meta_fisica_${y}`];
                  const ef = meta[`eficiencia_${y}`];
                  const np = mp === null;
                  return (
                    <tr key={y} className={np ? 'row-np' : ''}>
                      <td>{y}</td>
                      <td>{np ? 'NP' : mp}</td>
                      <td>{mr === null ? (np ? 'NP' : '—') : mr}</td>
                      <td>{ef === null ? (np ? 'NP' : '—')
                        : <span style={{ color: colorPct(ef * 100) }}>{pct01(ef)}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pdm-modal-section">
            <h3>Presupuesto por año</h3>
            <table className="pdm-modal-table">
              <thead>
                <tr><th>Año</th><th>Apropiación</th><th>Neto Registros</th><th>Obligación</th><th>% Ejec.</th></tr>
              </thead>
              <tbody>
                {años.map(y => {
                  const bp = meta[`presupuesto_${y}`] || {};
                  const fmt = (v) => v != null ? `$${Number(v).toLocaleString('es-CO')}` : '—';
                  return (
                    <tr key={y}>
                      <td>{y}</td>
                      <td>{fmt(bp.total_apropiacion)}</td>
                      <td>{fmt(bp.neto_registros)}</td>
                      <td>{fmt(bp.total_obligacion)}</td>
                      <td>{bp.pct_ejecucion_obligado != null
                        ? <span style={{ color: colorPct(bp.pct_ejecucion_obligado * 100) }}>
                            {pct01(bp.pct_ejecucion_obligado)}
                          </span>
                        : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {(meta.observaciones_2024 || meta.compromisos_2024 || meta.observaciones_2025 || meta.compromisos_2025) && (
            <div className="pdm-modal-section">
              <h3>Observaciones y compromisos</h3>
              {['2024','2025'].map(y => (
                (meta[`observaciones_${y}`] || meta[`compromisos_${y}`]) ? (
                  <div key={y} className="pdm-obs-block">
                    <strong>{y}</strong>
                    {meta[`observaciones_${y}`] && <div className="pdm-obs-row"><span>Observaciones:</span><p>{meta[`observaciones_${y}`]}</p></div>}
                    {meta[`compromisos_${y}`]   && <div className="pdm-obs-row"><span>Compromisos:</span><p>{meta[`compromisos_${y}`]}</p></div>}
                  </div>
                ) : null
              ))}
            </div>
          )}
        </>)}
      </div>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',    label: 'Resumen general' },
  { id: 'secretarias', label: 'Por secretaría' },
  { id: 'metas',       label: 'Detalle de metas' },
];

// ── Página principal ──────────────────────────────────────────────────────────

export default function PdmPage() {
  const [searchParams] = useSearchParams();
  const [tab, setTab]  = useState('overview');

  const [overview,    setOverview]    = useState(null);
  const [ovLoading,   setOvLoading]   = useState(true);
  const [secretarias, setSecretarias] = useState([]);
  const [pilares,     setPilares]     = useState([]);

  const [metas,       setMetas]       = useState([]);
  const [total,       setTotal]       = useState(0);
  const [tblLoading,  setTblLoading]  = useState(false);
  const [secFiltro,   setSecFiltro]   = useState(searchParams.get('secretaria') || '');
  const [pilarFiltro, setPilarFiltro] = useState('');
  const [busqueda,    setBusqueda]    = useState('');
  const [pagina,      setPagina]      = useState(1);
  const LIMIT = 50;

  const [modalId, setModalId] = useState(null);

  // Carga inicial
  useEffect(() => {
    pdmService.getOverview()
      .then(setOverview)
      .catch(err => console.error('Error overview:', err))
      .finally(() => setOvLoading(false));
    pdmService.getPilares().then(setPilares);
    pdmService.getSecretarias().then(setSecretarias);
  }, []);

  // Carga tabla metas
  const cargarMetas = useCallback(async () => {
    if (tab !== 'metas') return;
    setTblLoading(true);
    try {
      const params = { page: pagina, limit: LIMIT };
      if (secFiltro)   params.secretaria = secFiltro;
      if (pilarFiltro) params.pilar      = pilarFiltro;
      if (busqueda)    params.busqueda   = busqueda;
      const r = await pdmService.getMetas(params);
      setMetas(r.data);
      setTotal(r.total);
    } finally { setTblLoading(false); }
  }, [tab, secFiltro, pilarFiltro, busqueda, pagina]);

  useEffect(() => { cargarMetas(); }, [cargarMetas]);

  const setFiltro = (setter) => (val) => { setter(val); setPagina(1); };
  const totalPaginas = Math.ceil(total / LIMIT);

  const g  = overview?.global  || {};
  const pl = overview?.pilares || [];
  const al = overview?.alertas || [];

  return (
    <div className="pdm-page">

      {/* ── Header ── */}
      <header className="pdm-header">
        <div className="pdm-header-left">
          <Link to="/dashboard" className="pdm-back-btn">← Dashboard</Link>
          <div className="pdm-header-title">
            <h1>Plan de Desarrollo Municipal 2024–2027</h1>
            <p>Santander de Quilichao · {g.total_metas || '…'} metas de seguimiento</p>
          </div>
        </div>
      </header>

      {/* ── Tabs ── */}
      <div className="pdm-tabs">
        {TABS.map(t => (
          <button key={t.id}
            className={`pdm-tab${tab === t.id ? ' pdm-tab--active' : ''}`}
            onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <main className="pdm-main">

        {/* ══════════════════════════════════════════
            TAB 1: RESUMEN GENERAL
        ══════════════════════════════════════════ */}
        {tab === 'overview' && (
          ovLoading
            ? <div className="pdm-loading-full">Cargando datos del PDM…</div>
            : <>

              {/* ── Gauges principales ── */}
              <section className="pdm-section pdm-gauges-section">
                <div className="pdm-gauges-row">
                  <Gauge
                    value={g.avance_fisico_pct}
                    label="Avance Físico"
                    sub="Promedio de las 200 metas"
                  />
                  <div className="pdm-gauge-divider" />
                  <Gauge
                    value={g.avance_financiero_pct}
                    label="Avance Financiero"
                    color="var(--pdm-blue)"
                    sub="Neto Registros 2024+2025 / Apropiación 4 años"
                  />
                  <div className="pdm-gauge-divider" />
                  <Gauge
                    value={g.avance_obligacion_pct}
                    label="Desembolsado"
                    color="var(--pdm-purple)"
                    sub="Obligaciones 2024+2025 / Apropiación 4 años"
                  />
                </div>
                <div className="pdm-formula-nota">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span>
                    <strong>Avance financiero</strong> = Neto Registros (2024+2025) ÷ Total Apropiación (4 años) ·
                    <strong> Desembolsado</strong> = Obligaciones (2024+2025) ÷ Total Apropiación (4 años)
                  </span>
                </div>
              </section>

              {/* ── Presupuesto ── */}
              <section className="pdm-section">
                <h2 className="pdm-section-h">Presupuesto del cuatrienio</h2>
                <div className="pdm-budget-grid">

                  <div className="pdm-budget-card pdm-budget-card--total">
                    <div className="pdm-bc-icon">$</div>
                    <div className="pdm-bc-body">
                      <div className="pdm-bc-label">Total Apropiación 4 años</div>
                      <div className="pdm-bc-value">{fmtB(g.presupuesto_total_b)}</div>
                      <div className="pdm-bc-sub">Presupuesto total del PDM 2024–2027</div>
                    </div>
                  </div>

                  <div className="pdm-budget-card pdm-budget-card--comprometido">
                    <div className="pdm-bc-icon">≡</div>
                    <div className="pdm-bc-body">
                      <div className="pdm-bc-label">Neto Registros (comprometido)</div>
                      <div className="pdm-bc-value">{fmtB(g.comprometido_b)}</div>
                      <div className="pdm-bc-sub">2024 + 2025 — comprometido sin desembolsar</div>
                      <BarPct value={g.avance_financiero_pct} color="var(--pdm-blue)" height={6} />
                      <div className="pdm-bc-pct" style={{ color: 'var(--pdm-blue)' }}>{pct(g.avance_financiero_pct)} del total 4 años</div>
                    </div>
                  </div>

                  <div className="pdm-budget-card pdm-budget-card--desembolsado">
                    <div className="pdm-bc-icon">✓</div>
                    <div className="pdm-bc-body">
                      <div className="pdm-bc-label">Obligaciones (desembolsado)</div>
                      <div className="pdm-bc-value">{fmtB(g.desembolsado_b)}</div>
                      <div className="pdm-bc-sub">2024 + 2025 — dinero ya pagado</div>
                      <BarPct value={g.avance_obligacion_pct} color="var(--pdm-purple)" height={6} />
                      <div className="pdm-bc-pct" style={{ color: 'var(--pdm-purple)' }}>{pct(g.avance_obligacion_pct)} del total 4 años</div>
                    </div>
                  </div>

                  <div className="pdm-budget-card pdm-budget-card--pendiente">
                    <div className="pdm-bc-icon">→</div>
                    <div className="pdm-bc-body">
                      <div className="pdm-bc-label">Pendiente por comprometer</div>
                      <div className="pdm-bc-value">{fmtB(parseFloat(g.presupuesto_total_b) - parseFloat(g.comprometido_b))}</div>
                      <div className="pdm-bc-sub">Apropiación 2026–2027 + saldos</div>
                    </div>
                  </div>

                </div>
              </section>

              {/* ── Estado de metas ── */}
              <section className="pdm-section">
                <h2 className="pdm-section-h">Estado de las {g.total_metas} metas</h2>
                <div className="pdm-estado-layout">

                  {/* Cards de estado */}
                  <div className="pdm-estado-cards">
                    {[
                      { label: 'En meta',    n: g.metas_en_meta,    cls: 'alta',  desc: 'Avance físico ≥ 80%' },
                      { label: 'En proceso', n: g.metas_en_proceso, cls: 'media', desc: 'Avance físico 50–79%' },
                      { label: 'Rezagadas',  n: g.metas_rezagadas,  cls: 'baja',  desc: 'Avance físico < 50%' },
                    ].map(({ label, n, cls, desc }) => (
                      <div key={cls} className={`pdm-estado-card pdm-estado-${cls}`}>
                        <div className="pdm-ec-num">{n}</div>
                        <div className="pdm-ec-label">{label}</div>
                        <div className="pdm-ec-desc">{desc}</div>
                        <div className="pdm-ec-pct">
                          {Math.round((parseInt(n) / parseInt(g.total_metas)) * 100)}% del total
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Datos adicionales */}
                  <div className="pdm-datos-extra">
                    <h3>Datos adicionales</h3>
                    {[
                      {
                        val: g.metas_superaron,
                        label: 'metas superaron su objetivo físico en 2025',
                        color: 'var(--pdm-green)',
                        icon: '↑',
                      },
                      {
                        val: g.metas_np_2025,
                        label: 'metas no programadas (NP) en 2025',
                        color: 'var(--pdm-amber)',
                        icon: '⊘',
                      },
                      {
                        val: g.brecha_financiero_mayor,
                        label: 'metas donde el gasto supera el avance físico (brecha >10%)',
                        color: 'var(--pdm-blue)',
                        icon: '↔',
                      },
                      {
                        val: `${g.eficiencia_2025_pct}%`,
                        label: 'eficiencia promedio en 2025 (avance vs meta programada)',
                        color: 'var(--pdm-purple)',
                        icon: '◎',
                      },
                      {
                        val: `${g.cumplimiento_cuatrienio_pct}%`,
                        label: 'cumplimiento cuatrienio (2 de 4 años transcurridos)',
                        color: colorPct(g.cumplimiento_cuatrienio_pct),
                        icon: '⬡',
                      },
                    ].map(({ val, label, color, icon }) => (
                      <div key={label} className="pdm-dato-row">
                        <span className="pdm-dato-icon" style={{ color }}>{icon}</span>
                        <span className="pdm-dato-val" style={{ color }}>{val}</span>
                        <span className="pdm-dato-label">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* ── Por pilar ── */}
              <section className="pdm-section">
                <h2 className="pdm-section-h">Avance por pilar estratégico</h2>
                <div className="pdm-pilares-grid">
                  {pl.map(pilar => (
                    <div key={pilar.num_pilar} className="pdm-pilar-card">
                      <div className="pdm-pilar-head">
                        <span className="pdm-pilar-num">Pilar {pilar.num_pilar}</span>
                        <span className="pdm-pilar-presupuesto">{fmtB(pilar.presupuesto_b)}</span>
                      </div>
                      <div className="pdm-pilar-nom">{pilar.nom_pilar}</div>
                      <div className="pdm-pilar-metas">{pilar.total_metas} metas</div>

                      <div className="pdm-pilar-bars">
                        <div className="pdm-pilar-bar-row">
                          <span>Físico</span>
                          <BarPct value={pilar.avance_fisico_pct} height={10} />
                          <b style={{ color: colorPct(pilar.avance_fisico_pct) }}>{pct(pilar.avance_fisico_pct)}</b>
                        </div>
                        <div className="pdm-pilar-bar-row">
                          <span>Financiero</span>
                          <BarPct value={pilar.avance_financiero_pct} color="var(--pdm-blue)" height={10} />
                          <b style={{ color: 'var(--pdm-blue)' }}>{pct(pilar.avance_financiero_pct)}</b>
                        </div>
                      </div>

                      <div className="pdm-pilar-chips">
                        <span className="chip-alta">{pilar.en_meta} en meta</span>
                        <span className="chip-media">{pilar.en_proceso} proceso</span>
                        <span className="chip-baja">{pilar.rezagadas} rezag.</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── Alertas ── */}
              {al.length > 0 && (
                <section className="pdm-section pdm-alertas-section">
                  <h2 className="pdm-section-h">
                    <span className="pdm-alerta-dot" /> Metas críticas — bajo avance físico con alto presupuesto
                  </h2>
                  <div className="pdm-alertas-grid">
                    {al.map(a => (
                      <div key={a.id} className="pdm-alerta-card" onClick={() => setModalId(a.id)}>
                        <div className="pdm-alerta-top">
                          <span className="pdm-alerta-num">Meta #{a.meta_num}</span>
                          <span className="pdm-alerta-sec">{a.secretaria}</span>
                        </div>
                        <div className="pdm-alerta-desc">{a.descripcion_meta}</div>
                        <div className="pdm-alerta-bottom">
                          <span style={{ color: colorPct(parseFloat(a.avance_fisico_pct)) }}>
                            Físico: {a.avance_fisico_pct}%
                          </span>
                          <span className="pdm-alerta-ppto">
                            ${parseFloat(a.presupuesto_m).toLocaleString('es-CO')} M
                          </span>
                        </div>
                        <BarPct value={a.avance_fisico_pct} height={5} />
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
        )}

        {/* ══════════════════════════════════════════
            TAB 2: POR SECRETARÍA
        ══════════════════════════════════════════ */}
        {tab === 'secretarias' && (
          <section className="pdm-table-section">
            <div className="pdm-table-header">
              <span className="pdm-table-count">{secretarias.length} secretarías — ordenadas por presupuesto</span>
              <span className="pdm-table-hint">Haz clic en una fila para ver sus metas</span>
            </div>
            <div className="pdm-table-wrapper">
              <table className="pdm-table">
                <thead>
                  <tr>
                    <th>Secretaría</th>
                    <th className="th-c">Metas</th>
                    <th style={{ minWidth: 160 }}>Avance Físico</th>
                    <th style={{ minWidth: 160 }}>Avance Financiero</th>
                    <th className="th-r">Apropiación 4 años</th>
                    <th className="th-r">Comprometido</th>
                    <th className="th-c">En meta</th>
                    <th className="th-c">Rezagadas</th>
                  </tr>
                </thead>
                <tbody>
                  {secretarias.map(s => (
                    <tr key={s.secretaria} className="pdm-row"
                      onClick={() => { setFiltro(setSecFiltro)(s.secretaria); setTab('metas'); }}>
                      <td className="td-sec-name">{s.secretaria}</td>
                      <td className="th-c">{s.total_metas}</td>
                      <td>
                        <BarPct value={s.avance_fisico_pct} height={7} />
                        <span className="pdm-bar-caption" style={{ color: colorPct(s.avance_fisico_pct) }}>
                          {pct(s.avance_fisico_pct)}
                        </span>
                      </td>
                      <td>
                        <BarPct value={s.avance_financiero_pct} color="var(--pdm-blue)" height={7} />
                        <span className="pdm-bar-caption" style={{ color: 'var(--pdm-blue)' }}>
                          {pct(s.avance_financiero_pct)}
                        </span>
                      </td>
                      <td className="th-r td-money">
                        {parseFloat(s.presupuesto_m) >= 1000
                          ? `$${(s.presupuesto_m/1000).toFixed(1)} mil M`
                          : `$${parseInt(s.presupuesto_m).toLocaleString('es-CO')} M`}
                      </td>
                      <td className="th-r td-money">
                        {parseFloat(s.comprometido_m) >= 1000
                          ? `$${(s.comprometido_m/1000).toFixed(1)} mil M`
                          : `$${parseInt(s.comprometido_m).toLocaleString('es-CO')} M`}
                      </td>
                      <td className="th-c"><span className="chip-alta">{s.metas_en_meta}</span></td>
                      <td className="th-c">
                        <span className={parseInt(s.metas_rezagadas) > 0 ? 'chip-baja' : 'chip-alta'}>
                          {s.metas_rezagadas}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════
            TAB 3: DETALLE DE METAS
        ══════════════════════════════════════════ */}
        {tab === 'metas' && (<>
          <section className="pdm-filters">
            <div className="pdm-filter-group">
              <label>Secretaría</label>
              <select value={secFiltro} onChange={e => setFiltro(setSecFiltro)(e.target.value)}>
                <option value="">Todas</option>
                {secretarias.map(s => <option key={s.secretaria} value={s.secretaria}>{s.secretaria}</option>)}
              </select>
            </div>
            <div className="pdm-filter-group">
              <label>Pilar</label>
              <select value={pilarFiltro} onChange={e => setFiltro(setPilarFiltro)(e.target.value)}>
                <option value="">Todos</option>
                {pilares.map(p => <option key={p.num_pilar} value={p.num_pilar}>{p.num_pilar}. {p.nom_pilar}</option>)}
              </select>
            </div>
            <div className="pdm-filter-group pdm-filter-group--search">
              <label>Buscar</label>
              <input type="text" placeholder="Descripción, secretaría, macrometa..."
                value={busqueda} onChange={e => setFiltro(setBusqueda)(e.target.value)} />
            </div>
            {(secFiltro || pilarFiltro || busqueda) && (
              <button className="pdm-clear-btn" onClick={() => {
                setSecFiltro(''); setPilarFiltro(''); setBusqueda(''); setPagina(1);
              }}>× Limpiar</button>
            )}
          </section>

          <section className="pdm-table-section">
            <div className="pdm-table-header">
              <span className="pdm-table-count">
                {tblLoading ? 'Cargando…' : `${total} metas`}
              </span>
              <span className="pdm-table-hint">Haz clic en una fila para ver el detalle completo</span>
            </div>
            <div className="pdm-table-wrapper">
              <table className="pdm-table">
                <thead>
                  <tr>
                    <th className="th-c">#</th>
                    <th>Secretaría</th>
                    <th>Descripción</th>
                    <th className="th-c">Pilar</th>
                    <th style={{ minWidth: 130 }}>Avance Físico</th>
                    <th className="th-c">Efic. 2025</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {tblLoading ? (
                    <tr><td colSpan={7} className="pdm-empty-row">Cargando…</td></tr>
                  ) : metas.length === 0 ? (
                    <tr><td colSpan={7} className="pdm-empty-row">Sin resultados.</td></tr>
                  ) : metas.map(m => {
                    const { label, cls } = estadoMeta(m.avance_fisico);
                    const fisicoPct = Math.round((parseFloat(m.avance_fisico) || 0) * 100);
                    return (
                      <tr key={m.id} className="pdm-row" onClick={() => setModalId(m.id)}>
                        <td className="th-c td-num">{m.meta_num ?? m.id}</td>
                        <td><span className="pdm-sec-chip">{m.secretaria}</span></td>
                        <td className="td-desc" title={m.descripcion_meta}>{m.descripcion_meta ?? '—'}</td>
                        <td className="th-c"><span className="pdm-pilar-badge">P{m.num_pilar}</span></td>
                        <td>
                          <BarPct value={fisicoPct} height={7} />
                          <span className="pdm-bar-caption" style={{ color: colorPct(fisicoPct) }}>
                            {fisicoPct}%
                          </span>
                        </td>
                        <td className="th-c">
                          {m.eficiencia_2025 !== null
                            ? <span style={{ color: colorPct(m.eficiencia_2025 * 100), fontWeight: 700 }}>
                                {Math.round(m.eficiencia_2025 * 100)}%
                              </span>
                            : <span className="np-tag">NP</span>}
                        </td>
                        <td><span className={`pdm-estado ${cls}`}>{label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPaginas > 1 && (
              <div className="pdm-pagination">
                <button disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}>← Anterior</button>
                <span>Página {pagina} de {totalPaginas}</span>
                <button disabled={pagina === totalPaginas} onClick={() => setPagina(p => p + 1)}>Siguiente →</button>
              </div>
            )}
          </section>
        </>)}

      </main>

      {modalId && <MetaModal id={modalId} onClose={() => setModalId(null)} />}
    </div>
  );
}
