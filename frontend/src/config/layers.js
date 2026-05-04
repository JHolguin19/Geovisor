// Configuración de todas las capas — servidas directamente desde PostGIS
// Organizadas por secretaría para fácil mantenimiento

import { UBA_DATA as _UBA_DATA, UBA_COLORS } from '../constants/ubas';

// SLD personalizado para predios urbanos — estilo catastral profesional
const PREDIOS_SLD = `<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"><NamedLayer><Name>pg_predios_urbanos_m</Name><UserStyle><FeatureTypeStyle><Rule><PolygonSymbolizer><Fill><CssParameter name="fill-opacity">0</CssParameter></Fill><Stroke><CssParameter name="stroke">#E53935</CssParameter><CssParameter name="stroke-width">0.8</CssParameter></Stroke></PolygonSymbolizer></Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>`;

// SLD para capas de pavimentación — relleno gris asfalto semitransparente
const makePavimentacionSLD = (layerName) => `<?xml version="1.0" encoding="UTF-8"?>
<StyledLayerDescriptor version="1.0.0"
  xmlns="http://www.opengis.net/sld"
  xmlns:ogc="http://www.opengis.net/ogc"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <NamedLayer>
    <Name>${layerName}</Name>
    <UserStyle>
      <FeatureTypeStyle>
        <Rule>
          <PolygonSymbolizer>
            <Fill>
              <CssParameter name="fill">#57534E</CssParameter>
              <CssParameter name="fill-opacity">0.55</CssParameter>
            </Fill>
            <Stroke>
              <CssParameter name="stroke">#292524</CssParameter>
              <CssParameter name="stroke-width">1.2</CssParameter>
              <CssParameter name="stroke-opacity">0.9</CssParameter>
            </Stroke>
          </PolygonSymbolizer>
        </Rule>
      </FeatureTypeStyle>
    </UserStyle>
  </NamedLayer>
</StyledLayerDescriptor>`;

// Helper para crear capa vectorial (polígono, punto o línea)
const createVectorLayer = (config) => ({
  type: 'geojson',
  visible: config.visible ?? false,
  opacity: config.opacity ?? 1,
  queryable: config.queryable ?? true,
  zIndex: config.group === 'uso_suelo' ? 20 : 1,
  ...config
});

// Alias internos — todas las capas son vectoriales desde PostGIS
const createWmsLayer = createVectorLayer;
const createWfsLayer = (config) => ({
  type: 'geojson',
  visible: config.visible ?? false,
  queryable: config.queryable ?? true,
  zIndex: 10,
  ...config
});

// ============================
// CAPAS POR SECRETARÍA
// ============================

