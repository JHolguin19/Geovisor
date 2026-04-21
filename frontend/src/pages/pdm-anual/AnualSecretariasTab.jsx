import { BarPct } from '../pdm/PdmShared';
import { pct, colorPct } from '../pdm/helpers';

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
              <th style={{ minWidth: 140 }}>Eficiencia</th>
              <th className="th-r">Apropiación</th>
              <th className="th-r">Comprometido</th>
              <th className="th-c">Semáforo</th>
            </tr>
          </thead>
          <tbody>
            {data.map(s => {
              const eff = parseFloat(s.eficiencia_promedio) || 0;
              return (
                <tr key={s.secretaria} className="pdm-row" onClick={() => onSecretariaClick?.(s.secretaria)}>
                  <td className="td-sec-name">{s.secretaria}</td>
                  <td className="th-c">{s.programadas}</td>
                  <td className="th-c">{s.no_programadas}</td>
                  <td>
                    <BarPct value={eff} height={7} />
                    <span className="pdm-bar-caption" style={{ color: colorPct(eff) }}>{pct(eff)}</span>
                  </td>
                  <td className="th-r td-money">
                    {parseFloat(s.apropiacion_m) >= 1000
                      ? `$${(s.apropiacion_m / 1000).toFixed(1)} mil M`
                      : `$${parseInt(s.apropiacion_m).toLocaleString('es-CO')} M`}
                  </td>
                  <td className="th-r td-money">
                    {parseFloat(s.comprometido_m) >= 1000
                      ? `$${(s.comprometido_m / 1000).toFixed(1)} mil M`
                      : `$${parseInt(s.comprometido_m).toLocaleString('es-CO')} M`}
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
