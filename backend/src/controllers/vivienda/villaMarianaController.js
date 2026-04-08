import { obtenerViviendaGeoJSON } from '../../services/vivienda/villaMarianaService.js';

export const getBeneficiariosVillamariana = async (req, res) => {
  try {
    const beneficiariosGeoJSON = await obtenerViviendaGeoJSON();
    res.status(200).json(beneficiariosGeoJSON);
  } catch (error) {
    console.error('Error obteniendo beneficiarios de Villamariana:', error);
    res.status(500).json({ error: 'Error interno consultando los datos de vivienda' });
  }
};
