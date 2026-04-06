import './SelectionResults.css';

function CloseIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }

const LAYER_NAMES = {
  barrios_urbanos: 'Barrios',
  uba1:'UBA 1', uba2:'UBA 2', uba3:'UBA 3', uba4:'UBA 4', uba5:'UBA 5', ubac:'UBA C',
  alumbrado_publico: 'Transformadores',
  luminarias_tradicionales: 'Lum. Tradicionales',
  luminarias_led: 'Luminarias LED',
  apoyos_alumbrado_publico: 'Apoyos Alumbrado',
  rutas_alumbrado_publico: 'Rutas Alumbrado',
  uso_estanco: 'Estancos', uso_discotecas: 'Discotecas', uso_droguerias: 'Droguerías',
  uso_ferreterias: 'Ferreterías', uso_ips: 'IPS', uso_restaurantes: 'Restaurantes',
  uso_servicios: 'Servicios', predios_educativos: 'Predios Educativos',
  equipo_institucional: 'Equipo Inst.', iglesias: 'Iglesias',
};

function getFeatureLabel(layerId, props) {
  if (['uba1','uba2','uba3','uba4','uba5','ubac','barrios_urbanos'].includes(layerId))
    return props.nombre || '—';
  if (layerId.startsWith('uso_') || ['predios_educativos','equipo_institucional','iglesias'].includes(layerId))
    return props.nombre_establecimiento || props.Nombre || props.nombre || '—';
  if (['alumbrado_publico','luminarias_tradicionales','luminarias_led','apoyos_alumbrado_publico','rutas_alumbrado_publico'].includes(layerId))
    return props.Name || props.name || props.NAME || '—';
  return Object.values(props).find(v => v && typeof v === 'string') || '—';
}

export default function SelectionResults({ results, onClose }) {
  if (!results || results.length === 0) return null;

  // Group by layer
  const groups = {};
  results.forEach(({ layerId, properties }) => {
    if (!groups[layerId]) groups[layerId] = [];
    groups[layerId].push(properties);
  });

  return (
    <div className="sel-results">
      <div className="sel-header">
        <span className="sel-title">
          Selección — <strong>{results.length}</strong> elemento{results.length !== 1 ? 's' : ''}
        </span>
        <button className="sel-close" onClick={onClose}><CloseIcon /></button>
      </div>
      <div className="sel-body">
        {Object.entries(groups).map(([layerId, items]) => (
          <div key={layerId} className="sel-group">
            <div className="sel-group-title">{LAYER_NAMES[layerId] || layerId} <span className="sel-count">{items.length}</span></div>
            <ul className="sel-list">
              {items.slice(0, 20).map((props, i) => (
                <li key={i} className="sel-item">{getFeatureLabel(layerId, props)}</li>
              ))}
              {items.length > 20 && <li className="sel-item sel-item--more">...y {items.length - 20} más</li>}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
