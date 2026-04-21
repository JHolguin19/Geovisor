import { Gauge, BarPct } from '../pdm/PdmShared';
import { pct, colorPct } from '../pdm/helpers';
import { DonutChart, HBarChart } from './AnualCharts';

function fmtM(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '—';
  if (n >= 1000) return `$${(n / 1000).toFixed(1)} mil M`;
  return `$${n.toLocaleString('es-CO')} M`;
}

export default function AnualOverviewTab({ data, year }) {
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
          <div className="pdm-a-kpi-card pdm-a-kpi-card--eff" style={{ borderLeftColor: colorPct(d.eficiencia_promedio) }}>
            <div className="pdm-a-kpi-value" style={{ color: colorPct(d.eficiencia_promedio) }}>
              {d.eficiencia_promedio != null ? `${d.eficiencia_promedio}%` : '—'}
            </div>
            <div className="pdm-a-kpi-label">Eficiencia promedio</div>
            <div className="pdm-a-kpi-sub">realizado / programado</div>
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

      {/* Presupuesto del año */}
      <section className="pdm-section">
        <h2 className="pdm-section-h">Presupuesto {year}</h2>
        <div className="pdm-a-budget-row">
          {[
            { label: 'Apropiación', value: d.apropiacion_m, color: '#1a2332', icon: '$' },
            { label: 'Comprometido', value: d.comprometido_m, color: 'var(--pdm-blue)', icon: '≡' },
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
                  {b.label !== 'Apropiación' && (
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
    </>
  );
}
