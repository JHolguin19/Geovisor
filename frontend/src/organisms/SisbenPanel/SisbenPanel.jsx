import { useContext } from 'react';
import MapContext from '../../context/MapContext';
import './SisbenPanel.css';

// Etiquetas para campos conocidos de Sisben
const FIELD_LABELS = {
  nombre:              'Barrio',
  nombre_barrio:       'Barrio',
  poblacion_total:     'Población Total',
  poblacion_hombre:    'Población Hombres',
  poblacion_mujer:     'Población Mujeres',
  cantidad_hogares:    'Cantidad de Hogares',
  cantidad_viviendas:  'Cantidad de Viviendas',
  ipm:                 'Índice de Pobreza Multidimensional',
  incidencia_pobreza:  'Incidencia de Pobreza (%)',
  personas_sisben:     'Personas en Sisben',
  puntaje_promedio:    'Puntaje Promedio Sisben',
  nbi:                 'NBI (%)',
  area_m2:             'Área (m²)',
  uba:                 'UBA',
};

// Campos a omitir en el panel (identificadores y columnas técnicas)
const SKIP_KEYS = new Set([
  'geometry', '_coloridx', 'bbox', 'fid', 'gid', 'id',
  'cod', 'codigo', 'barrio_sa', 'barriosa', 'barrio_1', 'barrio1',
  'objectid', 'shape_leng', 'shape_area', 'geom',
]);

function shouldSkip(key) {
  return SKIP_KEYS.has(key.toLowerCase()) || key.startsWith('_');
}

// Secciones para organizar el panel
const SECTIONS = [
  {
    title: 'Demografía',
    icon: '👥',
    fields: ['poblacion_total', 'poblacion_hombre', 'poblacion_mujer'],
  },
  {
    title: 'Vivienda y Hogar',
    icon: '🏠',
    fields: ['cantidad_viviendas', 'cantidad_hogares'],
  },
  {
    title: 'Indicadores Sociales',
    icon: '📊',
    fields: ['ipm', 'incidencia_pobreza', 'nbi', 'personas_sisben', 'puntaje_promedio'],
  },
  {
    title: 'Territorio',
    icon: '📍',
    fields: ['uba', 'area_m2'],
  },
];

function formatValue(key, value) {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if (!isNaN(num)) {
    // Área en m²
    if (key === 'area_m2') return `${num.toLocaleString('es-CO')} m²`;
    // Valores entre 0 y 1 son proporciones almacenadas → convertir a porcentaje (sin decimales)
    if (num > 0 && num < 1) {
      return `${Math.round(num * 100).toLocaleString('es-CO')}%`;
    }
    // Decimales mayores a 1
    if (!Number.isInteger(num)) {
      return num.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return num.toLocaleString('es-CO');
  }
  return String(value);
}

function labelForField(key) {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function SisbenPanel() {
  const { selectedSisbenBarrio, setSelectedSisbenBarrio } = useContext(MapContext);

  if (!selectedSisbenBarrio) return null;

  const barrio = selectedSisbenBarrio.nombre
    || selectedSisbenBarrio.nombre_barrio
    || selectedSisbenBarrio.NOMBRE
    || 'Barrio';

  // Campos que quedan fuera de las secciones definidas
  const sectionFields = new Set(SECTIONS.flatMap(s => s.fields));
  const nameFields = new Set(['nombre', 'nombre_barrio', 'NOMBRE']);
  const extraEntries = Object.entries(selectedSisbenBarrio).filter(
    ([k]) => !shouldSkip(k) && !sectionFields.has(k) && !nameFields.has(k)
  );

  return (
    <div className="sisben-panel">
      {/* Header */}
      <div className="sisben-panel__header">
        <div className="sisben-panel__header-left">
          <span className="sisben-panel__icon">📊</span>
          <div>
            <div className="sisben-panel__subtitle">Información Sisben</div>
            <div className="sisben-panel__title">{barrio}</div>
          </div>
        </div>
        <button
          className="sisben-panel__close"
          onClick={() => setSelectedSisbenBarrio(null)}
          title="Cerrar panel"
        >
          ✖
        </button>
      </div>

      {/* Secciones con datos */}
      <div className="sisben-panel__body">
        {SECTIONS.map(section => {
          const entries = section.fields
            .map(f => [f, selectedSisbenBarrio[f]])
            .filter(([, v]) => v !== null && v !== undefined && v !== '');

          if (!entries.length) return null;

          return (
            <div key={section.title} className="sisben-panel__section">
              <div className="sisben-panel__section-title">
                <span>{section.icon}</span>
                {section.title}
              </div>
              {entries.map(([key, value]) => (
                <div key={key} className="sisben-panel__row">
                  <span className="sisben-panel__label">{labelForField(key)}</span>
                  <span className="sisben-panel__value">{formatValue(key, value)}</span>
                </div>
              ))}
            </div>
          );
        })}

        {/* Campos adicionales no categorizados */}
        {extraEntries.length > 0 && (
          <div className="sisben-panel__section">
            <div className="sisben-panel__section-title">
              <span>🗂️</span>
              Otros datos
            </div>
            {extraEntries.map(([key, value]) => (
              <div key={key} className="sisben-panel__row">
                <span className="sisben-panel__label">{labelForField(key)}</span>
                <span className="sisben-panel__value">{formatValue(key, value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
