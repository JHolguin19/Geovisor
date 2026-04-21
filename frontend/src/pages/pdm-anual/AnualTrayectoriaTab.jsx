import { BarPct } from '../pdm/PdmShared';
import { colorPct, pct } from '../pdm/helpers';

function EfYear({ val }) {
  if (val == null) return <span className="tray-nd">—</span>;
  const n = parseFloat(val);
  return (
    <span className="tray-eff-chip" style={{ color: colorPct(n), background: colorPct(n) + '18' }}>
      {n.toFixed(1)}%
    </span>
  );
}

function SemaforoBar({ verde, amarillo, rojo, total }) {
  const t = (parseInt(verde)||0) + (parseInt(amarillo)||0) + (parseInt(rojo)||0) || 1;
  const pV = Math.round((parseInt(verde)||0)/t*100);
  const pA = Math.round((parseInt(amarillo)||0)/t*100);
  const pR = Math.round((parseInt(rojo)||0)/t*100);
  return (
    <div className="tray-sbar-wrap" title={`Verde: ${verde} | Amarillo: ${amarillo} | Rojo: ${rojo}`}>
      <div className="tray-sbar">
        {pV > 0 && <div className="tray-sbar-seg tray-sbar-v" style={{ width: pV + '%' }} />}
        {pA > 0 && <div className="tray-sbar-seg tray-sbar-a" style={{ width: pA + '%' }} />}
        {pR > 0 && <div className="tray-sbar-seg tray-sbar-r" style={{ width: pR + '%' }} />}
      </div>
    </div>
  );
}

export default function AnualTrayectoriaTab({ data, onExport, exportLoading }) {
  if (!data) return <div className="pdm-loading-full">Cargando seguimiento cuatrienal…</div>;

  const { global: g, pilares, secretarias } = data;

  const pctCuatr = parseFloat(g.pct_cuatrienio) || 0;
  const total = parseInt(g.total_metas) || 0;

  return (
    <>
      {/* ── KPIs globales ── */}
      <section className="pdm-section">
        <div className="tray-header">
          <h2 className="pdm-section-h">Trayectoria cuatrienal 2024–2027</h2>
          <button
            className="tray-export-btn"
            onClick={onExport}
            disabled={exportLoading}
          >
            {exportLoading ? 'Generando…' : '⬇ Descargar reporte Excel'}
          </button>
        </div>

        {/* Barra de progreso global */}
        <div className="tray-global-bar-wrap">
          <div className="tray-global-bar-labels">
            <span className="tray-global-pct" style={{ color: colorPct(pctCuatr) }}>
              {pctCuatr != null ? pctCuatr.toFixed(1) + '%' : '—'}
            </span>
            <span className="tray-global-sub">Cumplimiento cuatrienal promedio</span>
          </div>
          <BarPct value={pctCuatr} height={14} color={colorPct(pctCuatr)} />
          <div className="tray-global-legend">
            <span className="tray-gl-item tray-gl-v">En meta: {g.en_meta}</span>
            <span className="tray-gl-item tray-gl-a">En riesgo: {g.en_riesgo}</span>
            <span className="tray-gl-item tray-gl-r">Crítico: {g.critico}</span>
            <span className="tray-gl-item tray-gl-nd">Sin dato: {g.sin_dato}</span>
          </div>
        </div>

        {/* Eficiencia promedio por año */}
        <div className="tray-year-chips-row">
          {[['2024', g.eff_2024], ['2025', g.eff_2025], ['2026', g.eff_2026], ['2027', g.eff_2027]].map(([yr, val]) => (
            <div key={yr} className="tray-year-chip">
              <div className="tray-year-label">{yr}</div>
              <div className="tray-year-val" style={{ color: val != null ? colorPct(parseFloat(val)) : '#94a3b8' }}>
                {val != null ? parseFloat(val).toFixed(1) + '%' : '—'}
              </div>
              <div className="tray-year-sub">eficiencia</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Por pilar ── */}
      <section className="pdm-section">
        <h2 className="pdm-section-h">Avance por pilar — cuatrienio</h2>
        <div className="tray-pilares-grid">
          {pilares.map(p => {
            const pc = parseFloat(p.pct_cuatrienio) || 0;
            return (
              <div key={p.num_pilar} className="tray-pilar-card">
                <div className="tray-pc-header">
                  <span className="tray-pc-num">Pilar {p.num_pilar}</span>
                  {parseInt(p.en_riesgo) > 0 && (
                    <span className="tray-pc-alert">{p.en_riesgo} en riesgo</span>
                  )}
                </div>
                <div className="tray-pc-name">{p.nom_pilar}</div>
                <div className="tray-pc-pct" style={{ color: colorPct(pc) }}>
                  {pc != null ? pc.toFixed(1) + '%' : '—'}
                </div>
                <BarPct value={pc} height={8} color={colorPct(pc)} />
                <div className="tray-pc-years">
                  {[['24', p.eff_2024], ['25', p.eff_2025], ['26', p.eff_2026], ['27', p.eff_2027]].map(([yr, v]) => (
                    <div key={yr} className="tray-pc-yr">
                      <span className="tray-pc-yr-label">{yr}</span>
                      <span className="tray-pc-yr-val" style={{ color: v != null ? colorPct(parseFloat(v)) : '#cbd5e1' }}>
                        {v != null ? parseFloat(v).toFixed(0) + '%' : '—'}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="tray-pc-meta">{p.total_metas} metas · ${parseInt(p.total_apropiacion_m||0).toLocaleString('es-CO')} M</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Comparativo interanual por secretaría ── */}
      <section className="pdm-section">
        <h2 className="pdm-section-h">Comparativo interanual por secretaría</h2>
        <p className="pdm-section-sub">Eficiencia física promedio por año (realizado / meta programada)</p>
        <div className="pdm-table-wrapper">
          <table className="pdm-table tray-comp-table">
            <thead>
              <tr>
                <th>Secretaría</th>
                <th className="th-c">Metas</th>
                <th className="th-c">2024</th>
                <th className="th-c">2025</th>
                <th className="th-c">2026</th>
                <th className="th-c">2027</th>
                <th style={{ minWidth: 130 }}>Cuatrienio</th>
                <th className="th-c">Riesgo</th>
              </tr>
            </thead>
            <tbody>
              {secretarias.map(s => {
                const pc = parseFloat(s.pct_cuatrienio) || 0;
                return (
                  <tr key={s.secretaria}>
                    <td className="td-sec-name">{s.secretaria}</td>
                    <td className="th-c">{s.total_metas}</td>
                    <td className="th-c"><EfYear val={s.eff_2024} /></td>
                    <td className="th-c"><EfYear val={s.eff_2025} /></td>
                    <td className="th-c"><EfYear val={s.eff_2026} /></td>
                    <td className="th-c"><EfYear val={s.eff_2027} /></td>
                    <td>
                      <BarPct value={pc} height={6} color={colorPct(pc)} />
                      <span className="pdm-bar-caption" style={{ color: colorPct(pc) }}>{pct(pc)}</span>
                    </td>
                    <td className="th-c">
                      {parseInt(s.en_riesgo) > 0
                        ? <span className="chip-baja">{s.en_riesgo}</span>
                        : <span className="chip-alta">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
