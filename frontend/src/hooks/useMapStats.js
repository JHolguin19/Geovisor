import { useState, useEffect, useCallback } from 'react';
import { useContext } from 'react';
import MapContext from '../context/MapContext';
import { getStatsByUba, UBA_LAYER_IDS, USO_SUELO_LAYERS } from '../services/statsService';

// Hook personalizado para manejar estadísticas del mapa
export function useMapStats() {
  const { activeLayers } = useContext(MapContext);

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Calcular estadísticas cuando cambian las capas activas
  const calculateStats = useCallback(async () => {
    if (!activeLayers || activeLayers.size === 0) {
      setStats(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Filtrar capas activas de UBAs y uso de suelo
      const activeUbaLayers = UBA_LAYER_IDS.filter(id => activeLayers.has(id));
      const activeUsoSueloLayers = Object.keys(USO_SUELO_LAYERS).filter(id => activeLayers.has(id));

      // Si no hay nada activo, limpiar estadísticas
      if (activeUbaLayers.length === 0 && activeUsoSueloLayers.length === 0) {
        setStats(null);
        return;
      }

      // Calcular estadísticas (totales siempre, por UBA si hay UBAs activas)
      const result = await getStatsByUba(activeUbaLayers, activeUsoSueloLayers);
      setStats(result);
    } catch (err) {
      console.error('Error calculando estadísticas:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [activeLayers]);

  // Recalcular cuando cambian las capas activas
  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  // Función para refrescar estadísticas manualmente
  const refreshStats = useCallback(() => {
    return calculateStats();
  }, [calculateStats]);

  return {
    stats,
    loading,
    error,
    refreshStats
  };
}

export default useMapStats;
