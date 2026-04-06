// Servicio para obtener estadísticas y conteos de capas de GeoServer
import { GEOSERVER_CONFIG } from '../config/geoserver';

// Datos estáticos de UBAs (número de predios y área)
export const UBA_DATA = {
  uba1: { uba: 'UBA1', numero_predios: 2197, area_m2: 718315 },
  uba2: { uba: 'UBA2', numero_predios: 5959, area_m2: 1662210 },
  uba3: { uba: 'UBA3', numero_predios: 2805, area_m2: 1054055 },
  uba4: { uba: 'UBA4', numero_predios: 3258, area_m2: 902978 },
  uba5: { uba: 'UBA5', numero_predios: 1537, area_m2: 608186 },
  ubac: { uba: 'UBAC', numero_predios: 2028, area_m2: 1491423 }
};

// Mapeo de IDs de capas a nombres de UBA
export const UBA_LAYER_IDS = ['uba1', 'uba2', 'uba3', 'uba4', 'uba5', 'ubac'];

// Capas de uso de suelo que se pueden contar
export const USO_SUELO_LAYERS = {
  uso_estanco: { geoserverLayer: 'pg_uds_bar_estanco', nombre: 'Estanco', color: '#8B0000' },
  uso_discotecas: { geoserverLayer: 'pg_uds_discos', nombre: 'Discotecas', color: '#FF00FF' },
  uso_droguerias: { geoserverLayer: 'pg_uds_droguerias', nombre: 'Droguerías', color: '#00BFFF' },
  uso_ferreterias: { geoserverLayer: 'pg_uds_ferreterias', nombre: 'Ferreterías', color: '#696969' },
  uso_ips: { geoserverLayer: 'pg_uds_ips', nombre: 'IPS', color: '#228B22' },
  uso_restaurantes: { geoserverLayer: 'pg_uds_restaurantes', nombre: 'Restaurantes', color: '#FFA500' },
  uso_servicios: { geoserverLayer: 'pg_uds_otros', nombre: 'Servicios', color: '#4682B4' },
  zonas_verdes: { geoserverLayer: 'pg_zonasverdes', nombre: 'Zonas Verdes', color: '#006400' },
  gimnasios_biosaludables: { geoserverLayer: 'pg_Gimnasiosbiosaludables', nombre: 'Gimnasios', color: '#ff5722' },
  predios_educativos: { geoserverLayer: 'pg_predios_educativos', nombre: 'Predios Educativos', color: '#1E90FF' },
  equipo_institucional: { geoserverLayer: 'pg_predios_equipo_institucional', nombre: 'Equipo Institucional', color: '#3FEBBA' },
  iglesias: { geoserverLayer: 'pg_predios_iglesias', nombre: 'Iglesias', color: '#FFD700' },
  luminarias_tradicionales: { geoserverLayer: 'pg_luminariastradicionales_alumbradop', nombre: 'Luminarias Tradicionales', color: '#FBBF24' },
  luminarias_led: { geoserverLayer: 'pg_luminariasled_alumbradopublico', nombre: 'Luminarias LED', color: '#A3E635' }
};

// Obtener WFS URL para una capa
function getWfsUrl(geoserverLayer) {
  const params = new URLSearchParams({
    service: 'WFS',
    version: '1.0.0',
    request: 'GetFeature',
    typeName: `${GEOSERVER_CONFIG.workspace}:${geoserverLayer}`,
    outputFormat: 'application/json'
  });
  return `${GEOSERVER_CONFIG.baseUrl}/${GEOSERVER_CONFIG.workspace}/ows?${params.toString()}`;
}

