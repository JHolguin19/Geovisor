// Servicio para obtener estadísticas y conteos de capas desde PostGIS

import { UBA_DATA, UBA_ORDER } from '../constants/ubas';

// Re-exportar para mantener compatibilidad con importadores existentes
export { UBA_DATA };

// Mapeo de IDs de capas a nombres de UBA
export const UBA_LAYER_IDS = UBA_ORDER;

// Capas de uso de suelo que se pueden contar
export const USO_SUELO_LAYERS = {
  uso_estanco: { tableName: 'uds_barestanco', nombre: 'Estanco', color: '#8B0000' },
  uso_discotecas: { tableName: 'uso_de_suelos_discotecas', nombre: 'Discotecas', color: '#FF00FF' },
  uso_droguerias: { tableName: 'uds2_droguerias', nombre: 'Droguerías', color: '#00BFFF' },
  uso_ferreterias: { tableName: 'uds_ferreterias', nombre: 'Ferreterías', color: '#696969' },
  uso_ips: { tableName: 'uds_ips', nombre: 'IPS', color: '#228B22' },
  uso_restaurantes: { tableName: 'uds_restaurantes', nombre: 'Restaurantes', color: '#FFA500' },
  uso_servicios: { tableName: 'uds_otros', nombre: 'Servicios', color: '#4682B4' },
  zonas_verdes: { tableName: 'zonasverdes', nombre: 'Zonas Verdes', color: '#006400' },
  gimnasios_biosaludables: { tableName: 'Gimnasiosbiosaludables', nombre: 'Gimnasios', color: '#ff5722' },
  predios_educativos: { tableName: 'predios_educativos', nombre: 'Predios Educativos', color: '#1E90FF' },
  equipo_institucional: { tableName: 'predios_equipo_institucional', nombre: 'Equipo Institucional', color: '#3FEBBA' },
  iglesias: { tableName: 'predios_iglesias', nombre: 'Iglesias', color: '#FFD700' },
  luminarias_tradicionales: { tableName: 'luminariastradicionales_alumbradopublico', nombre: 'Luminarias Tradicionales', color: '#FBBF24' },
  luminarias_led: { tableName: 'luminariasled_alumbradopublico', nombre: 'Luminarias LED', color: '#A3E635' }
};

// Función principal: obtener estadísticas por UBA para capas activas
// Llama al endpoint PostGIS del backend en lugar de descargar GeoJSON completo
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

  const token = localStorage.getItem('token');
  const layersParam = activeUsoSueloLayers.join(',');
  const ubasParam = activeUbaLayers.join(',');
  const url = `/api/stats/uso-suelo?layers=${encodeURIComponent(layersParam)}&ubas=${encodeURIComponent(ubasParam)}`;

  try {
    const resp = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    results.usoSueloCount = data.total || {};
    results.porUba = data.porUba || {};
  } catch (error) {
    console.error('Error obteniendo estadísticas de uso de suelo:', error);
  }

  return results;
}

export default {
  UBA_DATA,
  USO_SUELO_LAYERS,
  UBA_LAYER_IDS,
  getStatsByUba,
};
