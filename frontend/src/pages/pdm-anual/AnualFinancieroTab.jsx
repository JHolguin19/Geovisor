import { BarPct } from '../pdm/PdmShared';
import { colorPct } from '../pdm/helpers';

function fmtM(val) {
  const n = parseFloat(val);
  if (isNaN(n) || n === 0) return '$0 M';
  if (n >= 1000) return `$${(n / 1000).toFixed(1)} mil M`;
  return `$${parseInt(n).toLocaleString('es-CO')} M`;
}

function colorFinanciero(pct) {
  if (pct == null) return '#94a3b8';
  const n = parseFloat(pct);
  if (n >= 80) return 'var(--pdm-green)';
  if (n >= 50) return 'var(--pdm-amber)';
  return 'var(--pdm-red)';
}

function ComparativoFinancieroChart({ porAnio, year }) {
  if (!porAnio || !porAnio.length) return null;
  const maxApropia = Math.max(...porAnio.map(d => parseFloat(d.apropiacion_m) || 0), 1);

  return (
    <div className="fin-chart">
      {porAnio.map(d => {
        const aprop = parseFloat(d.apropiacion_m) || 0;
        const comp  = parseFloat(d.comprometido_m) || 0;
        const oblig = parseFloat(d.obligado_m) || 0;
        const pctC  = parseFloat(d.pct_comprometido) || 0;
        const pctO  = parseFloat(d.pct_obligado) || 0;
        const isActive = d.year === year;

        return (
          <div key={d.year} className={`fin-row${isActive ? ' fin-row--active' : ''}`}>
            <div className="fin-year">
              {d.year}
              {isActive && <span className="fin-year-badge">actual</span>}
            </div>

            <div className="fin-bars">
              {/* Barra apropiación */}
              <div className="fin-bar-wrap">
                <div className="fin-bar-label">Apropiación</div>
                <div className="fin-track">
                  <div className="fin-fill fin-fill--aprop"
                    style={{ width: `${(aprop / maxApropia) * 100}%` }} />
                </div>
                <div className="fin-val fin-val--aprop">{fmtM(aprop)}</div>
              </div>

              {/* Barra comprometido */}
              <div className="fin-bar-wrap">
                <div className="fin-bar-label">Comprometido</div>
                <div className="fin-track">
                  <div className="fin-fill"
                    style={{ width: `${(comp / maxApropia) * 100}%`, background: colorFinanciero(pctC) }} />
                </div>
                <div className="fin-val" style={{ color: colorFinanciero(pctC) }}>
                  {fmtM(comp)} <span className="fin-pct">({pctC}%)</span>
                </div>
              </div>

              {/* Barra obligado */}
              <div className="fin-bar-wrap">
                <div className="fin-bar-label">Obligado</div>
                <div className="fin-track">
                  <div className="fin-fill"
                    style={{ width: `${(oblig / maxApropia) * 100}%`, background: colorFinanciero(pctO) }} />
                </div>
                <div className="fin-val" style={{ color: colorFinanciero(pctO) }}>
                  {fmtM(oblig)} <span className="fin-pct">({pctO}%)</span>
                </div>
              </div>
            </div>

            <div className="fin-fisico-col">
              <div className="fin-fisico-label">Avance físico</div>
              <div className="fin-fisico-val" style={{ color: colorPct(parseFloat(d.avance_fisico_pct) || 0) }}>
                {d.avance_fisico_pct != null ? `${d.avance_fisico_pct}%` : '—'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AnualFinancieroTab({ data, year }) {
  if (!data) return <div className="pdm-loading-full">Cargando análisis financiero…</div>;

  const { porAnio, porSecretaria } = data;

  // Datos del año activo
  const anioActivo = porAnio.find(d => d.year === year) || {};
  const aprop   = parseFloat(anioActivo.apropiacion_m)   || 0;
  const comp    = parseFloat(anioActivo.comprometido_m)  || 0;
  const oblig   = parseFloat(anioActivo.obligado_m)      || 0;
  const saldo   = parseFloat(anioActivo.saldo_m)         || 0;
  const pctC    = parseFloat(anioActivo.pct_comprometido) ?? null;
  const pctO    = parseFloat(anioActivo.pct_obligado)     ?? null;
  const avFis   = parseFloat(anioActivo.avance_fisico_pct) ?? null;

  // Total cuatrienio
  const totalAprop = porAnio.reduce((s, d) => s + (parseFloat(d.apropiacion_m) || 0), 0);
  const totalComp  = porAnio.reduce((s, d) => s + (parseFloat(d.comprometido_m) || 0), 0);
  const totalOblig = porAnio.reduce((s, d) => s + (parseFloat(d.obligado_m) || 0), 0);
  const pctTotalC  = totalAprop > 0 ? Math.round(totalComp / totalAprop * 100 * 10) / 10 : 0;
  const pctTotalO  = totalAprop > 0 ? Math.round(totalOblig / totalAprop * 100 * 10) / 10 : 0;

  // Secretarías del año activo
  const secAnio = porSecretaria.filter(s => s.year === year);

  return (
    <>
      {/* KPIs año activo */}
      <section className="pdm-section">
        <h2 className="pdm-section-h">Ejecución presupuestal — {year}</h2>
        <div className="fin-kpi-grid">
          <div className="fin-kpi fin-kpi--dark">
            <div className="fin-kpi-icon">$</div>
            <div className="fin-kpi-body">
              <div className="fin-kpi-label">Total Apropiación</div>
              <div className="fin-kpi-val">{fmtM(aprop)}</div>
              <div className="fin-kpi-sub">Presupuesto asignado {year}</div>
            </div>
          </div>

          <div className="fin-kpi" style={{ borderLeftColor: colorFinanciero(pctC) }}>
            <div className="fin-kpi-icon">≡</div>
            <div className="fin-kpi-body">
              <div className="fin-kpi-label">Neto Registros (Comprometido)</div>
              <div className="fin-kpi-val" style={{ color: colorFinanciero(pctC) }}>{fmtM(comp)}</div>
              {pctC != null && (
                <>
                  <BarPct value={pctC} color={colorFinanciero(pctC)} height={6} />
                  <div className="fin-kpi-pct" style={{ color: colorFinanciero(pctC) }}>{pctC}% de apropiación</div>
                </>
              )}
            </div>
          </div>

          <div className="fin-kpi" style={{ borderLeftColor: colorFinanciero(pctO) }}>
            <div className="fin-kpi-icon">✓</div>
            <div className="fin-kpi-body">
              <div className="fin-kpi-label">Total Obligado</div>
              <div className="fin-kpi-val" style={{ color: colorFinanciero(pctO) }}>{fmtM(oblig)}</div>
              {pctO != null && (
                <>
                  <BarPct value={pctO} color={colorFinanciero(pctO)} height={6} />
                  <div className="fin-kpi-pct" style={{ color: colorFinanciero(pctO) }}>{pctO}% de apropiación</div>
                </>
              )}
            </div>
          </div>

          <div className="fin-kpi fin-kpi--saldo">
            <div className="fin-kpi-icon">⏳</div>
            <div className="fin-kpi-body">
              <div className="fin-kpi-label">Saldo por comprometer</div>
              <div className="fin-kpi-val fin-kpi-val--saldo">{fmtM(saldo)}</div>
              <div className="fin-kpi-sub">Apropiación - Comprometido</div>
            </div>
          </div>
        </div>

        {/* Divergencia físico vs financiero */}
        {avFis != null && pctC != null && (
          <div className="fin-divergencia-banner">
            <div className="fin-div-item">
              <span className="fin-div-label">Avance físico {year}</span>
              <span className="fin-div-val" style={{ color: colorPct(avFis) }}>{avFis}%</span>
            </div>
            <div className="fin-div-sep">vs</div>
            <div className="fin-div-item">
              <span className="fin-div-label">Ejecución comprometida {year}</span>
              <span className="fin-div-val" style={{ color: colorFinanciero(pctC) }}>{pctC}%</span>
            </div>
            {Math.abs(pctC - avFis) > 15 && (
              <div className="fin-div-alert">
                ⚠ Divergencia {Math.abs(pctC - avFis).toFixed(1)} pp — requiere análisis
              </div>
            )}
          </div>
        )}
      </section>

      {/* Comparativo 4 años */}
      <section className="pdm-section">
        <h2 className="pdm-section-h">Comparativo financiero — 2024 al 2027</h2>
        <p className="pdm-section-sub">
          Total cuatrienio: Apropiación <strong>{fmtM(totalAprop)}</strong> · Comprometido <strong style={{ color: colorFinanciero(pctTotalC) }}>{fmtM(totalComp)} ({pctTotalC}%)</strong> · Obligado <strong style={{ color: colorFinanciero(pctTotalO) }}>{fmtM(totalOblig)} ({pctTotalO}%)</strong>
        </p>
        <ComparativoFinancieroChart porAnio={porAnio} year={year} />
      </section>

      {/* Por secretaría */}
      <section className="pdm-section">
        <h2 className="pdm-section-h">Por secretaría — {year}</h2>
        <div className="pdm-table-wrapper">
          <table className="pdm-table">
            <thead>
              <tr>
                <th>Secretaría</th>
                <th className="th-r">Apropiación</th>
                <th className="th-r">Comprometido</th>
                <th className="th-r">Obligado</th>
                <th style={{ minWidth: 140 }}>% Comprometido</th>
                <th style={{ minWidth: 140 }}>% Obligado</th>
              </tr>
            </thead>
            <tbody>
              {secAnio.map(s => {
                const pC = parseFloat(s.pct_comprometido) || 0;
                const apM = parseFloat(s.apropiacion_m) || 0;
                const coM = parseFloat(s.comprometido_m) || 0;
                const obM = parseFloat(s.obligado_m) || 0;
                const pO = apM > 0 ? Math.round(obM / apM * 100 * 10) / 10 : 0;
                return (
                  <tr key={s.secretaria} className="pdm-row">
                    <td className="td-sec-name">{s.secretaria}</td>
                    <td className="th-r td-money">{fmtM(apM)}</td>
                    <td className="th-r td-money" style={{ color: colorFinanciero(pC) }}>{fmtM(coM)}</td>
                    <td className="th-r td-money" style={{ color: colorFinanciero(pO) }}>{fmtM(obM)}</td>
                    <td>
                      <BarPct value={pC} height={7} color={colorFinanciero(pC)} />
                      <span className="pdm-bar-caption" style={{ color: colorFinanciero(pC) }}>{pC}%</span>
                    </td>
                    <td>
                      <BarPct value={pO} height={7} color={colorFinanciero(pO)} />
                      <span className="pdm-bar-caption" style={{ color: colorFinanciero(pO) }}>{pO}%</span>
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
