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

function CompBar({ label, programado, realizado, unit = '' }) {
  const p = parseFloat(programado) || 0;
  const r = parseFloat(realizado) || 0;
  const pct = p > 0 ? Math.min(Math.round(r / p * 100), 100) : 0;
  const color = pct >= 80 ? 'var(--pdm-green)' : pct >= 50 ? 'var(--pdm-amber)' : 'var(--pdm-red)';
  return (
    <div className="pdm-compbar">
      <div className="pdm-compbar-header">
        <span className="pdm-compbar-label">{label}</span>
        <span className="pdm-compbar-pct" style={{ color }}>{pct}%</span>
      </div>
      <div className="pdm-compbar-track">
        <div className="pdm-compbar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="pdm-compbar-vals">
        <span>Programado: <strong>{fmtNum(programado)}{unit}</strong></span>
        <span>Realizado: <strong>{fmtNum(realizado)}{unit}</strong></span>
      </div>
    </div>
  );
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
        const pctCumpl = esp > 0 ? Math.min(Math.round(real / esp * 100), 999) : 0;
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

export default function AnualOverviewTab({ data, year, divergencia, comparativo }) {
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

  return (
    <>
      {/* KPI cards */}
      <section className="pdm-section">
        <h2 className="pdm-section-h">Indicadores clave — {year}</h2>
        <div className="pdm-a-kpi-grid">
          {[
            { label: 'Programadas', value: programadas, color: 'var(--pdm-blue)', sub: `de ${total} metas` },
            { label: 'No Programadas', value: np, color: 'var(--pdm-gray)', sub: 'sin meta este año' },
            { label: 'Con presupuesto', value: d.activas_con_presupuesto, color: 'var(--pdm-purple)', sub: 'programadas + recursos' },
            { label: 'Sin ejecución', value: sinEjec, color: 'var(--pdm-red)', sub: 'programadas sin avance' },
          ].map(kpi => (
            <div key={kpi.label} className="pdm-a-kpi-card" style={{ borderLeftColor: kpi.color }}>
              <div className="pdm-a-kpi-value" style={{ color: kpi.color }}>{kpi.value}</div>
              <div className="pdm-a-kpi-label">{kpi.label}</div>
              <div className="pdm-a-kpi-sub">{kpi.sub}</div>
            </div>
          ))}
          <div className="pdm-a-kpi-card pdm-a-kpi-card--eff" style={{ borderLeftColor: colorPct(d.avance_fisico_pct) }}>
            <div className="pdm-a-kpi-value" style={{ color: colorPct(d.avance_fisico_pct) }}>
              {d.avance_fisico_pct != null ? `${d.avance_fisico_pct}%` : '—'}
            </div>
            <div className="pdm-a-kpi-label">Avance físico cuatrienio</div>
            <div className="pdm-a-kpi-sub">progreso acumulado 4 años</div>
          </div>
          <div className="pdm-a-kpi-card" style={{ borderLeftColor: colorPct(d.avg_ponderado_anio) }}>
            <div className="pdm-a-kpi-value" style={{ color: colorPct(d.avg_ponderado_anio) }}>
              {d.avg_ponderado_anio != null ? `${d.avg_ponderado_anio}%` : '—'}
            </div>
            <div className="pdm-a-kpi-label">Avance físico {year}</div>
            <div className="pdm-a-kpi-sub">contribución de {year} al cuatrienio</div>
          </div>
          <div className="pdm-a-kpi-card" style={{ borderLeftColor: colorPct(d.eficiencia_promedio) }}>
            <div className="pdm-a-kpi-value" style={{ color: colorPct(d.eficiencia_promedio) }}>
              {d.eficiencia_promedio != null ? `${d.eficiencia_promedio}%` : '—'}
            </div>
            <div className="pdm-a-kpi-label">Eficiencia {year}</div>
            <div className="pdm-a-kpi-sub">física / programada año</div>
          </div>
        </div>
      </section>

      {/* Semáforo */}
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

      {/* Avance físico del año — Ponderado + Unidades */}
      <section className="pdm-section">
        <h2 className="pdm-section-h">Avance físico {year} — Programado vs Realizado</h2>
        <p className="pdm-section-sub">
          <strong>Avance físico {year}:</strong> cuánto contribuyó cada meta al cuatrienio en {year}.
          Programado = meta_pdm_{year} / meta_cuatrienio · Realizado = meta_fisica_{year} / meta_cuatrienio.
        </p>
        <div className="pdm-pond-kpis">
          <div className="pdm-pond-kpi" style={{ borderLeftColor: 'var(--pdm-blue)' }}>
            <div className="pdm-pond-kpi-val" style={{ color: 'var(--pdm-blue)' }}>
              {d.pct_programado_del_cuatrienio != null ? `${d.pct_programado_del_cuatrienio}%` : '—'}
            </div>
            <div className="pdm-pond-kpi-label">% del cuatrienio programado {year}</div>
            <div className="pdm-pond-kpi-sub">Σ meta_pdm_{year} / Σ meta_cuatrienio</div>
          </div>
          <div className="pdm-pond-kpi" style={{ borderLeftColor: colorPct(d.avg_ponderado_anio) }}>
            <div className="pdm-pond-kpi-val" style={{ color: colorPct(d.avg_ponderado_anio) }}>
              {d.avg_ponderado_anio != null ? `${d.avg_ponderado_anio}%` : '—'}
            </div>
            <div className="pdm-pond-kpi-label">Avance físico realizado {year}</div>
            <div className="pdm-pond-kpi-sub">Promedio ponderado_avance_{year}</div>
          </div>
        </div>
        <CompBar
          label={`Unidades programadas vs ejecutadas — ${year}`}
          programado={d.sum_meta_pdm}
          realizado={d.sum_meta_fisica}
          unit=" uds"
        />
      </section>

      {/* Comparativo esperado vs realizado — todos los años */}
      <section className="pdm-section">
        <h2 className="pdm-section-h">
          Esperado vs Realizado por año
          <span className="pdm-section-badge" style={{ background: 'var(--pdm-blue)18', color: 'var(--pdm-blue)' }}>cuatrienio</span>
        </h2>
        <p className="pdm-section-sub">
          Para cada año: <strong>Esperado</strong> = % del plan cuatrienal programado ese año ·
          <strong> Realizado</strong> = avance físico real ese año (ponderado sobre el cuatrienio).
          El porcentaje de cumplimiento compara lo realizado con lo esperado.
        </p>
        <ComparativoChart comparativo={comparativo} year={year} />
      </section>

      {/* Avance financiero vs programado — año */}
      <section className="pdm-section">
        <h2 className="pdm-section-h">Avance financiero {year} — Total Apropiación vs Registro</h2>
        <p className="pdm-section-sub">
          Programado (Total Apropiación) vs ejecutado (Neto Registros y Obligado) en millones de pesos.
        </p>
        <CompBar
          label="Total Apropiación vs Neto Registros"
          programado={d.apropiacion_m}
          realizado={d.comprometido_m}
          unit=" M$"
        />
        <CompBar
          label="Total Apropiación vs Obligado"
          programado={d.apropiacion_m}
          realizado={d.obligado_m}
          unit=" M$"
        />
        <div className="pdm-a-budget-row" style={{ marginTop: '1rem' }}>
          {[
            { label: 'Total Apropiación', value: d.apropiacion_m, color: '#1a2332', icon: '$' },
            { label: 'Neto Registros', value: d.comprometido_m, color: 'var(--pdm-blue)', icon: '≡' },
            { label: 'Obligado', value: d.obligado_m, color: 'var(--pdm-purple)', icon: '✓' },
          ].map(b => {
            const pctVal = parseFloat(d.apropiacion_m) > 0
              ? Math.round(parseFloat(b.value) / parseFloat(d.apropiacion_m) * 100)
              : 0;
            return (
              <div key={b.label} className="pdm-budget-card" style={{ borderLeftColor: b.color }}>
                <div className="pdm-bc-icon">{b.icon}</div>
                <div className="pdm-bc-body">
                  <div className="pdm-bc-label">{b.label}</div>
                  <div className="pdm-bc-value">{fmtM(b.value)}</div>
                  {b.label !== 'Total Apropiación' && (
                    <>
                      <BarPct value={pctVal} color={b.color} height={6} />
                      <div className="pdm-bc-pct" style={{ color: b.color }}>{pctVal}% de apropiación</div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Alertas divergencia físico-financiero */}
      {divergencia && divergencia.length > 0 && (
        <section className="pdm-section">
          <h2 className="pdm-section-h">
            Alertas — Divergencia físico-financiero
            <span className="pdm-section-badge pdm-section-badge--warn">{divergencia.length}</span>
          </h2>
          <p className="pdm-section-sub">
            Metas donde la ejecución financiera supera significativamente el avance físico — requieren justificación ante Contraloría.
          </p>
          <div className="pdm-table-wrapper">
            <table className="pdm-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Secretaría</th>
                  <th>Descripción</th>
                  <th className="th-c">Ef. Física</th>
                  <th className="th-c">Ef. Financiera</th>
                  <th className="th-c" style={{ color: 'var(--pdm-red)' }}>Divergencia</th>
                  <th className="th-r">Obligado M$</th>
                </tr>
              </thead>
              <tbody>
                {divergencia.map(r => (
                  <tr key={r.meta_num} className="pdm-row">
                    <td className="td-meta-num">{r.meta_num}</td>
                    <td style={{ fontSize: 12 }}>{r.secretaria}</td>
                    <td style={{ fontSize: 12, maxWidth: 260 }} title={r.descripcion_meta}>{r.descripcion_meta}</td>
                    <td className="th-c">
                      <span className="tray-eff-chip" style={{ color: colorPct(parseFloat(r.eficiencia_pct)||0), background: colorPct(parseFloat(r.eficiencia_pct)||0)+'18' }}>
                        {r.eficiencia_pct != null ? r.eficiencia_pct + '%' : '—'}
                      </span>
                    </td>
                    <td className="th-c">
                      <span className="tray-eff-chip" style={{ color: 'var(--pdm-blue)', background: 'var(--pdm-blue)18' }}>
                        {r.ejec_financiera_pct != null ? r.ejec_financiera_pct + '%' : '—'}
                      </span>
                    </td>
                    <td className="th-c">
                      <span className="chip-baja">+{r.divergencia_pct}%</span>
                    </td>
                    <td className="th-r td-money">${parseFloat(r.obligado_m).toFixed(2)} M</td>
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
