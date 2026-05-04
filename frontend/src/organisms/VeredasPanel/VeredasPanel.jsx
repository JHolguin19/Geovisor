import { useContext, useEffect, useState } from 'react';
import MapContext from '../../context/MapContext';
import './VeredasPanel.css';

const ACCENT = '#16a34a';

export default function VeredasPanel() {
  const { activeLayers } = useContext(MapContext);
  const isVisible = activeLayers.has('veredas_salud');

  const [names, setNames]       = useState(null); // Set of unique names
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [closed, setClosed]     = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Re-show if layer is toggled back on
  useEffect(() => {
    if (isVisible) setClosed(false);
  }, [isVisible]);

  // Fetch when layer activates (only once)
  useEffect(() => {
    if (!isVisible || names) return;

    setLoading(true);
    setError(null);

    const token = localStorage.getItem('token');
    fetch('/api/geodata/veredas_salud?cols=nombre&limit=2000', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || `Error ${r.status}`);
        const unique = new Set(
          (d.features ?? [])
            .map(f => (f.properties?.nombre ?? '').trim())
            .filter(n => n !== '')
        );
        setNames(unique);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message || 'No se pudo cargar');
        setLoading(false);
      });
  }, [isVisible, names]);

  if (!isVisible || closed) return null;

  const count  = names?.size ?? 0;
  const sorted = names ? [...names].sort((a, b) => a.localeCompare(b, 'es')) : [];

  return (
    <div className="veredas-panel">
      {/* Header */}
      <div className="veredas-panel__header" style={{ background: ACCENT }}>
        <div className="veredas-panel__header-left">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
          </svg>
          <div>
            <div className="veredas-panel__subtitle">Salud · Territorio</div>
            <div className="veredas-panel__title">Veredas del municipio</div>
          </div>
        </div>
        <button className="veredas-panel__close" onClick={() => setClosed(true)} title="Cerrar">✖</button>
      </div>

      {/* Body */}
      <div className="veredas-panel__body">
        {loading && <p className="veredas-panel__msg">Cargando…</p>}
        {error   && <p className="veredas-panel__msg veredas-panel__msg--error">{error}</p>}

        {names && !loading && (
          <>
            {/* Big counter */}
            <div className="veredas-panel__counter">
              <span className="veredas-panel__count" style={{ color: ACCENT }}>{count}</span>
              <span className="veredas-panel__count-label">veredas únicas</span>
            </div>

            {/* Expandable list */}
            <button
              className="veredas-panel__toggle"
              style={{ color: ACCENT }}
              onClick={() => setExpanded(p => !p)}
            >
              {expanded ? '▲ Ocultar listado' : '▼ Ver listado completo'}
            </button>

            {expanded && (
              <ul className="veredas-panel__list">
                {sorted.map((name, i) => (
                  <li key={name} className="veredas-panel__list-item">
                    <span className="veredas-panel__list-num">{i + 1}</span>
                    <span className="veredas-panel__list-name">{name}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
