// Servicio para obtener estadísticas y conteos de capas desde PostGIS

import { UBA_DATA, UBA_ORDER } from '../constants/ubas';

// Re-exportar para mantener compatibilidad con importadores existentes
export { UBA_DATA };

// Mapeo de IDs de capas a nombres de UBA
export const UBA_LAYER_IDS = UBA_ORDER;

// Capas de uso de suelo que se pueden contar
export const USO_SUELO_LAYERS = {
  uso_estanco: { tableName: 'planeacion_estanco', nombre: 'Estanco', color: '#8B0000' },
  uso_discotecas: { tableName: 'planeacion_discotecas', nombre: 'Discotecas', color: '#FF00FF' },
  uso_droguerias: { tableName: 'planeacion_droguerias', nombre: 'Droguerías', color: '#00BFFF' },
  uso_ferreterias: { tableName: 'planeacion_ferreterias', nombre: 'Ferreterías', color: '#696969' },
  uso_ips: { tableName: 'planeacion_ips', nombre: 'IPS', color: '#228B22' },
  uso_restaurantes: { tableName: 'planeacion_restaurantes', nombre: 'Restaurantes', color: '#FFA500' },
  uso_servicios: { tableName: 'planeacion_servicios', nombre: 'Servicios', color: '#4682B4' },
  zonas_verdes: { tableName: 'planeacion_zonas_verdes', nombre: 'Zonas Verdes', color: '#006400' },
  gimnasios_biosaludables: { tableName: 'planeacion_gimnasios_biosaludables', nombre: 'Gimnasios', color: '#ff5722' },
  predios_educativos: { tableName: 'educacion_predios_educativos', nombre: 'Predios Educativos', color: '#1E90FF' },
  equipo_institucional: { tableName: 'planeacion_equipo_institucional', nombre: 'Equipo Institucional', color: '#3FEBBA' },
  iglesias: { tableName: 'planeacion_iglesias', nombre: 'Iglesias', color: '#FFD700' },
  luminarias_tradicionales: { tableName: 'obras_luminarias_tradicionales', nombre: 'Luminarias Tradicionales', color: '#FBBF24' },
  luminarias_led: { tableName: 'obras_luminarias_led', nombre: 'Luminarias LED', color: '#A3E635' }
};

// Fetch autenticado a la API PostGIS
function apiGet(tableName) {
  const token = localStorage.getItem('token');
  return fetch(`/api/geodata/${encodeURIComponent(tableName)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  }).then(r => r.json());
}

// Obtener barrios de una UBA específica
export async function getBarriosByUba(ubaLayerId) {
  const tableMap = {
    uba1: 'planeacion_uba1',
    uba2: 'planeacion_uba2',
    uba3: 'planeacion_uba3',
    uba4: 'planeacion_uba4',
    uba5: 'planeacion_uba5',
    ubac: 'planeacion_ubac'
  };
  const tableName = tableMap[ubaLayerId];
  if (!tableName) return new Set();

  try {
    const data = await apiGet(tableName);
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
export async function countByBarrios(tableName, barriosSet) {
  try {
    const data = await apiGet(tableName);

    let count = 0;
    const seenIds = new Set();

    data.features.forEach(feature => {
      const barrioPredio = (
        feature.properties.ubicacion ||
        feature.properties.NOMBRE_2 ||
        feature.properties.barrio ||
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

    if (seenIds.size > 0) return seenIds.size;
    return count;
  } catch (error) {
    console.error(`Error contando ${tableName}:`, error);
    return 0;
  }
}

// Obtener conteo total de una capa
export async function getTotalCount(tableName) {
  try {
    const data = await apiGet(tableName);
    return data.features.length;
  } catch (error) {
    console.error(`Error obteniendo total de ${tableName}:`, error);
    return 0;
  }
}

// Función principal: obtener estadísticas por UBA para capas activas
export async function getStatsByUba(activeUbaLayers, activeUsoSueloLayers) {
  const results = {
    ubaData: {},
    usoSueloCount: {},
    porUba: {}
  };

  activeUbaLayers.forEach(ubaId => {
    const data = UBA_DATA[ubaId];
    if (data) results.ubaData[ubaId] = data;
  });

  if (!activeUsoSueloLayers || activeUsoSueloLayers.length === 0) return results;

  const barriosPorUba = {};
  for (const ubaId of activeUbaLayers) {
    barriosPorUba[ubaId] = await getBarriosByUba(ubaId);
    results.porUba[ubaId] = {};
  }

  for (const layerId of activeUsoSueloLayers) {
    const layerConfig = USO_SUELO_LAYERS[layerId];
    if (!layerConfig) continue;

    const totalCount = await getTotalCount(layerConfig.tableName);
    results.usoSueloCount[layerId] = totalCount;

    for (const ubaId of activeUbaLayers) {
      const barrios = barriosPorUba[ubaId];
      if (barrios.size === 0) continue;

      const count = await countByBarrios(layerConfig.tableName, barrios);
      if (count > 0) results.porUba[ubaId][layerId] = count;
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
