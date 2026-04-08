import { useContext, useMemo } from 'react';
import MapContext from '../../context/MapContext';
import './SisbenHeatmapPanel.css';

// Etiquetas legibles para campos numéricos conocidos
const FIELD_LABELS = {
  poblacion_total:    'Población Total',
  poblacion_hombre:   'Población Hombres',
  poblacion_mujer:    'Población Mujeres',
  cantidad_hogares:   'Cantidad de Hogares',
  cantidad_viviendas: 'Cantidad de Viviendas',
  ipm:                'Índice de Pobreza Multidimensional',
  incidencia_pobreza: 'Incidencia de Pobreza (%)',
  personas_sisben:    'Personas en Sisben',
  puntaje_promedio:   'Puntaje Promedio Sisben',
  nbi:                'NBI (%)',
  area_m2:            'Área (m²)',
};

// Orden y agrupación idénticos al panel lateral (SisbenPanel)
const VARIABLE_GROUPS = [
  {
    label: 'Demografía',
    fields: ['poblacion_total', 'poblacion_hombre', 'poblacion_mujer'],
  },
  {
    label: 'Vivienda y Hogar',
    fields: ['cantidad_viviendas', 'cantidad_hogares'],
  },
  {
    label: 'Indicadores Sociales',
    fields: ['ipm', 'incidencia_pobreza', 'nbi', 'personas_sisben', 'puntaje_promedio'],
  },
  {
    label: 'Territorio',
    fields: ['area_m2'],
  },
];

// Campos que nunca son variables de calor (identificadores, geometría, texto)
const SKIP_HEATMAP = new Set([
  'geometry', '_coloridx', 'bbox', 'fid', 'gid', 'id',
  'cod', 'codigo', 'barrio_sa', 'barriosa', 'barrio_1', 'barrio1',
  'objectid', 'shape_leng', 'shape_area', 'geom',
  'nombre', 'nombre_barrio', 'nombre_barrio_sa', 'nombre1',
  'uba',  // texto, no numérico
]);

// Conjunto de campos ya cubiertos por las secciones fijas
const DEFINED_FIELDS = new Set(VARIABLE_GROUPS.flatMap(g => g.fields));

