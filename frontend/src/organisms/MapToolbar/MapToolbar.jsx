import { useContext } from 'react';
import MapContext from '../../context/MapContext';
import './MapToolbar.css';

// SVG icons inline (sin emojis)
function DistanceIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="2" y1="12" x2="22" y2="12"/><polyline points="2,8 2,16"/><polyline points="22,8 22,16"/><line x1="8" y1="12" x2="8" y2="9"/><line x1="12" y1="12" x2="12" y2="9"/><line x1="16" y1="12" x2="16" y2="9"/></svg>; }
function AreaIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3,20 10,4 21,12 15,20"/></svg>; }
function BufferIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7" strokeDasharray="3 2"/><circle cx="12" cy="12" r="11" strokeDasharray="2 3"/></svg>; }
function SelectIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2"><polygon points="4,4 20,8 14,14 8,20"/></svg>; }
function SearchIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function ClearIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }

const TOOLS = [
  { id: 'measure-distance', label: 'Medir distancia', Icon: DistanceIcon },
  { id: 'measure-area',     label: 'Medir área',       Icon: AreaIcon },
  { id: 'buffer',           label: 'Área de influencia', Icon: BufferIcon },
  { id: 'select-polygon',   label: 'Seleccionar por polígono', Icon: SelectIcon },
];

export default function MapToolbar({ onSearchToggle }) {
  const { activeTool, setActiveTool, bufferRadius, setBufferRadius, clearTools } = useContext(MapContext);

  const handleTool = (id) => {
    setActiveTool(prev => prev === id ? null : id);
  };

  return (
    <div className="map-toolbar">
      {TOOLS.map(({ id, label, Icon }) => (
        <button
          key={id}
          className={`mt-btn${activeTool === id ? ' mt-btn--active' : ''}`}
          title={label}
          onClick={() => handleTool(id)}
        >
          <Icon />
        </button>
      ))}

      {activeTool === 'buffer' && (
        <div className="mt-buffer-row">
          <span>Radio:</span>
          <input
            type="number"
            min="10"
            max="10000"
            step="10"
            value={bufferRadius}
            onChange={e => setBufferRadius(Number(e.target.value))}
          />
          <span>m</span>
        </div>
      )}

      <div className="mt-sep" />

      <button className="mt-btn" title="Buscar predio o barrio" onClick={onSearchToggle}>
        <SearchIcon />
      </button>

      {(activeTool) && (
        <button className="mt-btn mt-btn--danger" title="Limpiar herramienta" onClick={clearTools}>
          <ClearIcon />
        </button>
      )}
    </div>
  );
}
