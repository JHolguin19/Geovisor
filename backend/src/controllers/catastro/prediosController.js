import { obtenerPrediosGeoJSON } from '../../services/catastro/catastroService.js';

export const getPredios = async (req, res) => {
  try {
    const prediosGeoJSON = await obtenerPrediosGeoJSON();
    res.status(200).json(prediosGeoJSON);
  } catch (error) {
    console.error('Error obteniendo predios espaciales:', error);
    res.status(500).json({ error: 'Error interno en el servidor geoespacial' });
  }
};
