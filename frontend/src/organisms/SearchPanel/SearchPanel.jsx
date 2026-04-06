import { useState, useContext, useCallback } from 'react';
import GeoJSONFormat from 'ol/format/GeoJSON';
import MapContext from '../../context/MapContext';
import './SearchPanel.css';

function CloseIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }
function SpinIcon() { return <svg className="sp-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>; }

export default function SearchPanel({ onClose }) {
  const { map } = useContext(MapContext);
  const [type, setType] = useState('predio');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(false);
    try {
      const isPredi = type === 'predio';
      const tableName = isPredi ? 'predios_2025_m' : 'barriosurbanos';
      const searchFields = isPredi
        ? 'matriculainmobiliaria,direccion'
        : 'nombre';
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ q: query.trim(), searchFields, limit: 20 });
      const resp = await fetch(`/api/geodata/${tableName}?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await resp.json();
      setResults(data.features || []);
    } catch (e) {
      console.error('[Search]', e);
      setResults([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }, [query, type]);

  const zoomToFeature = useCallback((feature) => {
    if (!map) return;
    const fmt = new GeoJSONFormat();
    const olFeat = fmt.readFeature(feature, { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' });
    const extent = olFeat.getGeometry().getExtent();
    map.getView().fit(extent, { padding: [80, 80, 80, 80], maxZoom: 19, duration: 600 });
  }, [map]);

  const getLabel = (feat) => {
    const p = feat.properties || {};
    if (type === 'predio') return `${p.direccion || p.matriculainmobiliaria || 'Sin dirección'}`;
    return p.nombre || '—';
  };
  const getSub = (feat) => {
    const p = feat.properties || {};
    if (type === 'predio') return p.matriculainmobiliaria || '';
    return '';
  };

  return (
    <div className="search-panel">
      <div className="srch-header">
        <span className="srch-title">Buscar</span>
        <button className="srch-close" onClick={onClose}><CloseIcon /></button>
      </div>

      <div className="srch-tabs">
        <button className={`srch-tab${type === 'predio' ? ' srch-tab--active' : ''}`} onClick={() => { setType('predio'); setResults([]); setSearched(false); }}>Predios</button>
        <button className={`srch-tab${type === 'barrio' ? ' srch-tab--active' : ''}`} onClick={() => { setType('barrio'); setResults([]); setSearched(false); }}>Barrios</button>
      </div>

      <div className="srch-input-row">
        <input
          className="srch-input"
          placeholder={type === 'predio' ? 'Matrícula o dirección...' : 'Nombre del barrio...'}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          autoFocus
        />
        <button className="srch-btn" onClick={search} disabled={loading || !query.trim()}>
          {loading ? <SpinIcon /> : 'Buscar'}
        </button>
      </div>

      {searched && results.length === 0 && (
        <p className="srch-empty">Sin resultados para "{query}"</p>
      )}

      {results.length > 0 && (
        <ul className="srch-results">
          {results.map((feat, i) => (
            <li key={i} className="srch-result-item" onClick={() => zoomToFeature(feat)}>
              <span className="srch-result-main">{getLabel(feat)}</span>
              {getSub(feat) && <span className="srch-result-sub">{getSub(feat)}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
