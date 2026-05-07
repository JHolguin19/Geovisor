import { Gauge, BarPct } from './PdmShared';
import { pct, fmtB, colorPct } from './helpers';

export default function PdmOverviewTab({ overview, onAlertaClick }) {
  const g  = overview?.global  || {};
  const pl = overview?.pilares || [];
  const al = overview?.alertas || [];

  return (
    <>
      {/* Gauges principales */}
      <section className="pdm-section pdm-gauges-section">
        <div className="pdm-gauges-row">
          <Gauge value={g.avance_fisico_pct} label="Avance Físico" sub="Promedio de las 204 metas" />
          <div className="pdm-gauge-divider" />
          <Gauge value={g.avance_financiero_pct} label="Avance Financiero" color="var(--pdm-blue)"
            sub="Neto Registros 2024+2025 / Apropiación 4 años" />
          <div className="pdm-gauge-divider" />
          <Gauge value={g.avance_obligacion_pct} label="Desembolsado" color="var(--pdm-purple)"
            sub="Obligaciones 2024+2025 / Apropiación 4 años" />
        </div>
        <div className="pdm-formula-nota">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>
            <strong>Avance financiero</strong> = Neto Registros (2024+2025) ÷ Total Apropiación (4 años) ·
            <strong> Desembolsado</strong> = Obligaciones (2024+2025) ÷ Total Apropiación (4 años)
          </span>
        </div>
      </section>

      {/* Presupuesto */}
      <section className="pdm-section">
        <h2 className="pdm-section-h">Presupuesto del cuatrienio</h2>
        <div className="pdm-budget-grid">
          <div className="pdm-budget-card pdm-budget-card--total">
            <div className="pdm-bc-icon">$</div>
            <div className="pdm-bc-body">
              <div className="pdm-bc-label">Total Apropiación 4 años</div>
              <div className="pdm-bc-value">{fmtB(g.presupuesto_total_b)}</div>
              <div className="pdm-bc-sub">Presupuesto total del PDM 2024–2027</div>
            </div>
          </div>
          <div className="pdm-budget-card pdm-budget-card--comprometido">
            <div className="pdm-bc-icon">≡</div>
            <div className="pdm-bc-body">
              <div className="pdm-bc-label">Neto Registros (comprometido)</div>
              <div className="pdm-bc-value">{fmtB(g.comprometido_b)}</div>
              <div className="pdm-bc-sub">2024 + 2025 — comprometido sin desembolsar</div>
              <BarPct value={g.avance_financiero_pct} color="var(--pdm-blue)" height={6} />
              <div className="pdm-bc-pct" style={{ color: 'var(--pdm-blue)' }}>{pct(g.avance_financiero_pct)} del total 4 años</div>
            </div>
          </div>
          <div className="pdm-budget-card pdm-budget-card--desembolsado">
            <div className="pdm-bc-icon">✓</div>
            <div className="pdm-bc-body">
              <div className="pdm-bc-label">Obligaciones (desembolsado)</div>
              <div className="pdm-bc-value">{fmtB(g.desembolsado_b)}</div>
              <div className="pdm-bc-sub">2024 + 2025 — dinero ya pagado</div>
              <BarPct value={g.avance_obligacion_pct} color="var(--pdm-purple)" height={6} />
              <div className="pdm-bc-pct" style={{ color: 'var(--pdm-purple)' }}>{pct(g.avance_obligacion_pct)} del total 4 años</div>
            </div>
          </div>
          <div className="pdm-budget-card pdm-budget-card--pendiente">
            <div className="pdm-bc-icon">→</div>
            <div className="pdm-bc-body">
              <div className="pdm-bc-label">Pendiente por comprometer</div>
              <div className="pdm-bc-value">{fmtB(parseFloat(g.presupuesto_total_b) - parseFloat(g.comprometido_b))}</div>
              <div className="pdm-bc-sub">Apropiación 2026–2027 + saldos</div>
            </div>
          </div>
        </div>
      </section>

      {/* Estado de metas */}
      <section className="pdm-section">
        <h2 className="pdm-section-h">Estado de las {g.total_metas} metas</h2>
        <div className="pdm-estado-layout">
          <div className="pdm-estado-cards">
            {[
              { label: 'En meta',    n: g.metas_en_meta,    cls: 'alta',  desc: 'Avance físico ≥ 80%' },
              { label: 'En proceso', n: g.metas_en_proceso, cls: 'media', desc: 'Avance físico 50–79%' },
              { label: 'Rezagadas',  n: g.metas_rezagadas,  cls: 'baja',  desc: 'Avance físico < 50%' },
            ].map(({ label, n, cls, desc }) => (
              <div key={cls} className={`pdm-estado-card pdm-estado-${cls}`}>
                <div className="pdm-ec-num">{n}</div>
                <div className="pdm-ec-label">{label}</div>
                <div className="pdm-ec-desc">{desc}</div>
                <div className="pdm-ec-pct">{Math.round((parseInt(n) / parseInt(g.total_metas)) * 100)}% del total</div>
              </div>
            ))}
          </div>
          <div className="pdm-datos-extra">
            <h3>Datos adicionales</h3>
            {[
              { val: g.metas_superaron,            label: 'metas superaron su objetivo físico en 2025',                    color: 'var(--pdm-green)',  icon: '↑' },
              { val: g.metas_np_2025,              label: 'metas no programadas (NP) en 2025',                             color: 'var(--pdm-amber)',  icon: '⊘' },
              { val: g.brecha_financiero_mayor,    label: 'metas donde el gasto supera el avance físico (brecha >10%)',    color: 'var(--pdm-blue)',   icon: '↔' },
              { val: `${g.eficiencia_2025_pct}%`,  label: 'eficiencia promedio en 2025 (avance vs meta programada)',       color: 'var(--pdm-purple)', icon: '◎' },
              { val: `${g.cumplimiento_cuatrienio_pct}%`, label: 'cumplimiento cuatrienio (2 de 4 años transcurridos)',    color: colorPct(g.cumplimiento_cuatrienio_pct), icon: '⬡' },
            ].map(({ val, label, color, icon }) => (
              <div key={label} className="pdm-dato-row">
                <span className="pdm-dato-icon" style={{ color }}>{icon}</span>
                <span className="pdm-dato-val"  style={{ color }}>{val}</span>
                <span className="pdm-dato-label">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Por pilar */}
      <section className="pdm-section">
        <h2 className="pdm-section-h">Avance por pilar estratégico</h2>
        <div className="pdm-pilares-grid">
          {pl.map(pilar => (
            <div key={pilar.num_pilar} className="pdm-pilar-card">
              <div className="pdm-pilar-head">
                <span className="pdm-pilar-num">Pilar {pilar.num_pilar}</span>
                <span className="pdm-pilar-presupuesto">{fmtB(pilar.presupuesto_b)}</span>
              </div>
              <div className="pdm-pilar-nom">{pilar.nom_pilar}</div>
              <div className="pdm-pilar-metas">{pilar.total_metas} metas</div>
              <div className="pdm-pilar-bars">
                <div className="pdm-pilar-bar-row">
                  <span>Físico</span>
                  <BarPct value={pilar.avance_fisico_pct} height={10} />
                  <b style={{ color: colorPct(pilar.avance_fisico_pct) }}>{pct(pilar.avance_fisico_pct)}</b>
                </div>
                <div className="pdm-pilar-bar-row">
                  <span>Financiero</span>
                  <BarPct value={pilar.avance_financiero_pct} color="var(--pdm-blue)" height={10} />
                  <b style={{ color: 'var(--pdm-blue)' }}>{pct(pilar.avance_financiero_pct)}</b>
                </div>
              </div>
              <div className="pdm-pilar-chips">
                <span className="chip-alta">{pilar.en_meta} en meta</span>
                <span className="chip-media">{pilar.en_proceso} proceso</span>
                <span className="chip-baja">{pilar.rezagadas} rezag.</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Alertas */}
      {al.length > 0 && (
        <section className="pdm-section pdm-alertas-section">
          <h2 className="pdm-section-h">
            <span className="pdm-alerta-dot" /> Metas críticas — bajo avance físico con alto presupuesto
          </h2>
          <div className="pdm-alertas-grid">
            {al.map(a => (
              <div key={a.id} className="pdm-alerta-card" onClick={() => onAlertaClick(a.id)}>
                <div className="pdm-alerta-top">
                  <span className="pdm-alerta-num">Meta #{a.meta_num}</span>
                  <span className="pdm-alerta-sec">{a.secretaria}</span>
                </div>
                <div className="pdm-alerta-desc">{a.descripcion_meta}</div>
                <div className="pdm-alerta-bottom">
                  <span style={{ color: colorPct(parseFloat(a.avance_fisico_pct)) }}>
                    Físico: {a.avance_fisico_pct}%
                  </span>
                  <span className="pdm-alerta-ppto">
                    ${parseFloat(a.presupuesto_m).toLocaleString('es-CO')} M
                  </span>
                </div>
                <BarPct value={a.avance_fisico_pct} height={5} />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
