import { useContext, useEffect, useState } from 'react';
import MapContext from '../../context/MapContext';
import { UBA_COLORS, SIS_UBA_MAP } from '../../constants/ubas';
import './SisbenUbaPanel.css';

// Alias para mantener compatibilidad interna
const SISBEN_UBA_LAYERS = SIS_UBA_MAP;

// Grupos de variables en el mismo orden que el mapa de calor
const FIELD_GROUPS = [
  {
    label: 'Demografía',
    fields: [
      { key: 'poblacion_total',  label: 'Población Total' },
      { key: 'poblacion_hombre', label: 'Hombres' },
      { key: 'poblacion_mujer',  label: 'Mujeres' },
    ],
  },
  {
    label: 'Vivienda',
    fields: [
      { key: 'cantidad_hogares',   label: 'Hogares' },
      { key: 'cantidad_viviendas', label: 'Viviendas' },
    ],
  },
  {
    label: 'Indicadores Sisben',
    fields: [
      { key: 'personas_sisben',  label: 'Personas Sisben' },
      { key: 'puntaje_promedio', label: 'Puntaje Promedio', avg: true },
    ],
  },
  {
    label: 'Indicadores Sociales',
    fields: [
      { key: 'ipm',               label: 'Índice de Pobreza Multidimensional', avg: true },
      { key: 'incidencia_pobreza', label: 'Incidencia de Pobreza', avg: true },
      { key: 'nbi',               label: 'NBI', avg: true },
    ],
  },
  {
    label: 'Territorio',
    fields: [
      { key: 'area_m2', label: 'Área (m²)' },
    ],
  },
];

// Lista plana para el detalle de barrio
const ALL_FIELDS = FIELD_GROUPS.flatMap(g => g.fields);

// avg=true → son promedios/tasas, se muestran con 2 decimales; proporciones 0-1 como %
function fmt(n, avg = false) {
  if (n === null || n === undefined) return '—';
  const num = Number(n);
  if (isNaN(num)) return '—';
  if (avg) {
    // Detectar si es proporción 0-1
    if (num > 0 && num <= 1) return `${(num * 100).toLocaleString('es-CO', { maximumFractionDigits: 1 })}%`;
    return num.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return num.toLocaleString('es-CO', { maximumFractionDigits: 0 });
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
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.detail || d.error || `Error ${r.status}`);
        setData(d);
        setLoading(false);
      })
      .catch(e => { setError(e.message || 'No se pudo cargar la información'); setLoading(false); });
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

        {data && !loading && data.totals && (
          <>
            {/* Totales */}
            <div className="suba-panel__section">
              <div className="suba-panel__section-title" style={{ color }}>
                Totales UBA · {data.totalBarrios ?? 0} barrios
              </div>
              {FIELD_GROUPS.map(g => {
                const visibles = g.fields.filter(({ key }) => data.totals[key] != null && data.totals[key] !== 0);
                if (!visibles.length) return null;
                return (
                  <div key={g.label}>
                    <div className="suba-panel__group-label">{g.label}</div>
                    {visibles.map(({ key, label, avg }) => (
                      <div key={key} className="suba-panel__row">
                        <span className="suba-panel__label">{label}</span>
                        <span className="suba-panel__value" style={{ color }}>{fmt(data.totals[key], avg)}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
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
                const detalle = ALL_FIELDS.filter(({ key }) => b[key] != null && b[key] !== 0);

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
                        {detalle.map(({ key, label, avg }) => (
                          <div key={key} className="suba-panel__row">
                            <span className="suba-panel__label">{label}</span>
                            <span className="suba-panel__value">{fmt(b[key], avg)}</span>
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
