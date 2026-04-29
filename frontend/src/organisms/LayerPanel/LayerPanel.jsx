import { useState, useContext, useCallback } from 'react';
import MapContext from '../../context/MapContext';
import './LayerPanel.css';

// ── Definición de grupos de capas ─────────────────────────────────────────────
// allowedSecretarias: qué secretarías ven este grupo.
// 'sig' siempre ve todo. null/undefined = visible para todos.
const LAYER_GROUPS = [
  {
    id: 'planeacion',
    label: 'Secretaría de Planeación',
    accent: '#1A5F9B',
    allowedSecretarias: ['sig', 'planeacion'],
    layers: [],
    subcategories: [
      {
        label: 'Catastro',
        accent: '#1A5F9B',
        layers: [
          { id: 'predios_urbanos',   label: 'Predios Urbanos',   dot: '#E53935' },
          { id: 'nomenclatura_vial', label: 'Nomenclatura Vial', dot: '#64748B' },
          { id: 'barrios_urbanos',   label: 'Barrios Urbanos',   dot: '#94A3B8' },
        ]
      },
      {
        label: 'UBAs',
        accent: '#0EA5E9',
        layers: [
          { id: 'uba1', label: 'UBA 1', dot: '#E53935' },
          { id: 'uba2', label: 'UBA 2', dot: '#43A047' },
          { id: 'uba3', label: 'UBA 3', dot: '#1E88E5' },
          { id: 'uba4', label: 'UBA 4', dot: '#FB8C00' },
          { id: 'uba5', label: 'UBA 5', dot: '#8E24AA' },
          { id: 'ubac', label: 'UBA C', dot: '#00ACC1' },
        ]
      },
      {
        label: 'Usos de Suelo',
        accent: '#D97706',
        layers: [
          { id: 'uso_estanco',      label: 'Estanco',      dot: '#8B0000' },
          { id: 'uso_discotecas',   label: 'Discotecas',   dot: '#CC00CC' },
          { id: 'uso_droguerias',   label: 'Droguerías',   dot: '#00BFFF' },
          { id: 'uso_ferreterias',  label: 'Ferreterías',  dot: '#696969' },
          { id: 'uso_ips',          label: 'IPS',          dot: '#228B22' },
          { id: 'uso_restaurantes', label: 'Restaurantes', dot: '#FFA500' },
          { id: 'uso_servicios',    label: 'Servicios',    dot: '#4682B4' },
        ]
      },
    ]
  },

  {
    id: 'educacion',
    label: 'Secretaría de Educación',
    accent: '#E65100',
    allowedSecretarias: ['sig', 'educacion', 'planeacion'],
    layers: [
      { id: 'predios_educativos', label: 'Predios Educativos', dot: '#1E90FF' },
    ],
    subcategories: []
  },

  {
    id: 'equipo_institucional',
    label: 'Equipo Institucional',
    accent: '#00695C',
    allowedSecretarias: ['sig', 'gobierno', 'planeacion'],
    layers: [
      { id: 'equipo_institucional', label: 'Equipo Institucional', dot: '#3FEBBA' },
      { id: 'iglesias',             label: 'Iglesias',             dot: '#FFD700' },
    ],
    subcategories: []
  },

  {
    id: 'zonas_verdes',
    label: 'Zonas Verdes',
    accent: '#10B981',
    allowedSecretarias: ['sig', 'ambiente', 'deportes'],
    layers: [
      { id: 'zonas_verdes',            label: 'Zonas Verdes',             dot: '#006400' },
      { id: 'gimnasios_biosaludables', label: 'Gimnasios Biosaludables',  dot: '#22C55E' },
    ],
    subcategories: []
  },

  {
    id: 'sisben',
    label: 'Información Sisben',
    accent: '#6A1B9A',
    allowedSecretarias: ['sig', 'desarrollo_social', 'salud', 'planeacion'],
    layers: [
      { id: 'sisben_barrios', label: 'Sisben Barrios', dot: '#9C27B0' },
      { id: 'sisben_uba2',    label: 'Sisben UBA 2',  dot: '#AB47BC' },
      { id: 'sisben_uba4',    label: 'Sisben UBA 4',  dot: '#CE93D8' },
    ],
    subcategories: [
      {
        label: 'Análisis por UBA',
        accent: '#6A1B9A',
        layers: [
          { id: 'sis_uba1', label: 'UBA 1 — Sisben', dot: '#E53935' },
          { id: 'sis_uba2', label: 'UBA 2 — Sisben', dot: '#43A047' },
          { id: 'sis_uba3', label: 'UBA 3 — Sisben', dot: '#1E88E5' },
          { id: 'sis_uba4', label: 'UBA 4 — Sisben', dot: '#FB8C00' },
          { id: 'sis_uba5', label: 'UBA 5 — Sisben', dot: '#8E24AA' },
          { id: 'sis_ubac', label: 'UBA C — Sisben', dot: '#00ACC1' },
        ]
      }
    ]
  },

  {
    id: 'salud',
    label: 'Secretaría de Salud',
    accent: '#E11D48',
    allowedSecretarias: ['sig', 'salud'],
    layers: [
      { id: 'ipm_santander',          label: 'IPM — Pobreza Multidimensional', dot: '#e31a1c' },
      { id: 'ips_salud',              label: 'IPS',                   dot: '#0EA5E9' },
      { id: 'cuadrantes_salud',       label: 'Cuadrantes Policía',    dot: '#E11D48' },
      { id: 'territorios_salud',      label: 'Territorios de Salud',  dot: '#8B5CF6' },
      { id: 'microterritorios_salud', label: 'Microterritorios',      dot: '#F59E0B' },
      { id: 'veredas_salud',          label: 'Veredas',               dot: '#16A34A' },
      { id: 'zona_influencia_salud',  label: 'Zona de Influencia 30m',dot: '#06B6D4' },
    ],
    subcategories: []
  },

  {
    id: 'infraestructura',
    label: 'Secretaría de Infraestructura',
    accent: '#F59E0B',
    allowedSecretarias: ['sig', 'obras'],
    layers: [],
    subcategories: [
      {
        label: 'Alumbrado Público',
        accent: '#F59E0B',
        layers: [
          { id: 'alumbrado_publico',        label: 'Transformadores',          dot: '#2563EB' },
          { id: 'luminarias_tradicionales', label: 'Luminarias Tradicionales', dot: '#FBBF24' },
          { id: 'apoyos_alumbrado_publico', label: 'Apoyos Alumbrado Público', dot: '#F97316' },
          { id: 'luminarias_led',           label: 'Luminarias LED',           dot: '#A3E635' },
          { id: 'rutas_alumbrado_publico',  label: 'Rutas Alumbrado Público',  dot: '#DC2626' },
        ]
      },
      {
        label: 'Pavimentación 2025',
        accent: '#78716C',
        layers: [
          { id: 'obras_pavimentacion', label: 'Obras de Pavimentación',            dot: '#57534E' },
          { id: 'pavimentacion2',      label: 'Pavimentación 2 - Infraestructura', dot: '#A8A29E' },
        ]
      }
    ]
  }
];

