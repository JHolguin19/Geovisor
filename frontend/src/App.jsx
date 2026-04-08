import { Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import AuthContext from './context/AuthContext';
import MainLayout from './templates/MainLayout';
import LoginPage from './pages/LoginPage';
import MapPage from './pages/MapPage';
import DashboardPage from './pages/DashboardPage';
import SecretariaPortalPage from './pages/SecretariaPortalPage';
import PdmPage from './pages/PdmPage';
import DashboardCatastro from './pages/Planeacion/Catastro/DashboardCatastro';
import DashboardVivienda from './pages/Planeacion/Vivienda/DashboardVivienda';
import PlaneacionMapPage from './pages/Planeacion/PlaneacionMapPage';

function PrivateRoute({ children, requiredRole }) {
  const { user, isAuthenticated, loading } = useContext(AuthContext);

  if (loading) return null;

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (requiredRole && user?.role !== requiredRole && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  return (
    <Routes>
      {/* Ruta pública */}
      <Route path="/login" element={<LoginPage />} />

      {/* Rutas protegidas bajo MainLayout */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }
      >
        {/* Índice → dashboard */}
        <Route index element={<Navigate to="/dashboard" replace />} />

        {/* Dashboard con cards de secretarías */}
        <Route path="dashboard" element={<DashboardPage />} />

        {/* Ruta legacy /mapa → redirige al SIG completo */}
        <Route path="mapa" element={<Navigate to="/mapa/sig" replace />} />

        {/* Rutas de Planeación — deben ir ANTES de portal/:secretariaId */}
        <Route path="planeacion/catastro" element={<DashboardCatastro />} />
        <Route path="planeacion/vivienda" element={<DashboardVivienda />} />
        <Route path="planeacion/catastro/:visorId" element={<PlaneacionMapPage />} />
        <Route path="planeacion/vivienda/:visorId" element={<PlaneacionMapPage />} />

        {/* Portal de secretaría (módulos) */}
        <Route path="portal/:secretariaId" element={<SecretariaPortalPage />} />

        {/* Geovisor por secretaría */}
        <Route path="mapa/:secretariaId" element={<MapPage />} />

        {/* Seguimiento PDM */}
        <Route path="pdm" element={<PdmPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
