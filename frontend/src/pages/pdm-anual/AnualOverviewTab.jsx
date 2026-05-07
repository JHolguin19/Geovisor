import { Gauge, BarPct } from '../pdm/PdmShared';
import { pct, colorPct } from '../pdm/helpers';
import { DonutChart, HBarChart } from './AnualCharts';

function fmtM(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '—';
  if (n >= 1000) return `$${(n / 1000).toFixed(1)} mil M`;
  return `$${n.toLocaleString('es-CO')} M`;
}

function fmtNum(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '—';
  return n.toLocaleString('es-CO', { maximumFractionDigits: 1 });
}

function ComparativoChart({ comparativo, year }) {
  if (!comparativo || comparativo.length === 0) return null;

  const maxVal = Math.max(...comparativo.flatMap(d => [
    parseFloat(d.pct_esperado) || 0,
    parseFloat(d.pct_realizado) || 0,
  ]), 1);

  return (
    <div className="pdm-comp-chart">
      {comparativo.map(d => {
        const esp = parseFloat(d.pct_esperado) || 0;
        const real = parseFloat(d.pct_realizado) || 0;
        const pctCumpl = esp > 0 ? Math.round(real / esp * 100) : 0;
        const colReal = pctCumpl >= 80 ? 'var(--pdm-green)' : pctCumpl >= 50 ? 'var(--pdm-amber)' : 'var(--pdm-red)';
        const isActive = d.year === year;

        return (
          <div key={d.year} className={`pdm-comp-row${isActive ? ' pdm-comp-row--active' : ''}`}>
            <div className="pdm-comp-year">{d.year}{isActive && <span className="pdm-comp-year-badge">actual</span>}</div>
            <div className="pdm-comp-bars">
              <div className="pdm-comp-bar-wrap">
                <div className="pdm-comp-bar-label">Esperado</div>
                <div className="pdm-comp-track">
                  <div className="pdm-comp-fill pdm-comp-fill--esp"
                    style={{ width: `${(esp / maxVal) * 100}%` }} />
                </div>
                <div className="pdm-comp-val">{esp}%</div>
              </div>
              <div className="pdm-comp-bar-wrap">
                <div className="pdm-comp-bar-label">Realizado</div>
                <div className="pdm-comp-track">
                  <div className="pdm-comp-fill"
                    style={{ width: `${(real / maxVal) * 100}%`, background: colReal }} />
                </div>
                <div className="pdm-comp-val" style={{ color: colReal }}>{real}%</div>
              </div>
            </div>
            <div className="pdm-comp-cumpl" style={{ color: colReal }}>
              {esp > 0 ? `${pctCumpl}%` : '—'}
              <span className="pdm-comp-cumpl-sub">cumplimiento</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AnualOverviewTab({ data, year, divergencia, comparativo, onMetaClick }) {
  if (!data) return <div className="pdm-loading-full">Cargando datos del año {year}…</div>;

  const d = data;
  const total = parseInt(d.total_metas) || 0;
  const programadas = parseInt(d.programadas) || 0;
  const np = parseInt(d.no_programadas) || 0;
  const sinEjec = parseInt(d.sin_ejecucion) || 0;
  const verde = parseInt(d.semaforo_verde) || 0;
  const amarillo = parseInt(d.semaforo_amarillo) || 0;
  const rojo = parseInt(d.semaforo_rojo) || 0;
  const sinDato = parseInt(d.semaforo_sin_dato) || 0;

  const pctOf = (n) => total > 0 ? `${Math.round(n / total * 100)}%` : '—';

  // eficiencia_promedio is already capped in the backend
  const eficiencia_cap = d.eficiencia_promedio;

  return (
    <>
      {/* Section 1 — Métricas principales */}
      <section className="pdm-section">
        <h2 className="pdm-section-h">Métricas principales — {year}</h2>
        <div className="pdm-a-main-metrics">
          {/* Big KPI: Eficiencia year */}
          <div className="pdm-main-kpi" style={{ borderColor: colorPct(eficiencia_cap) }}>
            <div className="pdm-main-kpi-val" style={{ color: colorPct(eficiencia_cap) }}>{eficiencia_cap != null ? `${eficiencia_cap}%` : '—'}</div>
            <div className="pdm-main-kpi-label">Eficiencia física {year}</div>
            <div className="pdm-main-kpi-sub">Promedio meta_fisica / meta_pdm (máx. 100%)</div>
          </div>
          {/* Big KPI: Avance físico year */}
          <div className="pdm-main-kpi" style={{ borderColor: colorPct(d.avance_fisico_anio_pct) }}>
            <div className="pdm-main-kpi-val" style={{ color: colorPct(d.avance_fisico_anio_pct) }}>{d.avance_fisico_anio_pct != null ? `${d.avance_fisico_anio_pct}%` : '—'}</div>
            <div className="pdm-main-kpi-label">Av. Físico {year}</div>
            <div className="pdm-main-kpi-sub">MIN(realizado, planificado) / meta cuatrienio × 100</div>
          </div>
          {/* Big KPI: Avance cuatrienio */}
          <div className="pdm-main-kpi" style={{ borderColor: colorPct(d.avance_fisico_pct) }}>
            <div className="pdm-main-kpi-val" style={{ color: colorPct(d.avance_fisico_pct) }}>{d.avance_fisico_pct != null ? `${d.avance_fisico_pct}%` : '—'}</div>
            <div className="pdm-main-kpi-label">Avance físico cuatrienio</div>
            <div className="pdm-main-kpi-sub">Progreso acumulado 2024–2027</div>
          </div>
          {/* Big KPI: Avance financiero comprometido */}
          <div className="pdm-main-kpi" style={{ borderColor: colorPct(d.avance_financiero_comprometido_pct) }}>
            <div className="pdm-main-kpi-val" style={{ color: colorPct(d.avance_financiero_comprometido_pct) }}>{d.avance_financiero_comprometido_pct != null ? `${d.avance_financiero_comprometido_pct}%` : '—'}</div>
            <div className="pdm-main-kpi-label">Avance financiero {year}</div>
            <div className="pdm-main-kpi-sub">Comprometido / Apropiación</div>
          </div>
          {/* Big KPI: Avance financiero obligado */}
          <div className="pdm-main-kpi" style={{ borderColor: colorPct(d.avance_financiero_obligado_pct) }}>
            <div className="pdm-main-kpi-val" style={{ color: colorPct(d.avance_financiero_obligado_pct) }}>{d.avance_financiero_obligado_pct != null ? `${d.avance_financiero_obligado_pct}%` : '—'}</div>
            <div className="pdm-main-kpi-label">Ejecución obligado {year}</div>
            <div className="pdm-main-kpi-sub">Obligado / Apropiación</div>
          </div>
        </div>
        {/* Metas chips row */}
        <div className="pdm-meta-chips">
          <div className="pdm-meta-chip pdm-meta-chip--blue"><span>{programadas}</span> Programadas</div>
          <div className="pdm-meta-chip pdm-meta-chip--gray"><span>{np}</span> No programadas</div>
          <div className="pdm-meta-chip pdm-meta-chip--red"><span>{sinEjec}</span> Sin ejecución</div>
          <div className="pdm-meta-chip pdm-meta-chip--purple"><span>{d.activas_con_presupuesto}</span> Con presupuesto</div>
        </div>
      </section>

      {/* Section 2 — Semáforo */}
      <section className="pdm-section">
        <h2 className="pdm-section-h">Semáforo de eficiencia</h2>
        <div className="pdm-a-semaforo-grid">
          {[
            { label: 'En meta', n: verde, cls: 'alta', desc: 'Eficiencia ≥ 80%' },
            { label: 'Alerta', n: amarillo, cls: 'media', desc: 'Eficiencia 50–79%' },
            { label: 'Crítica', n: rojo, cls: 'baja', desc: 'Eficiencia < 50%' },
          ].map(s => (
            <div key={s.cls} className={`pdm-estado-card pdm-estado-${s.cls}`}>
              <div className="pdm-ec-num">{s.n}</div>
              <div className="pdm-ec-label">{s.label}</div>
              <div className="pdm-ec-desc">{s.desc}</div>
              <div className="pdm-ec-pct">{pctOf(s.n)}</div>
            </div>
          ))}
        </div>
        <div className="pdm-a-charts-row">
          <DonutChart segments={[
            { value: programadas - sinEjec, color: 'var(--pdm-blue)' },
            { value: sinEjec, color: 'var(--pdm-red)' },
            { value: np, color: '#cbd5e1' },
          ]} />
          <div className="pdm-a-donut-legend">
            <span><i style={{ background: 'var(--pdm-blue)' }} /> Con ejecución ({programadas - sinEjec})</span>
            <span><i style={{ background: 'var(--pdm-red)' }} /> Sin ejecución ({sinEjec})</span>
            <span><i style={{ background: '#cbd5e1' }} /> No programadas ({np})</span>
          </div>
          <HBarChart bars={[
            { label: 'En meta', value: verde, color: 'var(--pdm-green)' },
            { label: 'Alerta', value: amarillo, color: 'var(--pdm-amber)' },
            { label: 'Crítica', value: rojo, color: 'var(--pdm-red)' },
          ]} />
        </div>
      </section>

      {/* Section 3 — Avance por año */}
      <section className="pdm-section">
        <h2 className="pdm-section-h">Esperado vs Realizado — todos los años</h2>
        <div className="pdm-anio-kpis">
          <div className="pdm-anio-kpi" style={{ borderLeftColor: 'var(--pdm-blue)' }}>
            <div style={{ color: 'var(--pdm-blue)', fontSize: 22, fontWeight: 800 }}>{d.pct_programado_del_cuatrienio != null ? `${d.pct_programado_del_cuatrienio}%` : '—'}</div>
            <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>% cuatrienio programado en {year}</div>
          </div>
          <div className="pdm-anio-kpi" style={{ borderLeftColor: colorPct(d.avance_fisico_anio_pct) }}>
            <div style={{ color: colorPct(d.avance_fisico_anio_pct), fontSize: 22, fontWeight: 800 }}>{d.avance_fisico_anio_pct != null ? `${d.avance_fisico_anio_pct}%` : '—'}</div>
            <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>Av. físico realizado {year}</div>
            <div style={{ fontSize: 11, color: 'var(--pdm-muted)', marginTop: 2 }}>MIN(realizado, planificado) / meta cuatrienio</div>
          </div>
        </div>
        <ComparativoChart comparativo={comparativo} year={year} />
      </section>

      {/* Section 4 — Presupuesto */}
      <section className="pdm-section">
        <h2 className="pdm-section-h">Presupuesto {year}</h2>
        <div className="pdm-a-budget-row">
          {[
            { label: 'Total Apropiación', sublabel: 'Presupuesto asignado', value: d.apropiacion_m, color: '#1a2332', icon: '$', pct: null },
            { label: 'Total Registro', sublabel: 'Presupuesto comprometido', value: d.comprometido_m, color: 'var(--pdm-blue)', icon: '≡', pct: parseFloat(d.apropiacion_m) > 0 ? Math.round(parseFloat(d.comprometido_m) / parseFloat(d.apropiacion_m) * 100) : 0 },
            { label: 'Total Obligado', sublabel: 'Dinero consignado', value: d.obligado_m, color: 'var(--pdm-purple)', icon: '✓', pct: parseFloat(d.apropiacion_m) > 0 ? Math.round(parseFloat(d.obligado_m) / parseFloat(d.apropiacion_m) * 100) : 0 },
          ].map(b => (
            <div key={b.label} className="pdm-budget-card" style={{ borderLeftColor: b.color }}>
              <div className="pdm-bc-icon">{b.icon}</div>
              <div className="pdm-bc-body">
                <div className="pdm-bc-label">{b.label}</div>
                <div className="pdm-bc-sublabel" style={{ fontSize: 11, color: 'var(--pdm-muted)' }}>{b.sublabel}</div>
                <div className="pdm-bc-value">{fmtM(b.value)}</div>
                {b.pct != null && (
                  <>
                    <BarPct value={b.pct} color={b.color} height={6} />
                    <div className="pdm-bc-pct" style={{ color: b.color }}>{b.pct}% de apropiación</div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 5 — Alertas Divergencia */}
      {divergencia && divergencia.length > 0 && (
        <section className="pdm-section">
          <h2 className="pdm-section-h">
            Alertas — Divergencia físico-financiero
            <span className="pdm-section-badge pdm-section-badge--warn">{divergencia.length}</span>
          </h2>
          <p className="pdm-section-sub">
            Metas donde el presupuesto comprometido (Total Registro) supera significativamente el avance físico — requieren justificación ante Contraloría. Clic en una fila para ver detalle.
          </p>
          <div className="pdm-table-wrapper">
            <table className="pdm-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Secretaría</th>
                  <th>Descripción</th>
                  <th className="th-c">Avance Físico</th>
                  <th className="th-c">Total Registro %</th>
                  <th className="th-c" style={{ color: 'var(--pdm-red)' }}>Divergencia</th>
                  <th className="th-r">Comprometido M$</th>
                </tr>
              </thead>
              <tbody>
                {divergencia.map(r => (
                  <tr
                    key={r.meta_num}
                    className="pdm-row pdm-row--clickable"
                    onClick={() => onMetaClick && onMetaClick(r.id)}
                    style={{ cursor: 'pointer' }}
                    title="Clic para ver detalle"
                  >
                    <td className="td-meta-num">{r.meta_num}</td>
                    <td style={{ fontSize: 12 }}>{r.secretaria}</td>
                    <td style={{ fontSize: 12, maxWidth: 260 }} title={r.descripcion_meta}>{r.descripcion_meta}</td>
                    <td className="th-c">
                      <span className="tray-eff-chip" style={{ color: colorPct(parseFloat(r.avance_fisico_anio_pct) || 0), background: colorPct(parseFloat(r.avance_fisico_anio_pct) || 0) + '18' }}>
                        {r.avance_fisico_anio_pct != null ? r.avance_fisico_anio_pct + '%' : '—'}
                      </span>
                    </td>
                    <td className="th-c">
                      <span className="tray-eff-chip" style={{ color: 'var(--pdm-blue)', background: 'var(--pdm-blue)18' }}>
                        {r.ejec_comprometida_pct != null ? r.ejec_comprometida_pct + '%' : '—'}
                      </span>
                    </td>
                    <td className="th-c">
                      <span className="chip-baja">+{r.divergencia_pct}%</span>
                    </td>
                    <td className="th-r td-money">${parseFloat(r.comprometido_m).toFixed(2)} M</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
