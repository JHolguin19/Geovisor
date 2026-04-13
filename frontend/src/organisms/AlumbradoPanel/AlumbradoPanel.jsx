import { useContext, useEffect, useState } from 'react';
import MapContext from '../../context/MapContext';
import { UBA_COLORS, UBA_ORDER } from '../../constants/ubas';
import './AlumbradoPanel.css';

// Capas que activan el panel (excluye rutas)
const ALUMBRADO_LAYER_IDS = new Set([
  'alumbrado_publico',
  'luminarias_tradicionales',
  'apoyos_alumbrado_publico',
  'luminarias_led',
]);

const HEADER_COLOR = '#F59E0B';

function fmt(n) {
  if (n === null || n === undefined) return '—';
  const num = Number(n);
  if (isNaN(num)) return '—';
  return num.toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

export default function AlumbradoPanel() {
  const { activeLayers } = useContext(MapContext);

  const isVisible = [...ALUMBRADO_LAYER_IDS].some(id => activeLayers.has(id));

  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [expanded, setExpanded] = useState(new Set());
  const [closed, setClosed]     = useState(false);

  // Re-mostrar panel si se activa una capa nueva
  useEffect(() => {
    if (isVisible) setClosed(false);
  }, [isVisible]);

  // Fetch al activar la primera capa
  useEffect(() => {
    if (!isVisible || data) return;

    setLoading(true);
    setError(null);
    const token = localStorage.getItem('token');
    fetch('/api/alumbrado/stats', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || `Error ${r.status}`);
        setData(d);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message || 'No se pudo cargar la información');
        setLoading(false);
      });
  }, [isVisible, data]);

  if (!isVisible || closed) return null;

  const toggleUba = (ubaId) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(ubaId) ? next.delete(ubaId) : next.add(ubaId);
      return next;
    });

  const layers = data?.layers ?? [];
  const totals = data?.totals ?? {};
  const porUba = data?.porUba ?? {};

  const totalGeneral = layers.reduce((sum, l) => sum + (totals[l.id] || 0), 0);

  return (
    <div className="alum-panel">
      {/* Header */}
      <div className="alum-panel__header" style={{ background: HEADER_COLOR }}>
        <div className="alum-panel__header-left">
          <span className="alum-panel__icon">💡</span>
          <div>
            <div className="alum-panel__subtitle">Infraestructura</div>
            <div className="alum-panel__title">Alumbrado Público</div>
          </div>
        </div>
        <button className="alum-panel__close" onClick={() => setClosed(true)} title="Cerrar">✖</button>
      </div>

      {/* Cuerpo */}
      <div className="alum-panel__body">
        {loading && <p className="alum-panel__msg">Cargando datos…</p>}
        {error   && <p className="alum-panel__msg alum-panel__msg--error">{error}</p>}

        {data && !loading && (
          <>
            {/* Totales municipio */}
            <div className="alum-panel__section">
              <div className="alum-panel__section-title" style={{ color: HEADER_COLOR }}>
                Totales Municipio
              </div>
              {layers.map(layer => (
                <div key={layer.id} className="alum-panel__row">
                  <span className="alum-panel__dot" style={{ background: layer.color }} />
                  <span className="alum-panel__label">{layer.label}</span>
                  <span className="alum-panel__value" style={{ color: layer.color }}>
                    {fmt(totals[layer.id])}
                  </span>
                </div>
              ))}
              <div className="alum-panel__row alum-panel__row--total">
                <span className="alum-panel__dot" style={{ background: HEADER_COLOR }} />
                <span className="alum-panel__label">Total</span>
                <span className="alum-panel__value" style={{ color: HEADER_COLOR }}>
                  {fmt(totalGeneral)}
                </span>
              </div>
            </div>

            {/* Distribución por UBA */}
            <div className="alum-panel__section">
              <div className="alum-panel__section-title" style={{ color: HEADER_COLOR }}>
                Distribución por UBA
              </div>

              {UBA_ORDER.map(ubaId => {
                const ubaData = porUba[ubaId];
                if (!ubaData) return null;
                const color   = UBA_COLORS[ubaId];
                const isOpen  = expanded.has(ubaId);
                const ubaTotal = layers.reduce((s, l) => s + (ubaData[l.id] || 0), 0);

                return (
                  <div key={ubaId} className="alum-panel__uba">
                    <button
                      className={`alum-panel__uba-header${isOpen ? ' alum-panel__uba-header--open' : ''}`}
                      onClick={() => toggleUba(ubaId)}
                    >
                      <span className="alum-panel__uba-dot" style={{ background: color }} />
                      <span className="alum-panel__uba-nombre">{ubaData.label}</span>
                      <span className="alum-panel__uba-total" style={{ color }}>{fmt(ubaTotal)}</span>
                      <span className="alum-panel__uba-chevron">{isOpen ? '▲' : '▼'}</span>
                    </button>

                    {isOpen && (
                      <div className="alum-panel__uba-detalle">
                        {layers.map(layer => (
                          <div key={layer.id} className="alum-panel__row">
                            <span className="alum-panel__dot" style={{ background: layer.color }} />
                            <span className="alum-panel__label">{layer.label}</span>
                            <span className="alum-panel__value" style={{ color: layer.color }}>
                              {fmt(ubaData[layer.id])}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