export const LAYERS_BY_SECRETARIA = {
  planeacion: {
    name: 'Secretaría de Planeación',
    icon: '📋',
    color: '#1976d2',
    layers: [
      createWmsLayer({
        id: 'predios_urbanos',
        name: 'Predios Urbanos',
        tableName: 'predios_2025_m',
        color: '#E53935',
        cols: 'matriculainmobiliaria,codigo,direccion,areaterreno_m2,areaconstruida_m2,avaluo,destinoeconomico',
        visible: true,
        queryable: true,
        zIndex: 2,
        description: 'Predios urbanos del municipio',
        popupFields: [
          { field: 'matriculainmobiliaria', label: 'Matrícula Inmobiliaria' },
          { field: 'codigo', label: 'Número Predial' },
          { field: 'direccion', label: 'Dirección' },
          { field: 'areaterreno_m2', label: 'Área Terreno (m²)' },
          { field: 'areaconstruida_m2', label: 'Área Construida (m²)' },
          { field: 'avaluo', label: 'Avalúo' },
          { field: 'destinoeconomico', label: 'Destino Económico' }
        ]
      }),
      createWmsLayer({
        id: 'nomenclatura_vial',
        name: 'Nomenclatura Vial',
        tableName: 'SANTANDER IGAC 2025 — U_NOMENCLATURA_VIAL_2025',
        visible: true,
        queryable: true,
        description: 'Nomenclatura vial del municipio'
      }),
      createWfsLayer({
        id: 'barrios_urbanos',
        name: 'Barrios Urbanos',
        tableName: 'barriosurbanos',
        visible: false,
        queryable: true,
        description: 'Barrios del área urbana',
        geometryType: 'polygon'
      }),
      // UBAs
      createWfsLayer({
        id: 'uba1',
        name: 'UBA 1',
        tableName: 'BARR_UBA_1',
        visible: false,
        queryable: true,
        group: 'ubas',
        geometryType: 'polygon',
        description: 'Unidad Barrial de Atención 1'
      }),
      createWfsLayer({
        id: 'uba2',
        name: 'UBA 2',
        tableName: 'BARR_UBA2',
        visible: false,
        queryable: true,
        group: 'ubas',
        geometryType: 'polygon'
      }),
      createWfsLayer({
        id: 'uba3',
        name: 'UBA 3',
        tableName: 'BARR_UBA3',
        visible: false,
        queryable: true,
        group: 'ubas',
        geometryType: 'polygon'
      }),
      createWfsLayer({
        id: 'uba4',
        name: 'UBA 4',
        tableName: 'BARR_UBA4',
        visible: false,
        queryable: true,
        group: 'ubas',
        geometryType: 'polygon'
      }),
      createWfsLayer({
        id: 'uba5',
        name: 'UBA 5',
        tableName: 'BARR_UBA5',
        visible: false,
        queryable: true,
        group: 'ubas',
        geometryType: 'polygon'
      }),
      createWfsLayer({
        id: 'ubac',
        name: 'UBA C',
        tableName: 'BARRIOS_UBA_C',
        visible: false,
        queryable: true,
        group: 'ubas',
        geometryType: 'polygon',
        description: 'Unidad Barrial de Atención Centro'
      }),
      // Uso de Suelos
      createWmsLayer({
        id: 'uso_estanco',
        name: 'Estanco',
        tableName: 'uds_barestanco',
        style: 'pg_uds_estancos',
        visible: false,
        queryable: true,
        group: 'uso_suelo',
        color: '#8B0000'
      }),
      createWmsLayer({
        id: 'uso_discotecas',
        name: 'Discotecas',
        tableName: 'uso_de_suelos_discotecas',
        style: 'pg_uds_discotecas',
        visible: false,
        queryable: true,
        group: 'uso_suelo',
        color: '#FF00FF'
      }),
      createWmsLayer({
        id: 'uso_droguerias',
        name: 'Droguerías',
        tableName: 'uds2_droguerias',
        style: 'pg_uds_drogueria',
        visible: false,
        queryable: true,
        group: 'uso_suelo',
        color: '#00BFFF'
      }),
      createWmsLayer({
        id: 'uso_ferreterias',
        name: 'Ferreterías',
        tableName: 'uds_ferreterias',
        style: 'pg_uds_ferreteria',
        visible: false,
        queryable: true,
        group: 'uso_suelo',
        color: '#696969'
      }),
      createWmsLayer({
        id: 'uso_ips',
        name: 'IPS',
        tableName: 'uds_ips',
        style: 'pg_uds_ips',
        visible: false,
        queryable: true,
        group: 'uso_suelo',
        color: '#228B22'
      }),
      createWmsLayer({
        id: 'uso_restaurantes',
        name: 'Restaurantes',
        tableName: 'uds_restaurantes',
        style: 'pg_uds_restaurante',
        visible: false,
        queryable: true,
        group: 'uso_suelo',
        color: '#FFA500'
      }),
      createWmsLayer({
        id: 'uso_servicios',
        name: 'Servicios',
        tableName: 'uds_otros',
        style: 'pg_uds_otros',
        visible: false,
        queryable: true,
        group: 'uso_suelo',
        color: '#4682B4'
      })
    ]
  },

  zonas_verdes: {
    name: 'Zonas Verdes',
    icon: '🌳',
    color: '#28a745',
    layers: [
      createWmsLayer({
        id: 'zonas_verdes',
        name: 'Zonas Verdes',
        tableName: 'zonasverdes',
        color: '#006400',
        visible: false,
        queryable: true,
        zIndex: 20,
        description: 'Áreas verdes y espacios públicos'
      }),
      createWmsLayer({
        id: 'gimnasios_biosaludables',
        name: 'Gimnasios Biosaludables',
        tableName: 'Gimnasiosbiosaludables',
        color: '#22C55E',
        visible: false,
        queryable: true,
        zIndex: 20,
        description: 'Gimnasios al aire libre y equipamiento biosaludable'
      }),
    ]
  },

  sisben: {
    name: 'Información Sisben',
    icon: '📊',
    color: '#9c27b0',
    layers: [
      createWfsLayer({
        id: 'sisben_barrios',
        name: 'Sisben Barrios',
        tableName: 'sisben_barrios',
        visible: false,
        queryable: true,
        geometryType: 'polygon',
        description: 'Información Sisben por barrios'
      }),
      createWmsLayer({
        id: 'sisben_uba2',
        name: 'Sisben UBA 2',
        tableName: 'uba2_datospoblaciones',
        color: '#AB47BC',
        visible: false,
        queryable: true,
        popupFields: [
          { field: 'poblacion_total', label: 'Población Total' },
          { field: 'poblacion_hombre', label: 'Población Hombres' },
          { field: 'poblacion_mujer', label: 'Población Mujeres' },
          { field: 'cantidad_hogares', label: 'Cantidad Hogares' },
          { field: 'cantidad_viviendas', label: 'Cantidad Viviendas' }
        ]
      }),
      createWmsLayer({
        id: 'sisben_uba4',
        name: 'Sisben UBA 4',
        tableName: 'uba4_sisben_barrios',
        color: '#CE93D8',
        visible: false,
        queryable: true
      }),
      // ── Análisis Sisben por UBA ──────────────────────────────────────────
      // Muestran geometría de barrios de cada UBA y activan el panel de
      // estadísticas Sisben cruzado con los datos de cada unidad barrial
      createWfsLayer({
        id: 'sis_uba1', name: 'UBA 1 — Sisben', tableName: 'BARR_UBA_1',
        color: '#E53935', visible: false, queryable: false,
        group: 'sisben_ubas', geometryType: 'polygon'
      }),
      createWfsLayer({
        id: 'sis_uba2', name: 'UBA 2 — Sisben', tableName: 'BARR_UBA2',
        color: '#43A047', visible: false, queryable: false,
        group: 'sisben_ubas', geometryType: 'polygon'
      }),
      createWfsLayer({
        id: 'sis_uba3', name: 'UBA 3 — Sisben', tableName: 'BARR_UBA3',
        color: '#1E88E5', visible: false, queryable: false,
        group: 'sisben_ubas', geometryType: 'polygon'
      }),
      createWfsLayer({
        id: 'sis_uba4', name: 'UBA 4 — Sisben', tableName: 'BARR_UBA4',
        color: '#FB8C00', visible: false, queryable: false,
        group: 'sisben_ubas', geometryType: 'polygon'
      }),
      createWfsLayer({
        id: 'sis_uba5', name: 'UBA 5 — Sisben', tableName: 'BARR_UBA5',
        color: '#8E24AA', visible: false, queryable: false,
        group: 'sisben_ubas', geometryType: 'polygon'
      }),
      createWfsLayer({
        id: 'sis_ubac', name: 'UBA C — Sisben', tableName: 'BARRIOS_UBA_C',
        color: '#00ACC1', visible: false, queryable: false,
        group: 'sisben_ubas', geometryType: 'polygon'
      })
    ]
  },

  educacion: {
    name: 'Secretaría de Educación',
    icon: '🎓',
    color: '#ff9800',
    layers: [
      createWmsLayer({
        id: 'predios_educativos',
        name: 'Predios Educativos',
        tableName: 'predios_educativos',
        color: '#1E90FF',
        visible: false,
        queryable: true,
        zIndex: 10,
        description: 'Instituciones educativas',
        popupFields: [
          { field: 'Nombre', label: 'Nombre' },
          { field: 'sede', label: 'Sede' },
          { field: 'NOMBRE_2', label: 'Barrio' },
          { field: 'educacion', label: 'Tipo' },
          { field: 'numero_estudiantes', label: 'Número de Estudiantes' },
          { field: 'jornada', label: 'Jornada' }
        ]
      })
    ]
  },

  equipo_institucional: {
    name: 'Equipo Institucional',
    icon: '🏛️',
    color: '#3f51b5',
    layers: [
      createWmsLayer({
        id: 'equipo_institucional',
        name: 'Equipo Institucional',
        tableName: 'predios_equipo_institucional',
        color: '#3FEBBA',
        visible: false,
        queryable: true,
        zIndex: 10,
        description: 'Equipamiento institucional'
      }),
      createWmsLayer({
        id: 'iglesias',
        name: 'Iglesias',
        tableName: 'predios_iglesias',
        color: '#FFD700',
        visible: false,
        queryable: true,
        description: 'Templos e iglesias'
      })
    ]
  },

  salud: {
    name: 'Secretaría de Salud',
    icon: '🏥',
    color: '#e11d48',
    layers: [
      createWfsLayer({
        id: 'cuadrantes_salud',
        name: 'Cuadrantes Policía',
        tableName: 'Cuadrantes_salud',
        visible: false,
        queryable: true,
        geometryType: 'polygon',
        color: '#e11d48',
        labelField: 'Nombre',
        description: 'División en cuadrantes del sistema de salud municipal',
        popupFields: [
          { field: 'Nombre', label: 'Cuadrante' }
        ]
      }),
      createWfsLayer({
        id: 'ips_salud',
        name: 'IPS',
        tableName: 'IPS_salud',
        visible: false,
        queryable: true,
        geometryType: 'point',
        color: '#0ea5e9',
        description: 'Instituciones Prestadoras de Salud',
        popupFields: [
          { field: 'Instituci', label: 'Institución' },
          { field: 'Field5',    label: 'Dirección' },
          { field: 'Field6',    label: 'Teléfono' },
          { field: 'Field7',    label: 'Tipo' }
        ]
      }),
      createWfsLayer({
        id: 'microterritorios_salud',
        name: 'Microterritorios',
        tableName: 'MICROTERRITORIOS_salud',
        visible: false,
        queryable: true,
        geometryType: 'polygon',
        color: '#f59e0b',
        description: 'Microterritorios del sistema de salud',
        popupFields: [
          { field: 'CODIGO',     label: 'Código' },
          { field: 'num_hogare', label: 'Número de Hogares' }
        ]
      }),
      createWfsLayer({
        id: 'territorios_salud',
        name: 'Territorios de Salud',
        tableName: 'Territorios_salud',
        visible: false,
        queryable: true,
        geometryType: 'polygon',
        color: '#8b5cf6',
        description: 'Territorios de atención en salud',
        popupFields: [
          { field: 'Codigo',    label: 'Código' },
          { field: 'Num_hogar', label: 'Número de Hogares' }
        ]
      }),
      createWfsLayer({
        id: 'veredas_salud',
        name: 'Veredas',
        tableName: 'veredas_salud',
        visible: false,
        queryable: true,
        geometryType: 'polygon',
        color: '#16a34a',
        labelField: 'nombre',
        description: 'Veredas del municipio con datos de salud',
        popupFields: [
          { field: 'nombre',      label: 'Vereda' },
          { field: 'poblacion',   label: 'Población' },
          { field: 'area_hecta',  label: 'Área (ha)' },
          { field: 'delito',      label: 'Delito' }
        ]
      }),
      createWfsLayer({
        id: 'ipm_santander',
        name: 'IPM — Pobreza Multidimensional',
        tableName: 'ipmsantander',
        visible: false,
        queryable: true,
        geometryType: 'polygon',
        description: 'Índice de Pobreza Multidimensional y embarazo a temprana edad (10 rangos)',
        popupFields: [
          { field: 'LABEL',      label: 'Vulnerabilidad IPM' },
          { field: 'ipm',        label: 'IPM (%)' },
          { field: 'embarazo_a', label: 'Embarazo Temprano' },
          { field: 'COD_DANE',   label: 'Código DANE' }
        ]
      }),
      createWfsLayer({
        id: 'zona_influencia_salud',
        name: 'Zona de Influencia 30m',
        tableName: 'zonainfluenciario30m_salud',
        visible: false,
        queryable: true,
        geometryType: 'polygon',
        color: '#06b6d4',
        description: 'Zona de influencia de 30m de instituciones de salud',
        popupFields: [
          { field: 'NOMBRE_GEO', label: 'Institución' },
          { field: 'BUFF_DIST',  label: 'Distancia (m)' }
        ]
      })
    ]
  },

  servicios_publicos: {
    name: 'Secretaría de Infraestructura',
    icon: '💡',
    color: '#f59e0b',
    layers: [
      createWfsLayer({
        id: 'alumbrado_publico',
        name: 'Transformadores',
        tableName: 'subestaciones_alumbradopublico',
        visible: false,
        queryable: true,
        description: 'Transformadores de alumbrado público',
        geometryType: 'point',
        style: { fillColor: '#2563EB', strokeColor: '#ffffff', radius: 6 }
      }),
      createWfsLayer({
        id: 'luminarias_tradicionales',
        name: 'Luminarias Tradicionales',
        tableName: 'luminariastradicionales_alumbradopublico',
        visible: false,
        queryable: true,
        description: 'Luminarias tradicionales de alumbrado público',
        geometryType: 'point',
        style: { fillColor: '#FBBF24', strokeColor: '#ffffff', radius: 6 }
      }),
      createWfsLayer({
        id: 'apoyos_alumbrado_publico',
        name: 'Apoyos Alumbrado Público',
        tableName: 'apoyos_alumbradopublico',
        visible: false,
        queryable: true,
        description: 'Apoyos (postes) de alumbrado público',
        geometryType: 'point',
        style: { fillColor: '#F97316', strokeColor: '#ffffff', radius: 6 }
      }),
      createWfsLayer({
        id: 'luminarias_led',
        name: 'Luminarias LED',
        tableName: 'luminariasled_alumbradopublico',
        visible: false,
        queryable: true,
        description: 'Luminarias LED de alumbrado público',
        geometryType: 'point',
        style: { fillColor: '#A3E635', strokeColor: '#ffffff', radius: 6 }
      }),
      createWfsLayer({
        id: 'rutas_alumbrado_publico',
        name: 'Rutas Alumbrado Público',
        tableName: 'rutas_alumbradopublico',
        visible: false,
        queryable: true,
        description: 'Rutas eléctricas de alumbrado público',
        geometryType: 'line',
        style: { strokeColor: '#DC2626', strokeWidth: 3 }
      }),
      createWmsLayer({
        id: 'obras_pavimentacion',
        name: 'Obras de Pavimentación',
        tableName: 'obraspavimentacion_infraestructura',
        sldBody: makePavimentacionSLD('obraspavimentacion_infraestructura'),
        visible: false,
        queryable: true,
        zIndex: 15,
        description: 'Obras de pavimentación 2025',
        popupFields: [
          { field: 'obras2 \uFFFD_1', label: 'Ubicación / Arreglo' },
          { field: 'obras2 \uFFFD_3', label: 'Longitud (m)' },
          { field: 'obras2 \uFFFD_2', label: 'Tipo de Obra' },
          { field: 'obras2 \uFFFD_4', label: 'Beneficiarios' },
          { field: 'obras2 \uFFFD_6', label: 'Presupuesto', format: 'currency' },
          { field: 'obras2 \uFFFD_7', label: 'Estado' }
        ]
      }),
      createWmsLayer({
        id: 'pavimentacion2',
        name: 'Pavimentación 2 - Infraestructura',
        tableName: 'pavimentacion2',
        sldBody: makePavimentacionSLD('pavimentacion2'),
        visible: false,
        queryable: true,
        zIndex: 15,
        description: 'Obras de pavimentación 2025 (lote 2)',
        popupFields: [
          { field: 'obras1 \uFFFD_1', label: 'Ubicación / Arreglo' },
          { field: 'obras1 \uFFFD_3', label: 'Longitud (m)' },
          { field: 'obras1 \uFFFD_2', label: 'Tipo de Obra' },
          { field: 'obras1 \uFFFD_4', label: 'Beneficiarios' },
          { field: 'obras1 \uFFFD_6', label: 'Presupuesto', format: 'currency' },
          { field: 'obras1 \uFFFD_7', label: 'Estado' }
        ]
      })
    ]
  }
};

