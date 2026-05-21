import { Routes, Route, Navigate } from 'react-router-dom';
import { useContext, Component } from 'react';
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
import DashboardZonaRural from './pages/Planeacion/ZonaRural/DashboardZonaRural';
import AnalisisZonaRural from './pages/Planeacion/Catastro/AnalisisZonaRural';
import AnalisisZonaUrbana from './pages/Planeacion/Catastro/AnalisisZonaUrbana';
import PlaneacionMapPage from './pages/Planeacion/PlaneacionMapPage';
import AdminUsuariosPage from './pages/AdminUsuariosPage';
import DataPipelinePage from './pages/DataPipelinePage';
import ProcessingPage from './pages/ProcessingPage';
import SchemaManagerPage from './pages/SchemaManagerPage';
import GobiernoDelitosPage from './pages/GobiernoDelitosPage';
import PdmEditorPage from './pages/PdmEditorPage';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', gap:16, fontFamily:'sans-serif', color:'#333' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e53e3e" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <h2 style={{ margin:0, fontSize:20 }}>Ocurrió un error inesperado</h2>
          <p style={{ margin:0, color:'#666', fontSize:14 }}>{this.state.error?.message}</p>
          <button onClick={() => window.location.href = '/dashboard'} style={{ padding:'8px 20px', background:'#1a365d', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:14 }}>
            Volver al inicio
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
    <ErrorBoundary>
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
        <Route path="planeacion/zonarural" element={<DashboardZonaRural />} />
        <Route path="planeacion/catastro/zona-rural-avaluos"  element={<AnalisisZonaRural />} />
        <Route path="planeacion/catastro/zona-urbana-avaluos" element={<AnalisisZonaUrbana />} />
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
    </ErrorBoundary>
  );
}

export default App;
