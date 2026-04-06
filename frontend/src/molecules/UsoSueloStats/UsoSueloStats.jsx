import { useMemo } from 'react';
import { USO_SUELO_LAYERS, UBA_LAYER_IDS } from '../../services/statsService';
import './UsoSueloStats.css';

const UBA_ORDER = ['uba1', 'uba2', 'uba3', 'uba4', 'uba5', 'ubac'];

export default function UsoSueloStats({ statsData, activeUbaLayers }) {
  // Datos para mostrar
  const { usoSueloCount, porUba } = statsData || {};

  // Verificar si hay datos para mostrar
  const hasData = useMemo(() => {
    if (!usoSueloCount || Object.keys(usoSueloCount).length === 0) return false;
    return true;
  }, [usoSueloCount]);

  if (!hasData) return null;

  // Obtener capas activas con datos
  const activeLayersWithData = Object.entries(usoSueloCount || {})
    .filter(([_, count]) => count > 0)
    .map(([layerId, count]) => ({
      layerId,
      ...USO_SUELO_LAYERS[layerId],
      count
    }));

  if (activeLayersWithData.length === 0) return null;

  // UBAs activas con datos
  const ubasWithData = UBA_LAYER_IDS.filter(
    ubaId => activeUbaLayers?.includes(ubaId) && porUba?.[ubaId] && Object.keys(porUba[ubaId]).length > 0
  );

  return (
    <div className="uso-suelo-stats">
      {/* Conteo total por tipo de uso de suelo */}
      <div className="uso-suelo-total">
        <h4 className="stats-title">Conteo de Establecimientos</h4>
        <ul className="stats-list">
          {activeLayersWithData.map(({ layerId, nombre, count, color }) => (
            <li key={layerId} className="stat-item">
              <span
                className="color-box"
                style={{ backgroundColor: color }}
              />
              <span className="stat-text">
                {nombre}: <strong>{count}</strong>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Desglose por UBA */}
      {ubasWithData.length > 0 && (
        <div className="uso-suelo-por-uba">
          <h4 className="stats-title">Por UBA</h4>
          {UBA_ORDER.filter(ubaId => ubasWithData.includes(ubaId)).map(ubaId => {
            const ubaStats = porUba[ubaId];
            if (!ubaStats || Object.keys(ubaStats).length === 0) return null;

            const ubaName = ubaId.toUpperCase().replace('UBA', 'UBA ');

            return (
              <div key={ubaId} className="uba-section">
                <h5 className="uba-name">{ubaName}</h5>
                <ul className="stats-list">
                  {Object.entries(ubaStats).map(([layerId, count]) => {
                    const layer = USO_SUELO_LAYERS[layerId];
                    if (!layer) return null;

                    return (
                      <li key={layerId} className="stat-item">
                        <span
                          className="color-box"
                          style={{ backgroundColor: layer.color }}
                        />
                        <span className="stat-text">
                          {layer.nombre}: <strong>{count}</strong>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

