import { useContext } from 'react';
import MapContext from '../../context/MapContext';
import { useMapStats } from '../../hooks/useMapStats';
import { UBA_DATA, UBA_LAYER_IDS, USO_SUELO_LAYERS } from '../../services/statsService';
import './StatsPanel.css';

const UBA_ORDER = ['uba1', 'uba2', 'uba3', 'uba4', 'uba5', 'ubac'];
const UBA_COLORS = {
  uba1: '#E53935', uba2: '#43A047', uba3: '#1E88E5',
  uba4: '#FB8C00', uba5: '#8E24AA', ubac: '#00ACC1',
};

function SpinnerIcon() {
  return (
    <svg className="sp-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  );
}

export default function StatsPanel() {
  const { activeLayers } = useContext(MapContext);
  const { stats, loading } = useMapStats();

  const arr = Array.from(activeLayers);
  const activeUbas = UBA_ORDER.filter(id => arr.includes(id));
  const activeUsos = Object.keys(USO_SUELO_LAYERS).filter(id => arr.includes(id));

  // Show panel only when there's something to display
  if (activeUsos.length === 0 && activeUbas.length === 0) return null;

  // Max count for bar scaling (by-UBA section)
  const allCounts = activeUbas.flatMap(ubaId =>
    activeUsos.map(lid => stats?.porUba?.[ubaId]?.[lid] ?? 0)
  );
  const maxCount = Math.max(1, ...allCounts);

  return (
    <div className="stats-panel">
      {/* Header */}
      <div className="sp-header">
        <svg className="sp-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        <span>Estadísticas</span>
      </div>

      {/* UBA summary table (only when UBAs are active) */}
      {activeUbas.length > 0 && (
        <div className="sp-section">
          <div className="sp-section-title">Resumen por UBA</div>
          <table className="sp-table">
            <thead>
              <tr>
                <th>UBA</th>
                <th>Predios</th>
                <th>Área m²</th>
              </tr>
            </thead>
            <tbody>
              {activeUbas.map(id => {
                const d = UBA_DATA[id];
                return (
                  <tr key={id}>
                    <td>
                      <span className="sp-uba-dot" style={{ background: UBA_COLORS[id] }} />
                      {d.uba}
                    </td>
                    <td>{d.numero_predios.toLocaleString('es-CO')}</td>
                    <td>{d.area_m2.toLocaleString('es-CO')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Total count per layer (always when uso suelo is active) */}
      {activeUsos.length > 0 && (
        <div className="sp-section">
          <div className="sp-section-title">
            Total por capa
            {loading && <SpinnerIcon />}
          </div>
          {loading ? (
            <p className="sp-loading-text">Calculando conteos...</p>
          ) : (
            <table className="sp-table">
              <thead>
                <tr>
                  <th>Capa</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {activeUsos.map(lid => {
                  const layer = USO_SUELO_LAYERS[lid];
                  if (!layer) return null;
                  const total = stats?.usoSueloCount?.[lid];
                  return (
                    <tr key={lid}>
                      <td>
                        <span className="sp-uba-dot" style={{ background: layer.color }} />
                        {layer.nombre}
                      </td>
                      <td>{total != null ? total.toLocaleString('es-CO') : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* By-UBA breakdown (only when both UBAs and uso suelo are active) */}
      {activeUbas.length > 0 && activeUsos.length > 0 && (
        <div className="sp-section">
          <div className="sp-section-title">
            Establecimientos por UBA
            {loading && <SpinnerIcon />}
          </div>

          {loading ? (
            <p className="sp-loading-text">Calculando conteos...</p>
          ) : (
            UBA_ORDER
              .filter(ubaId => activeUbas.includes(ubaId) && stats?.porUba?.[ubaId])
              .map(ubaId => {
                const ubaStats = stats.porUba[ubaId];
                const entries = Object.entries(ubaStats).filter(([, v]) => v > 0);
                if (!entries.length) return null;
                return (
                  <div key={ubaId} className="sp-uba-block">
                    <div className="sp-uba-title">
                      <span className="sp-uba-dot" style={{ background: UBA_COLORS[ubaId] }} />
                      {UBA_DATA[ubaId].uba}
                    </div>
                    <div className="sp-bars">
                      {entries.map(([lid, count]) => {
                        const layer = USO_SUELO_LAYERS[lid];
                        if (!layer) return null;
                        const pct = Math.round((count / maxCount) * 100);
                        return (
                          <div key={lid} className="sp-bar-row">
                            <span
                              className="sp-bar-dot"
                              style={{ background: layer.color }}
                            />
                            <span className="sp-bar-label">{layer.nombre}</span>
                            <div className="sp-bar-track">
                              <div
                                className="sp-bar-fill"
                                style={{ width: `${pct}%`, background: layer.color }}
                              />
                            </div>
                            <span className="sp-bar-count">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
          )}
        </div>
      )}

      {activeUsos.length === 0 && (
        <div className="sp-hint">
          Activa una capa de uso de suelo para ver el conteo.
        </div>
      )}
    </div>
  );
}