// ── Componentes internos ───────────────────────────────────────────────────────
function LayerItem({ layer, active, onToggle }) {
  return (
    <label className={`layer-item${active ? ' layer-item--active' : ''}`}>
      <input
        type="checkbox"
        className="layer-checkbox"
        checked={active}
        onChange={() => onToggle(layer.id)}
      />
      <span className="layer-dot" style={{ background: layer.dot }} />
      <span className="layer-label">{layer.label}</span>
      {active && <span className="layer-active-badge" />}
    </label>
  );
}

// ── Panel principal ────────────────────────────────────────────────────────────
export default function LayerPanel({ isOpen, onClose, secretariaId = 'sig' }) {
  const { activeLayers, setActiveLayers } = useContext(MapContext);

  // Filtrar grupos según la secretaría activa.
  // 'sig' (o sin ID) ve todos los grupos.
  const visibleGroups = LAYER_GROUPS.filter(g =>
    !g.allowedSecretarias ||
    g.allowedSecretarias.includes(secretariaId) ||
    secretariaId === 'sig'
  );

  // Estado de colapso: todos colapsados excepto el primer grupo visible
  const initialCollapsed = Object.fromEntries(
    visibleGroups.map((g, i) => [g.id, i !== 0])
  );
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [collapsedSubs, setCollapsedSubs] = useState({});

  const toggle = useCallback((id) =>
    setCollapsed(p => ({ ...p, [id]: !p[id] })), []);

  const toggleSub = useCallback((key) =>
    setCollapsedSubs(p => ({ ...p, [key]: !p[key] })), []);

  const toggleLayer = useCallback((layerId) =>
    setActiveLayers(prev => {
      const next = new globalThis.Set(prev);
      next.has(layerId) ? next.delete(layerId) : next.add(layerId);
      return next;
    }), [setActiveLayers]);

  const countActive = (group) => {
    const all = [
      ...group.layers,
      ...(group.subcategories?.flatMap(s => s.layers) ?? [])
    ];
    return all.filter(l => activeLayers.has(l.id)).length;
  };

  return (
    <aside className={`layer-panel${isOpen ? ' layer-panel--open' : ''}`}>
      {/* Panel header */}
      <div className="lp-header">
        <svg className="lp-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 13l4.553 2.276A1 1 0 0021 21.382V10.618a1 1 0 00-.553-.894L15 7m0 13V7m0 0L9 4" />
        </svg>
        <span>Capas</span>
        {onClose && (
          <button className="lp-close-btn" onClick={onClose} aria-label="Cerrar panel">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Grupos de capas */}
      <div className="lp-groups">
        {visibleGroups.map(group => {
          const active = countActive(group);
          const groupOpen = !collapsed[group.id];
          return (
            <div key={group.id} className="lp-group">
              <button
                className="lp-group-btn"
                style={{ '--accent': group.accent }}
                onClick={() => toggle(group.id)}
              >
                <span className="lp-group-accent-bar" />
                <span className="lp-group-name">{group.label}</span>
                {active > 0 && <span className="lp-badge">{active}</span>}
                <svg
                  className={`lp-chevron${groupOpen ? ' open' : ''}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {groupOpen && (
                <div className="lp-group-content">
                  {/* Capas directas del grupo */}
                  {group.layers.map(layer => (
                    <LayerItem
                      key={layer.id}
                      layer={layer}
                      active={activeLayers.has(layer.id)}
                      onToggle={toggleLayer}
                    />
                  ))}

                  {/* Subcategorías */}
                  {group.subcategories?.map(sub => {
                    const subKey = `${group.id}__${sub.label}`;
                    const subOpen = !collapsedSubs[subKey];
                    const subActive = sub.layers.filter(l => activeLayers.has(l.id)).length;
                    return (
                      <div key={sub.label} className="lp-subcategory">
                        <button
                          className="lp-subcategory-btn"
                          style={{ '--accent': sub.accent }}
                          onClick={() => toggleSub(subKey)}
                        >
                          <span className="lp-sub-bar" />
                          <span className="lp-sub-name">{sub.label}</span>
                          {subActive > 0 && <span className="lp-badge lp-badge--sm">{subActive}</span>}
                          <svg
                            className={`lp-chevron lp-chevron--sm${subOpen ? ' open' : ''}`}
                            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>
                        {subOpen && sub.layers.map(layer => (
                          <LayerItem
                            key={layer.id}
                            layer={layer}
                            active={activeLayers.has(layer.id)}
                            onToggle={toggleLayer}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="lp-footer">
        <span>PostGIS · Alcaldía Santander de Quilichao</span>
      </div>
    </aside>
  );
}
