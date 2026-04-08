import { obtenerPrediosPagosGeoJSON } from '../../services/catastro/catastroPagos2025Service.js';

export const getPrediosPagos2025 = async (req, res) => {
  try {
    const prediosPagosGeoJSON = await obtenerPrediosPagosGeoJSON();
    res.status(200).json(prediosPagosGeoJSON);
  } catch (error) {
    console.error('Error obteniendo predios con reporte de pagos 2025:', error);
    res.status(500).json({ error: 'Error interno cruzando los pagos con el mapa catastral' });
  }
};
