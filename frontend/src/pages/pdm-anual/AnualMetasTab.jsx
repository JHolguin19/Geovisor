import { BarPct } from '../pdm/PdmShared';
import { colorPct } from '../pdm/helpers';

function fmtNum(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '—';
  return n.toLocaleString('es-CO', { maximumFractionDigits: 2 });
}

export default function AnualMetasTab({
  metas, total, loading, year, overview,
  secretarias, pilares,
  secFiltro, pilarFiltro, semaforoFiltro, busqueda,
  onSecFiltro, onPilarFiltro, onSemaforoFiltro, onBusqueda, onLimpiar,
  pagina, totalPaginas,
  onPaginaAnterior, onPaginaSiguiente,
  onMetaClick,
}) {
  const noProgramadas = overview ? parseInt(overview.no_programadas ?? 0) : null;
  const programadasSinPresupuesto = overview ? parseInt(overview.programadas_sin_presupuesto ?? 0) : null;

  const hasAlerts = (noProgramadas != null && noProgramadas > 0) ||
                    (programadasSinPresupuesto != null && programadasSinPresupuesto > 0);

  return (
    <>
      {/* ── Alertas del año ── */}
      {hasAlerts && (
        <section className="ma-alerts">
          <div className="ma-alerts__title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Alertas del año {year}
          </div>
          <div className="ma-alerts__cards">
            {noProgramadas > 0 && (
              <button
                className={`ma-alert-card ma-alert-card--np${semaforoFiltro === 'sin_programar' ? ' active' : ''}`}
                onClick={() => onSemaforoFiltro(semaforoFiltro === 'sin_programar' ? '' : 'sin_programar')}
              >
                <span className="ma-alert-card__count">{noProgramadas}</span>
                <span className="ma-alert-card__label">Sin programar en {year}</span>
                <span className="ma-alert-card__hint">meta_pdm ausente</span>
              </button>
            )}
            {programadasSinPresupuesto > 0 && (
              <button
                className={`ma-alert-card ma-alert-card--nb${semaforoFiltro === 'programada_sin_presupuesto' ? ' active' : ''}`}
                onClick={() => onSemaforoFiltro(semaforoFiltro === 'programada_sin_presupuesto' ? '' : 'programada_sin_presupuesto')}
              >
                <span className="ma-alert-card__count">{programadasSinPresupuesto}</span>
                <span className="ma-alert-card__label">Programadas sin presupuesto</span>
                <span className="ma-alert-card__hint">tienen meta PDM pero apropiación = 0</span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* Filtros */}
      <section className="pdm-filters">
        <div className="pdm-filter-group">
          <label>Secretaría</label>
          <select value={secFiltro} onChange={e => onSecFiltro(e.target.value)}>
            <option value="">Todas</option>
            {secretarias.map(s => (
              <option key={s.secretaria || s} value={s.secretaria || s}>{s.secretaria || s}</option>
            ))}
          </select>
        </div>
        <div className="pdm-filter-group">
          <label>Pilar</label>
          <select value={pilarFiltro} onChange={e => onPilarFiltro(e.target.value)}>
            <option value="">Todos</option>
            {pilares.map(p => (
              <option key={p.num_pilar} value={p.num_pilar}>{p.num_pilar}. {p.nom_pilar}</option>
            ))}
          </select>
        </div>
        <div className="pdm-filter-group">
          <label>Semáforo / Alerta</label>
          <select value={semaforoFiltro} onChange={e => onSemaforoFiltro(e.target.value)}>
            <option value="">Todos</option>
            <option value="verde">En meta (≥80%)</option>
            <option value="amarillo">Alerta (50-79%)</option>
            <option value="rojo">Crítica (&lt;50%)</option>
            <option value="sin_dato">Sin dato de ejecución</option>
            <optgroup label="── Alertas ──">
              <option value="sin_programar">Sin programar ({year})</option>
              <option value="sin_presupuesto">Sin presupuesto ({year})</option>
              <option value="programada_sin_presupuesto">Programadas sin presupuesto ({year})</option>
            </optgroup>
          </select>
        </div>
        <div className="pdm-filter-group pdm-filter-group--search">
          <label>Buscar</label>
          <input type="text" placeholder="Descripción, secretaría…"
            value={busqueda} onChange={e => onBusqueda(e.target.value)} />
        </div>
        {(secFiltro || pilarFiltro || semaforoFiltro || busqueda) && (
          <button className="pdm-clear-btn" onClick={onLimpiar}>× Limpiar</button>
        )}
      </section>

      {/* Tabla */}
      <section className="pdm-table-section">
        <div className="pdm-table-header">
          <span className="pdm-table-count">
            {loading ? 'Cargando…' : `${total} metas — año ${year}`}
            {semaforoFiltro === 'sin_programar'             && <span className="ma-filter-badge ma-filter-badge--np"> · Sin programar</span>}
            {semaforoFiltro === 'sin_presupuesto'            && <span className="ma-filter-badge ma-filter-badge--nb"> · Sin presupuesto</span>}
            {semaforoFiltro === 'programada_sin_presupuesto' && <span className="ma-filter-badge ma-filter-badge--nb"> · Programadas sin presupuesto</span>}
          </span>
          <span className="pdm-table-hint">Clic en una fila para ver detalle</span>
        </div>
        <div className="pdm-table-wrapper">
          <table className="pdm-table">
            <thead>
              <tr>
                <th className="th-c">#</th>
                <th>Secretaría</th>
                <th>Descripción</th>
                <th className="th-c">Meta PDM</th>
                <th className="th-c">Realizado</th>
                <th style={{ minWidth: 120 }}>Eficiencia</th>
                <th className="th-r">Apropiación</th>
                <th>Semáforo</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="pdm-empty-row">Cargando…</td></tr>
              ) : metas.length === 0 ? (
                <tr><td colSpan={8} className="pdm-empty-row">Sin resultados para {year}.</td></tr>
              ) : metas.map(m => {
                const eff = m.eficiencia != null ? Math.round(parseFloat(m.eficiencia) * 100) : null;
                const effColor = eff != null ? colorPct(eff) : 'var(--pdm-gray)';
                const semLabel = m.meta_pdm == null ? 'No programada'
                  : eff == null ? 'Sin dato'
                  : eff >= 80 ? 'En meta' : eff >= 50 ? 'Alerta' : 'Crítica';
                const semCls = m.meta_pdm == null ? 'estado-np'
                  : eff == null ? 'estado-sin-dato'
                  : eff >= 80 ? 'estado-alta' : eff >= 50 ? 'estado-media' : 'estado-baja';
                const aprop = m.presupuesto?.total_apropiacion;
                const sinPresup = !aprop || Number(aprop) === 0;
                return (
                  <tr key={m.id} className="pdm-row" onClick={() => onMetaClick(m.id)}>
                    <td className="th-c td-num">{m.meta_num}</td>
                    <td><span className="pdm-sec-chip">{m.secretaria}</span></td>
                    <td className="td-desc" title={m.descripcion_meta}>{m.descripcion_meta ?? '—'}</td>
                    <td className="th-c">
                      {m.meta_pdm != null ? fmtNum(m.meta_pdm) : <span className="np-tag" title="No programada para este año">NP</span>}
                    </td>
                    <td className="th-c">{m.meta_fisica != null ? fmtNum(m.meta_fisica) : '—'}</td>
                    <td>
                      {eff != null ? (
                        <>
                          <BarPct value={eff} height={7} />
                          <span className="pdm-bar-caption" style={{ color: effColor }}>{eff}%</span>
                        </>
                      ) : <span className="np-tag">—</span>}
                    </td>
                    <td className={`th-r td-money${sinPresup ? ' td-money--empty' : ''}`}>
                      {sinPresup ? <span className="np-tag" title="Sin presupuesto asignado">SP</span>
                        : `$${Number(aprop).toLocaleString('es-CO')}`}
                    </td>
                    <td><span className={`pdm-estado ${semCls}`}>{semLabel}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPaginas > 1 && (
          <div className="pdm-pagination">
            <button disabled={pagina === 1} onClick={onPaginaAnterior}>← Anterior</button>
            <span>Página {pagina} de {totalPaginas}</span>
            <button disabled={pagina === totalPaginas} onClick={onPaginaSiguiente}>Siguiente →</button>
          </div>
        )}
      </section>
    </>
  );
}
