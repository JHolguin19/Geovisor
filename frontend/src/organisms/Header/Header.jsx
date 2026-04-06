import { Link, useLocation } from 'react-router-dom';
import './Header.css';

const NAV_ITEMS = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    )
  },
];

export default function Header({ onToggleSidebar, secretariaName, secretariaColor }) {
  const { pathname } = useLocation();

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
          {NAV_ITEMS.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={`header-nav-link${pathname === item.to ? ' active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
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