function fieldLabel(key) {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function computeRange(features, variable) {
  const values = features
    .map(p => Number(p[variable]))
    .filter(v => !isNaN(v) && isFinite(v));
  if (!values.length) return { min: 0, max: 0 };
  return { min: Math.min(...values), max: Math.max(...values) };
}

// Si asPct=true, multiplica por 100 y agrega % (para proporciones 0-1)
function fmt(n, asPct = false) {
  if (n === null || n === undefined) return '—';
  const num = Number(n);
  if (isNaN(num)) return String(n);
  if (asPct) return `${Math.round(num * 100).toLocaleString('es-CO')}%`;
  if (!Number.isInteger(num)) return num.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return num.toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

export default function SisbenHeatmapPanel() {
  const {
    activeLayers,
    sisbenBarriosFeatures,
    sisbenHeatmapVariable,
    setSisbenHeatmapVariable,
  } = useContext(MapContext);

  // Visible cuando sisben_barrios o cualquier capa sis_uba* está activa
  const SIS_UBA_IDS = ['sis_uba1', 'sis_uba2', 'sis_uba3', 'sis_uba4', 'sis_uba5', 'sis_ubac'];
  const isSisbenActive = activeLayers.has('sisben_barrios') || SIS_UBA_IDS.some(id => activeLayers.has(id));
  if (!isSisbenActive) return null;

  // Grupos fijos filtrados por presencia en datos + grupo dinámico "Otros datos"
  const availableGroups = useMemo(() => {
    if (!sisbenBarriosFeatures?.length) return [];

    // Construir un Set de claves que tienen al menos un valor numérico en cualquier feature
    const keysWithData = new Set();
    for (const feat of sisbenBarriosFeatures) {
      for (const [k, v] of Object.entries(feat)) {
        if (v !== null && v !== '' && !isNaN(Number(v)) && isFinite(Number(v))) {
          keysWithData.add(k);
        }
      }
    }

    const fixed = VARIABLE_GROUPS.map(g => ({
      ...g,
      fields: g.fields.filter(f => keysWithData.has(f)),
    })).filter(g => g.fields.length > 0);

    // Campos numéricos presentes en los datos pero no en ninguna sección fija
    const extra = [...keysWithData].filter(key => {
      if (SKIP_HEATMAP.has(key.toLowerCase()) || key.startsWith('_')) return false;
      return !DEFINED_FIELDS.has(key);
    });

    if (extra.length > 0) {
      fixed.push({ label: 'Otros datos', fields: extra });
    }

    return fixed;
  }, [sisbenBarriosFeatures]);

  const numericFields = useMemo(() => availableGroups.flatMap(g => g.fields), [availableGroups]);

  const { min, max } = useMemo(() => {
    if (!sisbenHeatmapVariable || !sisbenBarriosFeatures?.length)
      return { min: 0, max: 0 };
    return computeRange(sisbenBarriosFeatures, sisbenHeatmapVariable);
  }, [sisbenHeatmapVariable, sisbenBarriosFeatures]);

  // Detectar si la variable activa es una proporción (valores entre 0 y 1)
  const isProportionVar = useMemo(() => {
    if (!sisbenHeatmapVariable || !sisbenBarriosFeatures?.length) return false;
    const values = sisbenBarriosFeatures
      .map(p => Number(p[sisbenHeatmapVariable]))
      .filter(v => !isNaN(v) && isFinite(v));
    return values.length > 0
      && values.every(v => v >= 0 && v <= 1)
      && values.some(v => v > 0 && v < 1);
  }, [sisbenHeatmapVariable, sisbenBarriosFeatures]);

  const isLoading = !sisbenBarriosFeatures;

  return (
    <div className="shp">
      {/* Header */}
      <div className="shp__header">
        <svg className="shp__header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="4" height="18" rx="1" fill="#f3e5f5" stroke="none"/>
          <rect x="9" y="7" width="4" height="14" rx="1" fill="#ce93d8" stroke="none"/>
          <rect x="15" y="11" width="4" height="10" rx="1" fill="#7b1fa2" stroke="none"/>
          <line x1="2" y1="21" x2="22" y2="21" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
        <span>Mapa de Calor Sisben</span>
      </div>

      <div className="shp__body">
        {isLoading ? (
          <p className="shp__loading">Cargando datos de la capa...</p>
        ) : numericFields.length === 0 ? (
          <p className="shp__loading">No se detectaron campos numéricos.</p>
        ) : (
          <>
            {/* Selector de variable */}
            <div className="shp__field-row">
              <label className="shp__label" htmlFor="shp-variable">Variable</label>
              <select
                id="shp-variable"
                className="shp__select"
                value={sisbenHeatmapVariable || ''}
                onChange={e => setSisbenHeatmapVariable(e.target.value || null)}
              >
                <option value="">— Seleccionar variable —</option>
                {availableGroups.map(g => (
                  <optgroup key={g.label} label={g.label}>
                    {g.fields.map(f => (
                      <option key={f} value={f}>{fieldLabel(f)}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Leyenda de color cuando hay variable seleccionada */}
            {sisbenHeatmapVariable && (
              <div className="shp__legend">
                <div className="shp__legend-title">{fieldLabel(sisbenHeatmapVariable)}</div>
                <div className="shp__gradient-row">
                  <span className="shp__range-val">{fmt(min, isProportionVar)}</span>
                  <div className="shp__gradient-bar" />
                  <span className="shp__range-val">{fmt(max, isProportionVar)}</span>
                </div>
                <div className="shp__gradient-labels">
                  <span>Menor</span>
                  <span>Mayor</span>
                </div>
                <button
                  className="shp__reset-btn"
                  onClick={() => setSisbenHeatmapVariable(null)}
                >
                  Volver a colores por barrio
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