// Obtener barrios de una UBA específica
export async function getBarriosByUba(ubaLayerId) {
  const layerConfig = {
    uba1: 'pg_uba1',
    uba2: 'pg_uba2',
    uba3: 'pg_uba3',
    uba4: 'pg_uba4',
    uba5: 'pg_uba5',
    ubac: 'pg_ubac'
  }[ubaLayerId];

  if (!layerConfig) return new Set();

  try {
    const url = getWfsUrl(layerConfig);
    const response = await fetch(url);
    const data = await response.json();

    const barrios = new Set();
    data.features.forEach(feature => {
      const barrio = feature.properties.nombre?.trim().toUpperCase();
      if (barrio) barrios.add(barrio);
    });
    return barrios;
  } catch (error) {
    console.error(`Error obteniendo barrios de ${ubaLayerId}:`, error);
    return new Set();
  }
}

// Contar elementos de una capa de uso de suelo por barrios
export async function countByBarrios(geoserverLayer, barriosSet) {
  try {
    const url = getWfsUrl(geoserverLayer);
    const response = await fetch(url);
    const data = await response.json();

    let count = 0;
    const seenIds = new Set();

    data.features.forEach(feature => {
      const barrioPredio = (
        feature.properties.barrio ||
        feature.properties.usodesuelosactualizado_ubicacion ||
        feature.properties.NOMBRE_2 ||
        feature.properties.tipo_establecimiento ||
        feature.properties.NOMBRE ||
        ''
      ).trim().toUpperCase();

      const idPredial = feature.properties.codigo || feature.properties.CODIGO || feature.properties.matricula_inmobiliaria;

      if (barriosSet.has(barrioPredio)) {
        if (idPredial) {
          seenIds.add(idPredial);
        } else {
          count++;
        }
      }
    });

    // Si hay IDs únicos, usar ese conteo
    if (seenIds.size > 0) {
      return seenIds.size;
    }
    return count;
  } catch (error) {
    console.error(`Error contando ${geoserverLayer}:`, error);
    return 0;
  }
}

// Obtener conteo total de una capa
export async function getTotalCount(geoserverLayer) {
  try {
    const url = getWfsUrl(geoserverLayer);
    const response = await fetch(url);
    const data = await response.json();
    return data.features.length;
  } catch (error) {
    console.error(`Error obteniendo total de ${geoserverLayer}:`, error);
    return 0;
  }
}

// Función principal: obtener estadísticas por UBA para capas activas
export async function getStatsByUba(activeUbaLayers, activeUsoSueloLayers) {
  const results = {
    ubaData: {},      // Datos estáticos de UBAs activas
    usoSueloCount: {}, // Conteo total por capa de uso de suelo
    porUba: {}         // Conteo por UBA y tipo de uso de suelo
  };

  // 1. Obtener datos estáticos de UBAs activas
  activeUbaLayers.forEach(ubaId => {
    const data = UBA_DATA[ubaId];
    if (data) {
      results.ubaData[ubaId] = data;
    }
  });

  // 2. Si no hay capas de uso de suelo activas, retornar solo datos básicos
  if (!activeUsoSueloLayers || activeUsoSueloLayers.length === 0) {
    return results;
  }

  // 3. Obtener barrios de cada UBA activa
  const barriosPorUba = {};
  for (const ubaId of activeUbaLayers) {
    barriosPorUba[ubaId] = await getBarriosByUba(ubaId);
    results.porUba[ubaId] = {};
  }

  // 4. Contar elementos de cada capa de uso de suelo por UBA
  for (const layerId of activeUsoSueloLayers) {
    const layerConfig = USO_SUELO_LAYERS[layerId];
    if (!layerConfig) continue;

    // Conteo total
    const totalCount = await getTotalCount(layerConfig.geoserverLayer);
    results.usoSueloCount[layerId] = totalCount;

    // Conteo por UBA
    for (const ubaId of activeUbaLayers) {
      const barrios = barriosPorUba[ubaId];
      if (barrios.size === 0) continue;

      const count = await countByBarrios(layerConfig.geoserverLayer, barrios);
      if (count > 0) {
        results.porUba[ubaId][layerId] = count;
      }
    }
  }

  return results;
}

export default {
  UBA_DATA,
  USO_SUELO_LAYERS,
  UBA_LAYER_IDS,
  getStatsByUba,
  getTotalCount,
  getBarriosByUba,
  countByBarrios
};
