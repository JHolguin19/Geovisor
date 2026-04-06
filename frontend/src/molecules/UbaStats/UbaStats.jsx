import { useMemo } from 'react';
import { UBA_DATA } from '../../services/statsService';
import './UbaStats.css';

// Orden definido de UBAs
const UBA_ORDER = ['uba1', 'uba2', 'uba3', 'uba4', 'uba5', 'ubac'];

export default function UbaStats({ activeUbaLayers }) {
  // Filtrar solo las UBAs activas y ordenarlas
  const stats = useMemo(() => {
    if (!activeUbaLayers || activeUbaLayers.length === 0) return [];

    return UBA_ORDER
      .filter(ubaId => activeUbaLayers.includes(ubaId))
      .map(ubaId => UBA_DATA[ubaId])
      .filter(Boolean);
  }, [activeUbaLayers]);

  if (stats.length === 0) return null;

  return (
    <div className="uba-stats">
      <h4 className="uba-stats-title">Información de UBAs</h4>
      <table className="uba-stats-table">
        <thead>
          <tr>
            <th>UBA</th>
            <th>Número de Predios</th>
            <th>Área (m²)</th>
          </tr>
        </thead>
        <tbody>
          {stats.map(data => (
            <tr key={data.uba}>
              <td>{data.uba}</td>
              <td className="text-center">
                {Number(data.numero_predios).toLocaleString('es-CO')}
              </td>
              <td className="text-center">
                {Number(data.area_m2).toLocaleString('es-CO')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
