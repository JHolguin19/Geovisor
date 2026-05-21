import { BarPct } from './PdmShared';
import { colorPct, estadoMeta } from './helpers';

export default function PdmMetasTab({
  metas, total, loading,
  secretarias, pilares,
  secFiltro, pilarFiltro, semaforoFiltro, busqueda,
  onSecFiltro, onPilarFiltro, onSemaforoFiltro, onBusqueda, onLimpiar,
  pagina, totalPaginas,
  onPaginaAnterior, onPaginaSiguiente,
  onMetaClick
}) {
  return (
    <>
      {/* Filtros */}
      <section className="pdm-filters">
        <div className="pdm-filter-group">
          <label>Secretaría</label>
          <select value={secFiltro} onChange={e => onSecFiltro(e.target.value)}>
            <option value="">Todas</option>
            {secretarias.map(s => <option key={s.secretaria} value={s.secretaria}>{s.secretaria}</option>)}
          </select>
        </div>
        <div className="pdm-filter-group">
          <label>Pilar</label>
          <select value={pilarFiltro} onChange={e => onPilarFiltro(e.target.value)}>
            <option value="">Todos</option>
            {pilares.map(p => <option key={p.num_pilar} value={p.num_pilar}>{p.num_pilar}. {p.nom_pilar}</option>)}
          </select>
        </div>
        <div className="pdm-filter-group">
          <label>Semáforo</label>
          <select value={semaforoFiltro} onChange={e => onSemaforoFiltro(e.target.value)}>
            <option value="">Todos</option>
            <option value="verde">En meta (≥80%)</option>
            <option value="amarillo">En proceso (50–79%)</option>
            <option value="rojo">Rezagada (&lt;50%)</option>
            <option value="sin_dato">Sin dato</option>
          </select>
        </div>
        <div className="pdm-filter-group pdm-filter-group--search">
          <label>Buscar</label>
          <input type="text" placeholder="Descripción, secretaría, macrometa..."
            value={busqueda} onChange={e => onBusqueda(e.target.value)} />
        </div>
        {(secFiltro || pilarFiltro || semaforoFiltro || busqueda) && (
          <button className="pdm-clear-btn" onClick={onLimpiar}>× Limpiar</button>
        )}
      </section>

      {/* Tabla */}
      <section className="pdm-table-section">
        <div className="pdm-table-header">
          <span className="pdm-table-count">{loading ? 'Cargando…' : `${total} metas`}</span>
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
              {loading ? (
                <tr><td colSpan={7} className="pdm-empty-row">Cargando…</td></tr>
              ) : metas.length === 0 ? (
                <tr><td colSpan={7} className="pdm-empty-row">Sin resultados.</td></tr>
              ) : metas.map(m => {
                const { label, cls } = estadoMeta(m.avance_fisico);
                const fisicoPct = Math.round((parseFloat(m.avance_fisico) || 0) * 100);
                return (
                  <tr key={m.id} className="pdm-row" onClick={() => onMetaClick(m.id)}>
                    <td className="th-c td-num">{m.meta_num ?? m.id}</td>
                    <td><span className="pdm-sec-chip">{m.secretaria}</span></td>
                    <td className="td-desc" title={m.descripcion_meta}>{m.descripcion_meta ?? '—'}</td>
                    <td className="th-c"><span className="pdm-pilar-badge">P{m.num_pilar}</span></td>
                    <td>
                      <BarPct value={fisicoPct} height={7} />
                      <span className="pdm-bar-caption" style={{ color: colorPct(fisicoPct) }}>{fisicoPct}%</span>
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
            <button disabled={pagina === 1} onClick={onPaginaAnterior}>← Anterior</button>
            <span>Página {pagina} de {totalPaginas}</span>
            <button disabled={pagina === totalPaginas} onClick={onPaginaSiguiente}>Siguiente →</button>
          </div>
        )}
      </section>
    </>
  );
}
