import { useContext, useMemo } from 'react';
import MapContext from '../../context/MapContext';
import './DelitosPanel.css';

const TIPO_GROUPS = [
  {
    label: 'Hurtos',
    items: [
      { value: 'HURTO A PERSONAS',    label: 'Hurto a personas' },
      { value: 'HURTO A COMERCIO',    label: 'Hurto a comercio' },
      { value: 'HURTO A RESIDENCIAS', label: 'Hurto a residencias' },
      { value: 'HURTO AUTOMOTORES',   label: 'Hurto a automotores' },
      { value: 'HURTO MOTOCICLETAS',  label: 'Hurto a motocicletas' },
      { value: 'HURTO CELULARES',     label: 'Hurto a celulares' },
    ],
  },
  {
    label: 'Violencia',
    items: [
      { value: 'HOMICIDIO',               label: 'Homicidio' },
      { value: 'LESIONES PERSONALES',     label: 'Lesiones personales' },
      { value: 'VIOLENCIA INTRAFAMILIAR', label: 'Violencia intrafamiliar' },
      { value: 'DELITOS SEXUALES',        label: 'Delitos sexuales' },
    ],
  },
  {
    label: 'Delitos graves',
    items: [
      { value: 'SECUESTRO',   label: 'Secuestro' },
      { value: 'EXTORSION',   label: 'Extorsión' },
      { value: 'TERRORISMO',  label: 'Terrorismo' },
    ],
  },
  {
    label: 'Otros',
    items: [
      { value: 'PIRATERIA TERRESTRE', label: 'Piratería terrestre' },
      { value: 'ABIGEATO',            label: 'Abigeato' },
    ],
  },
];

const HEATMAP_LEGEND = [
  { label: '≤2',   color: '#FEE2E2' },
  { label: '≤5',   color: '#FECACA' },
  { label: '≤10',  color: '#FCA5A5' },
  { label: '≤20',  color: '#F87171' },
  { label: '≤40',  color: '#EF4444' },
  { label: '≤60',  color: '#DC2626' },
  { label: '≤80',  color: '#B91C1C' },
  { label: '≤120', color: '#991B1B' },
  { label: '>120', color: '#7F1D1D' },
];

const CAT_LEGEND = [
  { label: 'Sin delitos',    color: '#F1F5F9' },
  { label: 'Bajo (≤5)',      color: '#FEF9C3' },
  { label: 'Medio (≤20)',    color: '#FED7AA' },
  { label: 'Alto (≤60)',     color: '#FCA5A5' },
  { label: 'Muy alto (>60)', color: '#DC2626' },
];

export default function DelitosPanel() {
  const { activeLayers, delitosConfig, setDelitosConfig } = useContext(MapContext);

  const isActive = useMemo(
    () => [...activeLayers].some(id => id.startsWith('delitos_')),
    [activeLayers]
  );

  if (!isActive) return null;

  const { anio, tipoDelito, vizMode } = delitosConfig;

  function update(patch) {
    setDelitosConfig(prev => ({ ...prev, ...patch }));
  }

  const legend = vizMode === 'categorized' ? CAT_LEGEND : HEATMAP_LEGEND;

  return (
    <div className="dp">
      {/* Header */}
      <div className="dp__header">
        <svg className="dp__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        <span>Capas de Delitos</span>
      </div>

      <div className="dp__body">

        {/* Año */}
        <div className="dp__field">
          <label className="dp__label">Año</label>
          <div className="dp__pills">
            {[['', 'Todos'], ['2024', '2024'], ['2025', '2025']].map(([val, lbl]) => (
              <button
                key={val}
                className={`dp__pill${(!anio && val === '') || anio === val ? ' dp__pill--active' : ''}`}
                onClick={() => update({ anio: val || null })}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Variable / tipo de delito */}
        <div className="dp__field">
          <label className="dp__label" htmlFor="dp-tipo">Variable</label>
          <select
            id="dp-tipo"
            className="dp__select"
            value={tipoDelito || ''}
            onChange={e => update({ tipoDelito: e.target.value || null })}
          >
            <option value="">Todos los delitos</option>
            {TIPO_GROUPS.map(g => (
              <optgroup key={g.label} label={g.label}>
                {g.items.map(it => (
                  <option key={it.value} value={it.value}>{it.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Modo de visualización */}
        <div className="dp__field">
          <label className="dp__label">Visualización</label>
          <div className="dp__mode-toggle">
            <button
              className={`dp__mode-btn${vizMode === 'heatmap' ? ' dp__mode-btn--active' : ''}`}
              onClick={() => update({ vizMode: 'heatmap' })}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="4" height="18" rx="1" fill="#fee2e2"/>
                <rect x="9" y="7" width="4" height="14" rx="1" fill="#ef4444"/>
                <rect x="15" y="11" width="4" height="10" rx="1" fill="#7f1d1d"/>
                <line x1="2" y1="21" x2="22" y2="21" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
              Mapa de calor
            </button>
            <button
              className={`dp__mode-btn${vizMode === 'categorized' ? ' dp__mode-btn--active' : ''}`}
              onClick={() => update({ vizMode: 'categorized' })}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="4" rx="1"/>
                <rect x="2" y="10" width="20" height="4" rx="1"/>
                <rect x="2" y="16" width="20" height="4" rx="1"/>
              </svg>
              Categorizado
            </button>
          </div>
        </div>

        {/* Leyenda */}
        <div className="dp__legend">
          <div className="dp__legend-title">
            {vizMode === 'heatmap' ? 'Intensidad — total delitos' : 'Categorías de incidencia'}
          </div>
          <div className="dp__legend-items">
            {legend.map((step, i) => (
              <div key={i} className="dp__legend-item">
                <span className="dp__legend-swatch" style={{ background: step.color }} />
                <span className="dp__legend-label">{step.label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
