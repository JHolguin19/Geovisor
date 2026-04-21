import { BarPct } from '../pdm/PdmShared';
import { pct, colorPct } from '../pdm/helpers';

export default function AnualPilaresTab({ data, year }) {
  if (!data || !data.length) return <div className="pdm-loading-full">Sin datos de pilares para {year}</div>;

  return (
    <section className="pdm-section">
      <h2 className="pdm-section-h">Pilares estratégicos — {year}</h2>
      <div className="pdm-pilares-grid">
        {data.map(p => {
          const eff = parseFloat(p.eficiencia_promedio) || 0;
          return (
            <div key={p.num_pilar} className="pdm-pilar-card">
              <div className="pdm-pilar-head">
                <span className="pdm-pilar-num">Pilar {p.num_pilar}</span>
                <span className="pdm-pilar-presupuesto">
                  {parseFloat(p.apropiacion_m) >= 1000
                    ? `$${(p.apropiacion_m / 1000).toFixed(1)} mil M`
                    : `$${parseInt(p.apropiacion_m).toLocaleString('es-CO')} M`}
                </span>
              </div>
              <div className="pdm-pilar-nom">{p.nom_pilar}</div>
              <div className="pdm-pilar-metas">
                {p.programadas} programadas · {p.no_programadas} NP
              </div>
              <div className="pdm-pilar-bars">
                <div className="pdm-pilar-bar-row">
                  <span>Eficiencia</span>
                  <BarPct value={eff} height={10} />
                  <b style={{ color: colorPct(eff) }}>{pct(eff)}</b>
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
