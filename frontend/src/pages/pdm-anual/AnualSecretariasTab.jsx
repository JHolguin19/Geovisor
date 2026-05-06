import { BarPct } from '../pdm/PdmShared';
import { pct, colorPct } from '../pdm/helpers';

function fmtM(val) {
  const n = parseFloat(val);
  if (isNaN(n) || n === 0) return '$0 M';
  if (n >= 1000) return `$${(n / 1000).toFixed(1)} mil M`;
  return `$${parseInt(n).toLocaleString('es-CO')} M`;
}

function fmtNum(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '—';
  return n.toLocaleString('es-CO', { maximumFractionDigits: 1 });
}

export default function AnualSecretariasTab({ data, year, onSecretariaClick }) {
  if (!data || !data.length) return <div className="pdm-loading-full">Sin datos de secretarías para {year}</div>;

  return (
    <section className="pdm-table-section">
      <div className="pdm-table-header">
        <span className="pdm-table-count">{data.length} secretarías — año {year}</span>
        <span className="pdm-table-hint">Clic en una fila para filtrar metas</span>
      </div>
      <div className="pdm-table-wrapper">
        <table className="pdm-table">
          <thead>
            <tr>
              <th>Secretaría</th>
              <th className="th-c">Programadas</th>
              <th className="th-c">NP</th>
              <th style={{ minWidth: 120 }}>Avance físico</th>
              <th style={{ minWidth: 120 }}>Eficiencia {year}</th>
              <th className="th-c" style={{ minWidth: 140 }}>Físico {year} (prog./real.)</th>
              <th className="th-r">Total Apropiación</th>
              <th className="th-r">Neto Registros</th>
              <th className="th-c" style={{ color: 'var(--pdm-blue)' }}>% Registro</th>
              <th className="th-c">Semáforo</th>
            </tr>
          </thead>
          <tbody>
            {data.map(s => {
              const avFisico = parseFloat(s.avance_fisico_pct) || 0;
              const eff = parseFloat(s.eficiencia_promedio) || 0;
              const pdm = parseFloat(s.sum_meta_pdm) || 0;
              const fisica = parseFloat(s.sum_meta_fisica) || 0;
              const programadas = parseInt(s.programadas) || 0;
              // (Actual / Planned) × 100 / number of goals in the department
              const pctFisico = (pdm > 0 && programadas > 0)
                ? parseFloat((fisica / pdm * 100 / programadas).toFixed(1))
                : 0;
              const apropia = parseFloat(s.apropiacion_m) || 0;
              const registro = parseFloat(s.comprometido_m) || 0;
              const pctReg = apropia > 0 ? Math.round(registro / apropia * 100) : 0;
              return (
                <tr key={s.secretaria} className="pdm-row" onClick={() => onSecretariaClick?.(s.secretaria)}>
                  <td className="td-sec-name">{s.secretaria}</td>
                  <td className="th-c">{s.programadas}</td>
                  <td className="th-c">{s.no_programadas}</td>
                  <td>
                    <BarPct value={avFisico} height={7} />
                    <span className="pdm-bar-caption" style={{ color: colorPct(avFisico) }}>{pct(avFisico)}</span>
                  </td>
                  <td>
                    <BarPct value={eff} height={7} />
                    <span className="pdm-bar-caption" style={{ color: colorPct(eff) }}>{pct(eff)}</span>
                  </td>
                  <td className="th-c" style={{ fontSize: 12 }}>
                    <span style={{ color: 'var(--pdm-muted)' }}>{fmtNum(pdm)}</span>
                    {' / '}
                    <strong style={{ color: colorPct(pctFisico) }}>{fmtNum(fisica)}</strong>
                    <div style={{ fontSize: 11, color: colorPct(pctFisico), fontWeight: 700 }}>{pctFisico}%</div>
                  </td>
                  <td className="th-r td-money">{fmtM(s.apropiacion_m)}</td>
                  <td className="th-r td-money">{fmtM(s.comprometido_m)}</td>
                  <td className="th-c">
                    <span className="tray-eff-chip" style={{ color: colorPct(pctReg), background: colorPct(pctReg) + '18' }}>
                      {pctReg}%
                    </span>
                  </td>
                  <td className="th-c">
                    <div className="pdm-a-semaforo-chips">
                      {parseInt(s.semaforo_verde) > 0 && <span className="chip-alta">{s.semaforo_verde}</span>}
                      {parseInt(s.semaforo_amarillo) > 0 && <span className="chip-media">{s.semaforo_amarillo}</span>}
                      {parseInt(s.semaforo_rojo) > 0 && <span className="chip-baja">{s.semaforo_rojo}</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
