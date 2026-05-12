import { useState, useEffect, useMemo, useContext } from 'react';
import { Link } from 'react-router-dom';
import AuthContext from '../../../context/AuthContext';
import { zonaRuralService } from '../../../services/api';
import '../Planeacion.css';
import './DashboardZonaRural.css';

const ACCENT = '#2E7D32';

function fmt(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString('es-CO');
}

function fmtHa(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' ha';
}

export default function DashboardZonaRural() {
  const { user } = useContext(AuthContext);

  const [veredas, setVeredas]         = useState([]);
  const [breakdown, setBreakdown]     = useState([]);
  const [stats, setStats]             = useState(null);
  const [selectedVereda, setSelected] = useState('TODAS');
  const [search, setSearch]           = useState('');
  const [loading, setLoading]         = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);

  // Load vereda list + full breakdown on mount
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [v, b, s] = await Promise.all([
          zonaRuralService.getVeredas(),
          zonaRuralService.getBreakdown(),
          zonaRuralService.getStats(),
        ]);
        setVeredas(v);
        setBreakdown(b);
        setStats(s);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Reload stats when vereda changes
  useEffect(() => {
    if (loading) return;
    (async () => {
      setLoadingStats(true);
      try {
        const s = await zonaRuralService.getStats(selectedVereda === 'TODAS' ? null : selectedVereda);
        setStats(s);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingStats(false);
      }
    })();
  }, [selectedVereda]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredVeredas = useMemo(() => {
    if (!search) return veredas;
    const q = search.toLowerCase();
    return veredas.filter(v => v.vereda.toLowerCase().includes(q));
  }, [veredas, search]);

  const filteredBreakdown = useMemo(() => {
    if (selectedVereda === 'TODAS') return breakdown;
    return breakdown.filter(r => r.vereda === selectedVereda);
  }, [breakdown, selectedVereda]);

  const isFiltered = selectedVereda !== 'TODAS';

  const totalPrediosUnicos = useMemo(
    () => veredas.reduce((a, v) => a + Number(v.predios_unicos), 0),
    [veredas]
  );

  return (
    <div className="zr-page">

      {/* Header */}
      <header className="plan-header">
        <div className="plan-header-brand">
          <img src="/logos/logocolombia.png" alt="Colombia" className="plan-logo" />
          <img src="/logos/alcaldia.png"     alt="Alcaldía" className="plan-logo" />
          <div className="plan-header-text">
            <span className="plan-entity">Alcaldía Municipal · Santander de Quilichao</span>
            <span className="plan-header-name" style={{ color: '#A5D6A7' }}>Planeación — Zona Rural</span>
          </div>
        </div>
        <div className="plan-header-right">
          {user && (
            <span style={{ display:'flex',alignItems:'center',gap:6,padding:'6px 14px',background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.15)',borderRadius:99,color:'rgba(255,255,255,.75)',fontSize:12,fontWeight:600 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="7" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              {user.username}
            </span>
          )}
          <Link to="/portal/planeacion" className="plan-back-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Portal Planeación
          </Link>
        </div>
      </header>

      {/* Banda de color */}
      <div className="plan-band" style={{ background: ACCENT }} />

      {/* Body: sidebar + main */}
      <div className="zr-body">

        {/* ── Sidebar ── */}
        <aside className="zr-sidebar">
          <div className="zr-sidebar-header">
            <div className="zr-sidebar-title">Filtrar por Vereda</div>
            <div className="zr-sidebar-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                className="zr-search-input"
                type="text"
                placeholder="Buscar vereda..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="zr-sidebar-count">
            {loading ? 'Cargando...' : `${filteredVeredas.length} de ${veredas.length} veredas`}
          </div>

          <div className="zr-vereda-list">
            {/* "Todas las veredas" option */}
            {!search && (
              <div
                className={`zr-vereda-item zr-vereda-item--all ${selectedVereda === 'TODAS' ? 'zr-vereda-item--active' : ''}`}
                onClick={() => setSelected('TODAS')}
              >
                <span className={`zr-vereda-name zr-vereda-name--all ${selectedVereda === 'TODAS' ? 'zr-vereda-name--active' : ''}`}>
                  Todas las veredas
                </span>
                <span className={`zr-vereda-badge zr-vereda-badge--all`}>
                  {loading ? '…' : fmt(totalPrediosUnicos)}
                </span>
              </div>
            )}

            {/* Vereda list */}
            {loading
              ? Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="zr-vereda-item">
                    <span className="zr-skeleton" style={{ height: 12, width: '60%' }} />
                    <span className="zr-skeleton" style={{ height: 20, width: 40 }} />
                  </div>
                ))
              : filteredVeredas.map(v => (
                  <div
                    key={v.vereda}
                    className={`zr-vereda-item ${selectedVereda === v.vereda ? 'zr-vereda-item--active' : ''}`}
                    onClick={() => setSelected(v.vereda)}
                  >
                    <span className={`zr-vereda-name ${selectedVereda === v.vereda ? 'zr-vereda-name--active' : ''}`}>
                      {v.vereda}
                    </span>
                    <span className={`zr-vereda-badge ${selectedVereda === v.vereda ? 'zr-vereda-badge--active' : ''}`}>
                      {fmt(v.predios_unicos)}
                    </span>
                  </div>
                ))
            }
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="zr-main">

          {/* Title bar */}
          <div className="zr-main-header">
            <div className="zr-main-title">
              {isFiltered ? selectedVereda : 'Zona Rural 2025'}
            </div>
            <div className="zr-main-sub">
              {isFiltered
                ? 'Estadísticas de predios para la vereda seleccionada'
                : 'Resumen general de predios rurales del municipio de Santander de Quilichao'}
            </div>
            {isFiltered && (
              <span className="zr-vereda-chip">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
                </svg>
                Vereda seleccionada
              </span>
            )}
          </div>

          {/* KPI cards */}
          <div className="zr-kpi-grid">
            <KpiCard
              label="Predios únicos"
              value={loadingStats ? null : fmt(stats?.predios_unicos)}
              sub="Sin duplicados por CODIGO"
              color={ACCENT}
            />
            <KpiCard
              label="Total registros"
              value={loadingStats ? null : fmt(stats?.total_registros)}
              sub={loadingStats ? '' : `${fmt(Number(stats?.total_registros) - Number(stats?.predios_unicos))} duplicados excluidos`}
              color="#1565C0"
            />
            <KpiCard
              label={isFiltered ? 'Vereda' : 'Veredas'}
              value={loadingStats ? null : isFiltered ? '1' : fmt(stats?.total_veredas)}
              sub={isFiltered ? selectedVereda : 'Veredas con datos'}
              color="#6A1B9A"
            />
            <KpiCard
              label="Área total"
              value={loadingStats ? null : fmtHa(stats?.area_total_ha)}
              sub="Hectáreas cadastradas"
              color="#E65100"
            />
          </div>

          {/* Breakdown table */}
          <div className="zr-table-section">
            <div className="zr-table-header">
              <span className="zr-table-title">
                {isFiltered ? `Predio — ${selectedVereda}` : 'Resumen por vereda'}
              </span>
              <span className="zr-table-badge">
                {isFiltered
                  ? `${fmt(stats?.predios_unicos)} predios únicos`
                  : `${filteredBreakdown.length} veredas`}
              </span>
            </div>
            <div className="zr-table-wrap">
              <table className="zr-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Vereda</th>
                    <th className="zr-th-right">Predios únicos</th>
                    <th className="zr-th-right">Total registros</th>
                    <th className="zr-th-right">Duplicados</th>
                    <th className="zr-th-right">Área (ha)</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i}>
                          {Array.from({ length: 6 }).map((__, j) => (
                            <td key={j}>
                              <span className="zr-skeleton" style={{ height: 12, width: j === 1 ? '80%' : '50%', display:'block' }} />
                            </td>
                          ))}
                        </tr>
                      ))
                    : filteredBreakdown.length === 0
                      ? (
                        <tr>
                          <td colSpan={6}>
                            <div className="zr-empty">No hay datos para mostrar</div>
                          </td>
                        </tr>
                      )
                      : filteredBreakdown.map((r, i) => (
                          <tr
                            key={r.vereda}
                            className={selectedVereda === r.vereda ? 'zr-tr--active' : ''}
                            onClick={() => !isFiltered && setSelected(r.vereda)}
                          >
                            <td style={{ color: 'var(--text-light)', fontSize: 11, fontWeight: 600 }}>{i + 1}</td>
                            <td className="zr-td-name">{r.vereda}</td>
                            <td className="zr-td-predios">{fmt(r.predios_unicos)}</td>
                            <td className="zr-td-right" style={{ fontWeight: 600 }}>{fmt(r.total_registros)}</td>
                            <td className="zr-td-dup">
                              <span className={`zr-dup-chip ${Number(r.duplicados) === 0 ? 'zr-dup-chip--none' : ''}`}>
                                {fmt(r.duplicados)}
                              </span>
                            </td>
                            <td className="zr-td-area">{fmtHa(r.area_hectareas)}</td>
                          </tr>
                        ))
                  }
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, color }) {
  return (
    <div className="zr-kpi-card" style={{ '--kpi-color': color }}>
      <div className="zr-kpi-label">{label}</div>
      {value == null
        ? <div className="zr-skeleton" style={{ height: 30, width: '70%', marginBottom: 6 }} />
        : <div className="zr-kpi-value">{value}</div>
      }
      <div className="zr-kpi-sub">{sub}</div>
    </div>
  );
}
