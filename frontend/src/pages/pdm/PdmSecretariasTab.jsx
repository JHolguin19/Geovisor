import { BarPct } from './PdmShared';
import { pct, colorPct } from './helpers';

export default function PdmSecretariasTab({ secretarias, onSecretariaClick }) {
  return (
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
              <tr key={s.secretaria} className="pdm-row" onClick={() => onSecretariaClick(s.secretaria)}>
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
                    ? `$${(s.presupuesto_m / 1000).toFixed(1)} mil M`
                    : `$${parseInt(s.presupuesto_m).toLocaleString('es-CO')} M`}
                </td>
                <td className="th-r td-money">
                  {parseFloat(s.comprometido_m) >= 1000
                    ? `$${(s.comprometido_m / 1000).toFixed(1)} mil M`
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
  );
}