// ============================
// GRUPOS DE CAPAS
// ============================

export const LAYER_GROUPS = {
  ubas: {
    name: 'UBAs',
    description: 'Unidades Barriales de Atención',
    exclusive: false // Si true, solo una capa del grupo puede estar activa
  },
  uso_suelo: {
    name: 'Uso de Suelo',
    description: 'Establecimientos por tipo de uso',
    exclusive: false
  }
};

// ============================
// ESTILOS PREDEFINIDOS
// ============================

export const LAYER_STYLES = {
  // Colores para uso de suelo
  usoSuelo: {
    Estanco: '#8B0000',
    Discotecas: '#FF00FF',
    Droguerías: '#00BFFF',
    Ferreterías: '#696969',
    IPS: '#228B22',
    Restaurantes: '#FFA500',
    Servicios: '#4682B4',
    'Predios Educativos': '#1E90FF',
    'Equipo Institucional': '#3FEBBA',
    Iglesias: '#FFD700',
    'Zonas Verdes': '#006400'
  },
  // Colores para UBAs (referencia por nombre visible)
  ubas: {
    'UBA 1': UBA_COLORS.uba1,
    'UBA 2': UBA_COLORS.uba2,
    'UBA 3': UBA_COLORS.uba3,
    'UBA 4': UBA_COLORS.uba4,
    'UBA 5': UBA_COLORS.uba5,
    'UBA C': UBA_COLORS.ubac,
  }
};

