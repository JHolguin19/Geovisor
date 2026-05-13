import { useContext } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { getSecretariaById } from '../config/secretarias';
import './SecretariaPortalPage.css';

// ── Módulos extra por secretaría ──────────────────────────────────────────────
const MODULOS_GOBIERNO = [
  {
    id: 'delitos',
    nombre: 'Observatorio de Seguridad',
    descripcion: 'Estadísticas de delitos: homicidios, hurtos, lesiones, VIF y más. Datos 2024-2025 de la Policía Nacional.',
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    activo: true,
    getPath: () => '/gobierno/delitos',
    color: '#DC2626',
  },
];

const MODULOS_AGUAS = [
  {
    id: 'geovisor_aguas',
    nombre: 'Geovisor de Acueductos',
    descripcion: 'Visualiza la cobertura de acueducto por vereda, red de conducción y estructuras hidráulicas. Filtra por sistema de acueducto.',
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C6 2 3 7.5 3 12a9 9 0 0018 0c0-4.5-3-10-9-10z"/>
        <path d="M12 2v20"/>
        <path d="M7.5 8.5c1.5 2 3 4 4.5 4s3-2 4.5-4"/>
      </svg>
    ),
    activo: true,
    getPath: () => '/mapa/aguas',
    color: '#0277BD',
  },
];

const MODULOS_PLANEACION = [
  {
    id: 'catastro',
    nombre: 'Gestión Catastral',
    descripcion: 'Visor de predios, avalúos, tarifas y estado de pagos 2025.',
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M3 9h18M9 21V9"/>
      </svg>
    ),
    activo: true,
    getPath: () => '/planeacion/catastro',
    color: '#1565C0',
  },
  {
    id: 'vivienda',
    nombre: 'Módulo de Vivienda',
    descripcion: 'Beneficiarios del proyecto Villa Mariana por barrio y vereda.',
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
        <path d="M9 21V12h6v9"/>
      </svg>
    ),
    activo: true,
    getPath: () => '/planeacion/vivienda',
    color: '#2E7D32',
  },
  {
    id: 'zonarural',
    nombre: 'Zona Rural',
    descripcion: 'Predios rurales por vereda — consulta, filtrado y conteo de propiedades sin duplicados.',
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
        <line x1="9" y1="3" x2="9" y2="18"/>
        <line x1="15" y1="6" x2="15" y2="21"/>
      </svg>
    ),
    activo: true,
    getPath: () => '/planeacion/zonarural',
    color: '#2E7D32',
  },
];

// ── Iconos de módulos ─────────────────────────────────────────────────────────
const MODULOS = [
  {
    id: 'pdm',
    nombre: 'Seguimiento PDM',
    descripcion: 'Consulta y hace seguimiento a las metas del Plan de Desarrollo Municipal 2024-2027 asignadas a esta secretaría.',
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
    ),
    activo: true,
    getPath: () => `/pdm`,
    color: '#1a2332',
  },
  {
    id: 'geovisor',
    nombre: 'Geovisor',
    descripcion: 'Visualiza y consulta las capas geográficas de tu secretaría sobre el mapa del municipio.',
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18M12 3a15 15 0 000 18" />
      </svg>
    ),
    activo: true,
    getPath: (secretariaId) => `/mapa/${secretariaId}`,
    color: '#1976D2',
  },
  {
    id: 'proyectos',
    nombre: 'Proyectos',
    descripcion: 'Gestiona y hace seguimiento a los proyectos territoriales de la secretaría.',
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 12h6M9 16h4" />
      </svg>
    ),
    activo: false,
    color: '#7B1FA2',
  },
  {
    id: 'subir_datos',
    nombre: 'Subir Datos',
    descripcion: 'Carga archivos CSV, Excel o GeoJSON para georreferenciarlos y visualizarlos en el mapa.',
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
    activo: true,
    getPath: (secretariaId) => `/portal/${secretariaId}/upload`,
    color: '#2E7D32',
  },
  {
    id: 'pipeline',
    nombre: 'Pipeline de Datos',
    descripcion: 'Gestiona el flujo ETL de archivos: desde la ingesta (raw) hasta la publicación en producción.',
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h16M4 12h16M4 18h16"/>
        <circle cx="4" cy="6" r="1.5" fill="currentColor"/>
        <circle cx="4" cy="12" r="1.5" fill="currentColor"/>
        <circle cx="4" cy="18" r="1.5" fill="currentColor"/>
      </svg>
    ),
    activo: true,
    getPath: (secretariaId) => `/portal/${secretariaId}/datos?tab=pipeline`,
    color: '#6D28D9',
  },
  {
    id: 'explorar_datos',
    nombre: 'Explorar Datos',
    descripcion: 'Consulta y previsualiza los archivos cargados por la secretaría con vista de tabla interactiva.',
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
    activo: true,
    getPath: (secretariaId) => `/portal/${secretariaId}/datos`,
    color: '#1565C0',
  },
  {
    id: 'reportes',
    nombre: 'Reportes',
    descripcion: 'Genera informes y estadísticas territoriales a partir de los datos de la secretaría.',
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6"  y1="20" x2="6"  y2="14" />
      </svg>
    ),
    activo: false,
    color: '#E65100',
  },
];

