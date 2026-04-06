// Configuración de GeoServer
export const GEOSERVER_CONFIG = {
  // URL base de GeoServer (desarrollo local)
  baseUrl: '/geoserver',

  // URL directa (para cuando no hay proxy)
  directUrl: 'http://localhost:8080/geoserver',

  // Workspace
  workspace: 'AlcaldiaGeovisor',

  // WMS endpoint
  getWmsUrl: () => `${GEOSERVER_CONFIG.baseUrl}/${GEOSERVER_CONFIG.workspace}/wms`,

  // WFS endpoint
  getWfsUrl: () => `${GEOSERVER_CONFIG.baseUrl}/${GEOSERVER_CONFIG.workspace}/ows`,

  // Coordenadas de Santander de Quilichao
  defaultCenter: [-76.483765, 3.012569],
  defaultZoom: 14,

  // Proyecciones
  projections: {
    map: 'EPSG:3857',    // Web Mercator (OpenLayers)
    data: 'EPSG:4326'    // WGS84 (GeoServer)
  }
};

export default GEOSERVER_CONFIG;