// Re-exportar UBA_DATA desde fuente centralizada
export const UBA_DATA = _UBA_DATA;

// ============================
// FUNCIONES DE UTILIDAD
// ============================

// Obtener todas las capas como lista plana
export function getAllLayers() {
  const layers = [];
  Object.values(LAYERS_BY_SECRETARIA).forEach(secretaria => {
    secretaria.layers.forEach(layer => {
      layers.push({
        ...layer,
        secretaria: secretaria.name,
        secretariaId: Object.keys(LAYERS_BY_SECRETARIA).find(
          key => LAYERS_BY_SECRETARIA[key] === secretaria
        )
      });
    });
  });
  return layers;
}

// Obtener capa por ID
export function getLayerById(id) {
  for (const secretaria of Object.values(LAYERS_BY_SECRETARIA)) {
    const layer = secretaria.layers.find(l => l.id === id);
    if (layer) return layer;
  }
  return null;
}

// Obtener capas por secretaría
export function getLayersBySecretaria(secretariaId) {
  return LAYERS_BY_SECRETARIA[secretariaId]?.layers || [];
}

// Obtener capas por grupo
export function getLayersByGroup(groupName) {
  return getAllLayers().filter(layer => layer.group === groupName);
}

// Obtener URL de la API PostGIS para una capa
export function getGeoJsonApiUrl(layer) {
  const base = `/api/geodata/${encodeURIComponent(layer.tableName)}`;
  const params = new URLSearchParams();
  if (layer.simplify) params.set('simplify', layer.simplify);
  if (layer.cols) params.set('cols', layer.cols);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export default LAYERS_BY_SECRETARIA;