import { createContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import api from '../services/api';
import { clearCache as clearGeoCache } from '../features/map/layers/geoJsonCache';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Verificar token al cargar
  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        try {
          const response = await api.get('/auth/me');
          setUser(response.data.user);
        } catch (error) {
          console.error('Token inválido:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          setToken(null);
        }
      }
      setLoading(false);
    };
    verifyToken();
  }, [token]);

  // Renovación proactiva del token cada 10 minutos mientras el usuario está autenticado.
  // Evita que el token expire durante una sesión de edición larga sin necesitar
  // que el interceptor reactivo lo rescate.
  useEffect(() => {
    if (!user) return;

    const INTERVAL_MS = 10 * 60 * 1000; // 10 minutos

    const refresh = async () => {
      const storedRefreshToken = localStorage.getItem('refreshToken');
      if (!storedRefreshToken) return;
      try {
        const { data } = await axios.post('/api/auth/refresh', { refreshToken: storedRefreshToken });
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        setToken(data.token);
      } catch {
        // Fallo silencioso — el interceptor reactivo en api.js maneja el caso
        // en que el token ya haya expirado cuando llegue la próxima petición.
      }
    };

    const id = setInterval(refresh, INTERVAL_MS);
    return () => clearInterval(id);
  }, [user]);

  // Login
  const login = useCallback(async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      const { user, token, refreshToken } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      setToken(token);
      setUser(user);
      return { success: true, user };
    } catch (error) {
      console.error('Error en login:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Error al iniciar sesión'
      };
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch { /* ignorar error si el token ya expiró */ }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    clearGeoCache();
    setToken(null);
    setUser(null);
  }, []);

  // Verificar si está autenticado
  const isAuthenticated = !!user;

  // Verificar rol
  const hasRole = useCallback((role) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.role === role;
  }, [user]);

  // Verificar permiso
  const hasPermission = useCallback((permission) => {
    const rolePermissions = {
      admin: ['read', 'write', 'delete', 'manage_users', 'view_all'],
      secretaria: ['read', 'write', 'view_own'],
      lector: ['read', 'view_own'],
      editor_geo: ['read', 'write', 'delete', 'manage_layers', 'view_all']
    };

    if (!user) return false;
    const permissions = rolePermissions[user.role] || [];
    return permissions.includes(permission);
  }, [user]);

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    login,
    logout,
    hasRole,
    hasPermission
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;