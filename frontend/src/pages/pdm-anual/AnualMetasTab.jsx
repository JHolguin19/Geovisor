import { BarPct } from '../pdm/PdmShared';
import { colorPct } from '../pdm/helpers';

function fmtNum(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '—';
  return n.toLocaleString('es-CO', { maximumFractionDigits: 2 });
}

export default function AnualMetasTab({
  metas, total, loading, year,
  secretarias, pilares,
  secFiltro, pilarFiltro, semaforoFiltro, busqueda,
  onSecFiltro, onPilarFiltro, onSemaforoFiltro, onBusqueda, onLimpiar,
  pagina, totalPaginas,
  onPaginaAnterior, onPaginaSiguiente,
  onMetaClick,
}) {
  return (
    <>
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
          <label>Semáforo</label>
          <select value={semaforoFiltro} onChange={e => onSemaforoFiltro(e.target.value)}>
            <option value="">Todos</option>
            <option value="verde">En meta (≥80%)</option>
            <option value="amarillo">Alerta (50-79%)</option>
            <option value="rojo">Crítica (&lt;50%)</option>
            <option value="sin_dato">Sin dato</option>
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
          <span className="pdm-table-count">{loading ? 'Cargando…' : `${total} metas — año ${year}`}</span>
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
                const semLabel = eff == null ? 'Sin dato'
                  : eff >= 80 ? 'En meta' : eff >= 50 ? 'Alerta' : 'Crítica';
                const semCls = eff == null ? 'estado-sin-dato'
                  : eff >= 80 ? 'estado-alta' : eff >= 50 ? 'estado-media' : 'estado-baja';
                const aprop = m.presupuesto?.total_apropiacion;
                return (
                  <tr key={m.id} className="pdm-row" onClick={() => onMetaClick(m.id)}>
                    <td className="th-c td-num">{m.meta_num}</td>
                    <td><span className="pdm-sec-chip">{m.secretaria}</span></td>
                    <td className="td-desc" title={m.descripcion_meta}>{m.descripcion_meta ?? '—'}</td>
                    <td className="th-c">{m.meta_pdm != null ? fmtNum(m.meta_pdm) : <span className="np-tag">NP</span>}</td>
                    <td className="th-c">{m.meta_fisica != null ? fmtNum(m.meta_fisica) : '—'}</td>
                    <td>
                      {eff != null ? (
                        <>
                          <BarPct value={eff} height={7} />
                          <span className="pdm-bar-caption" style={{ color: effColor }}>{eff}%</span>
                        </>
                      ) : <span className="np-tag">—</span>}
                    </td>
                    <td className="th-r td-money">
                      {aprop != null ? `$${Number(aprop).toLocaleString('es-CO')}` : '—'}
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
