import { useState, useEffect } from 'react';
import { pdmService } from '../../services/api';
import { colorPct, pct01, estadoMeta } from './helpers';

export default function MetaModal({ id, year, onClose }) {
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
              { label: 'Avance Físico',       val: meta.avance_fisico,           color: null,                scale: 1   },
              { label: 'Cumplimiento 4 años', val: meta.cumplimiento_cuatrienio, color: 'var(--pdm-purple)', scale: 100 },
              { label: 'Eficiencia 2025',     val: meta.eficiencia_2025,         color: 'var(--pdm-amber)',  scale: 1   },
            ].map(({ label, val, color, scale }) => {
              const n = parseFloat(val);
              // scale=1: valor 0–1, multiplicar ×100. scale=100: ya en 0–100, usar directo.
              const w = isNaN(n) ? 0 : Math.min(Math.round(scale === 100 ? n : n * 100), 100);
              const display = isNaN(n) ? '—' : scale === 100 ? `${n.toFixed(1)}%` : pct01(val);
              return (
                <div key={label} className="pdm-modal-kpi">
                  <span>{label}</span>
                  <div className="pdm-bar-track" style={{ height: 10 }}>
                    <div className="pdm-bar-fill" style={{ width: `${w}%`, background: color || colorPct(w) }} />
                  </div>
                  <strong style={{ color: color || colorPct(w) }}>{val !== null ? display : '—'}</strong>
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

          {(() => {
            const allYears = ['2024', '2025', '2026', '2027'];
            const hasAnyObs = allYears.some(y => meta[`observaciones_${y}`] || meta[`compromisos_${y}`]);
            if (!hasAnyObs) return null;
            const selectedStr = year ? String(year) : null;
            const sortedYears = selectedStr
              ? [selectedStr, ...allYears.filter(y => y !== selectedStr)]
              : allYears;
            return (
              <div className="pdm-modal-section">
                <h3>Observaciones y compromisos</h3>
                {sortedYears.map(y => (
                  (meta[`observaciones_${y}`] || meta[`compromisos_${y}`]) ? (
                    <div key={y} className={`pdm-obs-block${y === selectedStr ? ' pdm-obs-block--active' : ''}`}>
                      <strong>{y}{y === selectedStr ? ' · año seleccionado' : ''}</strong>
                      {meta[`observaciones_${y}`] && <div className="pdm-obs-row"><span>Observaciones:</span><p>{meta[`observaciones_${y}`]}</p></div>}
                      {meta[`compromisos_${y}`]   && <div className="pdm-obs-row"><span>Compromisos:</span><p>{meta[`compromisos_${y}`]}</p></div>}
                    </div>
                  ) : null
                ))}
              </div>
            );
          })()}
        </>)}
      </div>
    </div>
  );
}
