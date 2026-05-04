import { Link, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import AuthContext from '../../context/AuthContext';
import './Header.css';

const NAV_ITEMS = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    roles: null, // visible para todos
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    )
  },
  {
    to: '/pipeline',
    label: 'Pipeline de Datos',
    roles: ['admin', 'editor_geo'], // solo roles privilegiados
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="6" height="18" rx="1"/>
        <rect x="9" y="8" width="6" height="13" rx="1"/>
        <rect x="16" y="5" width="6" height="16" rx="1"/>
      </svg>
    )
  },
  {
    to: '/admin/usuarios',
    label: 'Usuarios',
    roles: ['admin'], // solo admin
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
    )
  },
];

export default function Header({ onToggleSidebar, secretariaName, secretariaColor }) {
  const { pathname } = useLocation();
  const { user, logout } = useContext(AuthContext);

  return (
    <header className="app-header">
      {/* Franja superior: logos + título + nav */}
      <div className="header-top">
        <div className="header-brand">
          {/* Botón capas — solo visible en móvil o cuando hay sidebar */}
          {onToggleSidebar && (
            <button
              className="header-sidebar-toggle"
              onClick={onToggleSidebar}
              aria-label="Abrir panel de capas"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 13l4.553 2.276A1 1 0 0021 21.382V10.618a1 1 0 00-.553-.894L15 7m0 13V7m0 0L9 4" />
              </svg>
            </button>
          )}

          <img src="/logos/logocolombia.png" alt="Escudo Colombia" className="header-logo" />
          <img src="/logos/alcaldia.png"     alt="Logo Alcaldía"  className="header-logo" />
          <div className="header-title-block">
            <span className="header-entity">Alcaldía Municipal</span>
            <span className="header-city">Santander de Quilichao</span>
          </div>
        </div>

        <nav className="header-nav">
          {NAV_ITEMS
            .filter(item => !item.roles || item.roles.includes(user?.role))
            .map(item => (
              <Link
                key={item.to}
                to={item.to}
                className={`header-nav-link${pathname.startsWith(item.to) ? ' active' : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
        </nav>

        <button className="header-logout-btn" onClick={logout} title="Cerrar sesión">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span>Cerrar sesión</span>
        </button>
      </div>

      {/* Franja inferior: nombre del módulo + secretaría activa */}
      <div className="header-module-bar">
        <span className="header-module-label">GEOVISOR MUNICIPAL</span>
        {secretariaName
          ? (
            <span className="header-module-dept">
              <span
                className="header-sec-dot"
                style={{ background: secretariaColor || 'var(--sky)' }}
              />
              {secretariaName}
            </span>
          )
          : <span className="header-module-dept">Sistema de Información Geográfica</span>
        }
      </div>
    </header>
  );
}
