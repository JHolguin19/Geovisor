import { BarPct } from '../pdm/PdmShared';
import { pct, colorPct } from '../pdm/helpers';

function fmtM(val) {
  const n = parseFloat(val);
  if (isNaN(n) || n === 0) return '$0 M';
  if (n >= 1000) return `$${(n / 1000).toFixed(1)} mil M`;
  return `$${parseInt(n).toLocaleString('es-CO')} M`;
}

export default function AnualPilaresTab({ data, year }) {
  if (!data || !data.length) return <div className="pdm-loading-full">Sin datos de pilares para {year}</div>;

  return (
    <section className="pdm-section">
      <h2 className="pdm-section-h">Pilares estratégicos — {year}</h2>
      <div className="pdm-pilares-grid">
        {data.map(p => {
          const avFisico = parseFloat(p.avance_fisico_pct) || 0;
          const eff = parseFloat(p.eficiencia_promedio) || 0;
          const apropia = parseFloat(p.apropiacion_m) || 0;
          const registro = parseFloat(p.comprometido_m) || 0;
          const pctReg = apropia > 0 ? Math.round(registro / apropia * 100) : 0;
          return (
            <div key={p.num_pilar} className="pdm-pilar-card">
              <div className="pdm-pilar-head">
                <span className="pdm-pilar-num">Pilar {p.num_pilar}</span>
                <span className="pdm-pilar-presupuesto">{fmtM(p.apropiacion_m)}</span>
              </div>
              <div className="pdm-pilar-nom">{p.nom_pilar}</div>
              <div className="pdm-pilar-metas">
                {p.programadas} programadas · {p.no_programadas} NP
              </div>
              <div className="pdm-pilar-bars">
                <div className="pdm-pilar-bar-row">
                  <span>Avance físico</span>
                  <BarPct value={avFisico} height={10} />
                  <b style={{ color: colorPct(avFisico) }}>{pct(avFisico)}</b>
                </div>
                <div className="pdm-pilar-bar-row">
                  <span>Eficiencia {year}</span>
                  <BarPct value={eff} height={10} />
                  <b style={{ color: colorPct(eff) }}>{pct(eff)}</b>
                </div>
                <div className="pdm-pilar-bar-row" style={{ marginTop: 6 }}>
                  <span>Neto Reg. / Apropia.</span>
                  <BarPct value={pctReg} height={10} color="var(--pdm-blue)" />
                  <b style={{ color: 'var(--pdm-blue)' }}>{pctReg}%</b>
                </div>
                <div className="pdm-pilar-bar-row" style={{ fontSize: 11, color: 'var(--pdm-muted)', marginTop: 2 }}>
                  <span style={{ flex: 1 }}>{fmtM(registro)} / {fmtM(apropia)}</span>
                </div>
              </div>
              <div className="pdm-pilar-chips">
                <span className="chip-alta">{p.semaforo_verde} en meta</span>
                <span className="chip-media">{p.semaforo_amarillo} alerta</span>
                <span className="chip-baja">{p.semaforo_rojo} crítica</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
