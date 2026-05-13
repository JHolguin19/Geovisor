import { useContext, useMemo, useState, useEffect } from 'react';
import MapContext from '../../context/MapContext';
import { zonaRuralAvaluosService, zonaRuralService } from '../../services/api';
import './ZonaRuralPanel.css';

const COLOR_BY_OPTIONS = [
  { value: 'impuesto',   label: 'Impuesto' },
  { value: 'avaluo',     label: 'Avalúo' },
  { value: 'incremento', label: '% Cambio' },
];

const IMPUESTO_LEGEND = [
  { label: '< $50K',     color: '#dcfce7' },
  { label: '$50K–100K',  color: '#bbf7d0' },
  { label: '$100K–200K', color: '#86efac' },
  { label: '$200K–400K', color: '#fef08a' },
  { label: '$400K–700K', color: '#fde047' },
  { label: '$700K–1.2M', color: '#fdba74' },
  { label: '$1.2M–2.5M', color: '#fb923c' },
  { label: '$2.5M–5M',   color: '#f87171' },
  { label: '$5M–10M',    color: '#ef4444' },
  { label: '> $10M',     color: '#dc2626' },
];

const AVALUO_LEGEND = [
  { label: '< $5M',      color: '#dcfce7' },
  { label: '$5M–10M',    color: '#bbf7d0' },
  { label: '$10M–20M',   color: '#86efac' },
  { label: '$20M–40M',   color: '#fef08a' },
  { label: '$40M–60M',   color: '#fde047' },
  { label: '$60M–100M',  color: '#fdba74' },
  { label: '$100M–250M', color: '#fb923c' },
  { label: '$250M–500M', color: '#f87171' },
  { label: '$500M–1B',   color: '#ef4444' },
  { label: '> $1B',      color: '#dc2626' },
];

const INCREMENTO_LEGEND = [
  { label: '0% o menos',   color: '#dcfce7' },
  { label: '0–20%',        color: '#bbf7d0' },
  { label: '20–50%',       color: '#86efac' },
  { label: '50–100%',      color: '#fef08a' },
  { label: '100–200%',     color: '#fde047' },
  { label: '200–400%',     color: '#fdba74' },
  { label: '400–700%',     color: '#fb923c' },
  { label: '700–1000%',    color: '#f87171' },
  { label: '1000–2000%',   color: '#ef4444' },
  { label: '> 2000%',      color: '#dc2626' },
];

const LEGENDS = { impuesto: IMPUESTO_LEGEND, avaluo: AVALUO_LEGEND, incremento: INCREMENTO_LEGEND };
const LEGEND_TITLES = { impuesto: 'Impuesto predial anual', avaluo: 'Avalúo catastral nuevo', incremento: '% incremento avalúo' };

function fmt(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString('es-CO');
}

function fmtCurrency(n) {
  if (n == null) return '—';
  const v = Number(n);
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${fmt(v)}`;
}

export default function ZonaRuralPanel() {
  const { activeLayers, zonaRuralConfig, setZonaRuralConfig } = useContext(MapContext);

  const isActive = useMemo(
    () => activeLayers.has('zonarural_avaluos'),
    [activeLayers]
  );

  const [veredas, setVeredas] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');
  const [minPredios, setMinPredios] = useState('');

  useEffect(() => {
    if (!isActive) return;
    zonaRuralService.getVeredas().then(setVeredas).catch(console.error);
    zonaRuralAvaluosService.getStats().then(setStats).catch(console.error);
  }, [isActive]);

  if (!isActive) return null;

  const { vereda, colorBy } = zonaRuralConfig;

  function update(patch) {
    setZonaRuralConfig(prev => ({ ...prev, ...patch }));
  }

  const legend = LEGENDS[colorBy] || IMPUESTO_LEGEND;

  const minN = minPredios !== '' ? Number(minPredios) : 0;
  const filteredVeredas = veredas.filter(v => {
    const matchSearch = !search || v.vereda.toLowerCase().includes(search.toLowerCase());
    const matchMin    = minN === 0 || Number(v.predios_unicos) >= minN;
    return matchSearch && matchMin;
  });

  return (
    <div className="zrp">
      {/* Header */}
      <div className="zrp__header">
        <svg className="zrp__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z"/>
          <line x1="9" y1="3" x2="9" y2="18"/>
          <line x1="15" y1="6" x2="15" y2="21"/>
        </svg>
        <span>Predios Rurales</span>
      </div>

      <div className="zrp__body">

        {/* KPIs */}
        {stats && (
          <div className="zrp__kpi-row">
            <div className="zrp__kpi">
              <div className="zrp__kpi-val">{fmt(stats.total_predios)}</div>
              <div className="zrp__kpi-label">Predios</div>
            </div>
            <div className="zrp__kpi">
              <div className="zrp__kpi-val">{fmt(stats.total_veredas)}</div>
              <div className="zrp__kpi-label">Veredas</div>
            </div>
            <div className="zrp__kpi">
              <div className="zrp__kpi-val">{fmtCurrency(stats.recaudo_nuevo_new_tarifa)}</div>
              <div className="zrp__kpi-label">Recaudo nuevo</div>
            </div>
            <div className="zrp__kpi">
              <div className="zrp__kpi-val">{stats.avg_pct_incremento}%</div>
              <div className="zrp__kpi-label">Incr. promedio</div>
            </div>
          </div>
        )}

        {/* Color by */}
        <div className="zrp__field">
          <label className="zrp__label">Colorear por</label>
          <div className="zrp__pills">
            {COLOR_BY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`zrp__pill${colorBy === opt.value ? ' zrp__pill--active' : ''}`}
                onClick={() => update({ colorBy: opt.value })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Vereda filter */}
        <div className="zrp__field">
          <div className="zrp__filter-row">
            <label className="zrp__label">Filtrar por vereda</label>
            <div className="zrp__minpredios">
              <span className="zrp__minpredios-label">Min. predios</span>
              <input
                type="number"
                min="0"
                step="10"
                placeholder="0"
                value={minPredios}
                onChange={e => setMinPredios(e.target.value)}
                className="zrp__minpredios-input"
              />
            </div>
          </div>
          <div className="zrp__search">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Buscar vereda..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="zrp__vereda-list">
            <div
              className={`zrp__vereda-item ${!vereda ? 'zrp__vereda-item--active' : ''}`}
              onClick={() => update({ vereda: null })}
            >
              <span>
                Todas las veredas
                {(search || minN > 0) && (
                  <span className="zrp__filter-hint"> ({filteredVeredas.length} de {veredas.length})</span>
                )}
              </span>
              <span className="zrp__vereda-badge">
                {filteredVeredas.reduce((a, v) => a + Number(v.predios_unicos), 0)}
              </span>
            </div>
            {filteredVeredas.map(v => (
              <div
                key={v.vereda}
                className={`zrp__vereda-item ${vereda === v.vereda ? 'zrp__vereda-item--active' : ''}`}
                onClick={() => update({ vereda: v.vereda })}
              >
                <span>{v.vereda}</span>
                <span className="zrp__vereda-badge">{v.predios_unicos}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="zrp__legend">
          <div className="zrp__legend-title">{LEGEND_TITLES[colorBy]}</div>
          <div className="zrp__legend-items">
            {legend.map((step, i) => (
              <div key={i} className="zrp__legend-item">
                <span className="zrp__legend-swatch" style={{ background: step.color }} />
                <span className="zrp__legend-label">{step.label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