// ── Card de módulo ────────────────────────────────────────────────────────────
function ModuloCard({ modulo, secretariaId, secretariaColor }) {
  const path = modulo.activo && modulo.getPath ? modulo.getPath(secretariaId) : null;
  const cardColor = modulo.activo ? modulo.color : undefined;

  return (
    <div
      className={`portal-card${modulo.activo ? ' portal-card--active' : ' portal-card--coming'}`}
      style={{ '--card-color': cardColor || secretariaColor }}
    >
      <div className="portal-card-icon">
        {modulo.icono}
      </div>
      <div className="portal-card-body">
        <h3 className="portal-card-name">{modulo.nombre}</h3>
        <p className="portal-card-desc">{modulo.descripcion}</p>
      </div>
      <div className="portal-card-footer">
        {modulo.activo && path
          ? <Link to={path} className="portal-card-btn">Abrir →</Link>
          : <span className="portal-card-badge">Próximamente</span>
        }
      </div>
    </div>
  );
}

// ── Página portal ─────────────────────────────────────────────────────────────
export default function SecretariaPortalPage() {
  const { secretariaId } = useParams();
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const secretaria = getSecretariaById(secretariaId);

  if (!secretaria) {
    return (
      <div className="portal-error">
        <p>Secretaría no encontrada.</p>
        <Link to="/dashboard">Volver al inicio</Link>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'editor_geo';

  return (
    <div className="portal-page">

      {/* ── Header ── */}
      <header className="portal-header" style={{ '--sec-color': secretaria.color }}>
        <div className="portal-header-left">
          <div className="portal-header-brand">
            <img src="/logos/logocolombia.png" alt="Colombia" className="portal-logo" />
            <img src="/logos/alcaldia.png"     alt="Alcaldía" className="portal-logo" />
            <div className="portal-header-text">
              <div className="portal-entity">Alcaldía Municipal · Santander de Quilichao</div>
              <div className="portal-secretaria-name" style={{ color: secretaria.color }}>
                {secretaria.name}
              </div>
            </div>
          </div>
        </div>

        <div className="portal-header-right">
          {user && (
            <span className="portal-user-badge">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="7" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
              {user.username} · {user.role}
            </span>
          )}
          {isAdmin && (
            <button className="portal-back-btn" onClick={() => navigate('/dashboard')}>
              ← Dashboard
            </button>
          )}
          <button className="btn-logout" onClick={logout}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* ── Banda de color de secretaría ── */}
      <div className="portal-band" style={{ background: secretaria.color }} />

      {/* ── Scroll container ── */}
      <div className="portal-scroll">
      {/* ── Main ── */}
      <main className="portal-main">
        <div className="portal-hero">
          <div className="portal-hero-icon" style={{ background: secretaria.color }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
              <circle cx="12" cy="12" r="9"/>
              <path d="M3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18M12 3a15 15 0 000 18"/>
            </svg>
          </div>
          <div>
            <h1 className="portal-title">{secretaria.name}</h1>
            <p className="portal-subtitle">{secretaria.description}</p>
          </div>
        </div>

        <section className="portal-section">
          <h2 className="portal-section-title">
            <span className="portal-section-dot" style={{ background: secretaria.color }} />
            Módulos disponibles
          </h2>
          <div className="portal-grid">
            {(secretariaId === 'planeacion' ? [...MODULOS_PLANEACION, ...MODULOS]
              : secretariaId === 'gobierno' ? [...MODULOS_GOBIERNO, ...MODULOS]
              : secretariaId === 'aguas' ? [...MODULOS_AGUAS, ...MODULOS]
              : MODULOS)
            .filter(m => isAdmin || !['subir_datos', 'pipeline', 'explorar_datos'].includes(m.id))
            .map(m => (
              <ModuloCard
                key={m.id}
                modulo={m}
                secretariaId={secretariaId}
                secretariaColor={secretaria.color}
              />
            ))}
          </div>
        </section>
      </main>
      </div>{/* /portal-scroll */}
    </div>
  );
}
