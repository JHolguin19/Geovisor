import axios from 'axios';

// Crear instancia de axios con configuración base
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para agregar token JWT a las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de respuesta
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================
// SERVICIOS DE AUTENTICACIÓN
// ============================

export const authService = {
  login: async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  refreshToken: async () => {
    const response = await api.post('/auth/refresh');
    return response.data;
  }
};

// ============================
// SERVICIOS DE CAPAS
// ============================

export const layersService = {
  // Obtener todas las capas disponibles
  getAll: async () => {
    const response = await api.get('/layers');
    return response.data;
  },

  // Obtener capas por secretaría
  getBySecretaria: async (secretariaId) => {
    const response = await api.get(`/layers/secretaria/${secretariaId}`);
    return response.data;
  },

  // Obtener información de una capa específica
  getLayerInfo: async (layerId) => {
    const response = await api.get(`/layers/${layerId}`);
    return response.data;
  }
};

// ============================
// SERVICIOS DE ESTADÍSTICAS
// ============================

export const statsService = {
  // Obtener estadísticas por UBA
  getStatsByUba: async (ubaId) => {
    const response = await api.get(`/stats/uba/${ubaId}`);
    return response.data;
  },

  // Obtener conteo de entidades por uso de suelo
  getUsoSueloCount: async () => {
    const response = await api.get('/stats/uso-suelo');
    return response.data;
  },

  // Obtener estadísticas generales
  getGeneralStats: async () => {
    const response = await api.get('/stats/general');
    return response.data;
  }
};

// ============================
// SERVICIOS DE FORMULARIOS
// ============================

export const formsService = {
  // Enviar datos de formulario
  submit: async (formData) => {
    const response = await api.post('/forms/submit', formData);
    return response.data;
  },

  // Obtener historial de envíos
  getHistory: async (secretariaId) => {
    const response = await api.get(`/forms/history/${secretariaId}`);
    return response.data;
  }
};

// ============================
// SERVICIOS PDM
// ============================

export const pdmService = {
  getOverview: async () => {
    const response = await api.get('/pdm/overview');
    return response.data;
  },

  getMetas: async (params = {}) => {
    const response = await api.get('/pdm', { params });
    return response.data;
  },

  getResumen: async (params = {}) => {
    const response = await api.get('/pdm/resumen', { params });
    return response.data;
  },

  getSecretarias: async () => {
    const response = await api.get('/pdm/secretarias');
    return response.data;
  },

  getPilares: async () => {
    const response = await api.get('/pdm/pilares');
    return response.data;
  },

  getMeta: async (id) => {
    const response = await api.get(`/pdm/${id}`);
    return response.data;
  },
};

// ============================
// SERVICIOS DE CARGA DE DATOS
// ============================

export const uploadService = {
  upload: async (file, metadata) => {
    const formData = new FormData();
    formData.append('archivo', file);
    if (metadata.secretaria_id) formData.append('secretaria_id', metadata.secretaria_id);
    if (metadata.table_name)    formData.append('nombre_tabla',  metadata.table_name);
    if (metadata.lat_column)    formData.append('lat_col',        metadata.lat_column);
    if (metadata.lon_column)    formData.append('lon_col',        metadata.lon_column);
    const response = await api.post('/uploads', formData, {
      timeout: 120000,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getHistory: async (secretariaId) => {
    const response = await api.get('/uploads', { params: { secretaria_id: secretariaId } });
    return response.data;
  },

  /** Elimina un upload y su tabla PostGIS */
  delete: async (uploadId) => {
    const response = await api.delete(`/uploads/${uploadId}`);
    return response.data;
  },

  /** Analiza un archivo sin subirlo: retorna columnas, preview y detección lat/lon */
  analyzeFile: async (file) => {
    const formData = new FormData();
    formData.append('archivo', file);
    const response = await api.post('/uploads/analyze', formData, {
      timeout: 30000,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /** Lista de capas base disponibles para cruce de atributos */
  getBaseLayers: async () => {
    const response = await api.get('/uploads/base-layers');
    return response.data;
  },

  /** Campos (columnas no-geom) de una capa base específica */
  getBaseLayerFields: async (tableName) => {
    const response = await api.get(`/uploads/base-layer-fields/${tableName}`);
    return response.data;
  },
};

// ============================
// SERVICIOS DE GEODATA (PREVIEW)
// ============================

// ============================
// SERVICIOS DE USUARIOS (admin)
// ============================

export const usuariosService = {
  getAll: async () => {
    const res = await api.get('/usuarios');
    return res.data;
  },
  create: async (data) => {
    const res = await api.post('/usuarios', data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.put(`/usuarios/${id}`, data);
    return res.data;
  },
  toggle: async (id) => {
    const res = await api.patch(`/usuarios/${id}/toggle`);
    return res.data;
  },
  remove: async (id) => {
    const res = await api.delete(`/usuarios/${id}`);
    return res.data;
  },
};

export const geodataService = {
  getPreview: async (tableName, { limit = 50, cols } = {}) => {
    const params = { limit };
    if (cols) params.cols = cols;
    const response = await api.get(`/geodata/${tableName}`, { params });
    return response.data;
  },
};

export default api;