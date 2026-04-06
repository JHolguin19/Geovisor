import { useContext, useEffect, useState } from 'react';
import MapContext from '../../context/MapContext';
import './SisbenUbaPanel.css';

// Mapeo de layer ID → ubaId para el endpoint
const SISBEN_UBA_LAYERS = {
  sis_uba1: 'uba1',
  sis_uba2: 'uba2',
  sis_uba3: 'uba3',
  sis_uba4: 'uba4',
  sis_uba5: 'uba5',
  sis_ubac: 'ubac'
};

const UBA_COLORS = {
  uba1: '#E53935', uba2: '#43A047', uba3: '#1E88E5',
  uba4: '#FB8C00', uba5: '#8E24AA', ubac: '#00ACC1'
};

const NUM_FIELDS = [
  { key: 'poblacion_total',    label: 'Población Total' },
  { key: 'poblacion_hombre',   label: 'Hombres' },
  { key: 'poblacion_mujer',    label: 'Mujeres' },
  { key: 'cantidad_hogares',   label: 'Hogares' },
  { key: 'cantidad_viviendas', label: 'Viviendas' },
  { key: 'personas_sisben',    label: 'Personas Sisben' },
];

function fmt(n) {
  const num = Number(n);
  return isNaN(num) || n === null ? '—' : num.toLocaleString('es-CO');
}

export default function SisbenUbaPanel() {
  const { activeLayers, setActiveLayers } = useContext(MapContext);

  // Determinar qué capa sisben-uba está activa (primera encontrada)
  const activeLayerId = Object.keys(SISBEN_UBA_LAYERS).find(id => activeLayers.has(id));
  const activeUbaId   = activeLayerId ? SISBEN_UBA_LAYERS[activeLayerId] : null;

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [expanded, setExpanded] = useState(new Set());

  // Fetch cuando cambia la UBA activa
  useEffect(() => {
    if (!activeUbaId) { setData(null); return; }

    setLoading(true);
    setError(null);
    setExpanded(new Set());

    const token = localStorage.getItem('token');
    fetch(`/api/sisben/uba/${activeUbaId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError('No se pudo cargar la información'); setLoading(false); });
  }, [activeUbaId]);

  if (!activeLayerId) return null;

  const color = UBA_COLORS[activeUbaId] ?? '#6A1B9A';

  const toggleBarrio = (nombre) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(nombre) ? next.delete(nombre) : next.add(nombre);
      return next;
    });

  const handleClose = () =>
    setActiveLayers(prev => {
      const next = new Set(prev);
      next.delete(activeLayerId);
      return next;
    });

  return (
    <div className="suba-panel">
      {/* Header */}
      <div className="suba-panel__header" style={{ background: color }}>
        <div className="suba-panel__header-left">
          <span className="suba-panel__icon">📊</span>
          <div>
            <div className="suba-panel__subtitle">Análisis Sisben</div>
            <div className="suba-panel__title">
              {data?.ubaLabel ?? activeUbaId.toUpperCase()}
            </div>
          </div>
        </div>
        <button className="suba-panel__close" onClick={handleClose} title="Cerrar">✖</button>
      </div>

      {/* Cuerpo */}
      <div className="suba-panel__body">
        {loading && <p className="suba-panel__msg">Cargando datos…</p>}
        {error   && <p className="suba-panel__msg suba-panel__msg--error">{error}</p>}

        {data && !loading && (
          <>
            {/* Totales */}
            <div className="suba-panel__section">
              <div className="suba-panel__section-title" style={{ color }}>
                Totales UBA · {data.totalBarrios} barrios
              </div>
              {NUM_FIELDS.map(({ key, label }) =>
                data.totals[key] > 0 ? (
                  <div key={key} className="suba-panel__row">
                    <span className="suba-panel__label">{label}</span>
                    <span className="suba-panel__value" style={{ color }}>{fmt(data.totals[key])}</span>
                  </div>
                ) : null
              )}
            </div>

            {/* Lista de barrios */}
            <div className="suba-panel__section">
              <div className="suba-panel__section-title" style={{ color }}>
                Barrios de la UBA
              </div>
              {data.barrios.length === 0 && (
                <p className="suba-panel__msg">Sin datos de barrios cruzados con Sisben.</p>
              )}
              {data.barrios.map((b, i) => {
                const nombre = b.nombre || b.nombre_barrio || b.NOMBRE || `Barrio ${i + 1}`;
                const isOpen = expanded.has(nombre);
                const detalle = NUM_FIELDS.filter(({ key }) => b[key] > 0);

                return (
                  <div key={nombre} className="suba-panel__barrio">
                    <button
                      className={`suba-panel__barrio-header${isOpen ? ' suba-panel__barrio-header--open' : ''}`}
                      onClick={() => toggleBarrio(nombre)}
                    >
                      <span className="suba-panel__barrio-dot" style={{ background: color }} />
                      <span className="suba-panel__barrio-nombre">{nombre}</span>
                      {b.poblacion_total > 0 && (
                        <span className="suba-panel__barrio-pob">{fmt(b.poblacion_total)} hab.</span>
                      )}
                      <span className="suba-panel__barrio-chevron">{isOpen ? '▲' : '▼'}</span>
                    </button>

                    {isOpen && detalle.length > 0 && (
                      <div className="suba-panel__barrio-detalle">
                        {detalle.map(({ key, label }) => (
                          <div key={key} className="suba-panel__row">
                            <span className="suba-panel__label">{label}</span>
                            <span className="suba-panel__value">{fmt(b[key])}</span>
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
