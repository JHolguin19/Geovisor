import { Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import AuthContext from './context/AuthContext';
import MainLayout from './templates/MainLayout';
import LoginPage from './pages/LoginPage';
import MapPage from './pages/MapPage';
import DashboardPage from './pages/DashboardPage';
import SecretariaPortalPage from './pages/SecretariaPortalPage';
import UploadPage from './pages/UploadPage';
import DataExplorerPage from './pages/DataExplorerPage';
import PdmPage from './pages/PdmPage';
import PdmAnualPage from './pages/PdmAnualPage';
import DashboardCatastro from './pages/Planeacion/Catastro/DashboardCatastro';
import DashboardVivienda from './pages/Planeacion/Vivienda/DashboardVivienda';
import PlaneacionMapPage from './pages/Planeacion/PlaneacionMapPage';
import AdminUsuariosPage from './pages/AdminUsuariosPage';
import DataPipelinePage from './pages/DataPipelinePage';
import ProcessingPage from './pages/ProcessingPage';
import SchemaManagerPage from './pages/SchemaManagerPage';
import GobiernoDelitosPage from './pages/GobiernoDelitosPage';
import PdmEditorPage from './pages/PdmEditorPage';

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

        {/* Gobierno — Observatorio de seguridad */}
        <Route path="gobierno/delitos" element={<GobiernoDelitosPage />} />

        {/* Pipeline ETL de datos */}
        <Route path="pipeline" element={<DataPipelinePage />} />
        <Route path="pipeline/schemas" element={<SchemaManagerPage />} />

        {/* Portal de secretaría (módulos) */}
        <Route path="portal/:secretariaId" element={<SecretariaPortalPage />} />
        <Route path="portal/:secretariaId/upload" element={<UploadPage />} />
        <Route path="portal/:secretariaId/process/:uploadId" element={<ProcessingPage />} />
        <Route path="portal/:secretariaId/datos" element={
          <PrivateRoute requiredRole="editor_geo">
            <DataExplorerPage />
          </PrivateRoute>
        } />

        {/* Geovisor por secretaría */}
        <Route path="mapa/:secretariaId" element={<MapPage />} />

        {/* Seguimiento PDM */}
        <Route path="pdm/anual" element={<PdmAnualPage />} />
        <Route path="pdm" element={<PdmPage />} />

        {/* Editor PDM — solo admin y editor_geo */}
        <Route
          path="pdm/editor"
          element={
            <PrivateRoute requiredRole="editor_geo">
              <PdmEditorPage />
            </PrivateRoute>
          }
        />

        {/* Administración — solo admin */}
        <Route
          path="admin/usuarios"
          element={
            <PrivateRoute requiredRole="admin">
              <AdminUsuariosPage />
            </PrivateRoute>
          }
        />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
