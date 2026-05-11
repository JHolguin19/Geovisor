import { useContext, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import SECRETARIAS, { getSecretariaById } from '../config/secretarias';
import './DashboardPage.css';

// ── Iconos SVG por secretaría ──────────────────────────────────────────────────
function SecretariaIcon({ id }) {
  const icons = {
    sig: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18M12 3a15 15 0 000 18" />
      </svg>
    ),
    planeacion: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 12h6M9 16h4" />
      </svg>
    ),
    obras: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
      </svg>
    ),
    ambiente: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 11-2.87 19.57M12 2c-5 5-5 10-3 14M12 2c5 5 5 10 3 14" />
        <path d="M12 22v-8" />
      </svg>
    ),
    educacion: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      </svg>
    ),
    desarrollo_social: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    gobierno: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />
      </svg>
    ),
    salud: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    ),
    hacienda: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
    cultura: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="2" />
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
      </svg>
    ),
    deportes: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55-.47 1-1 1-3 0-5.5-2.24-5.5-5a2.5 2.5 0 012.5-2.5c.9 0 1.72.47 2.18 1.21L10 14.66z" />
        <path d="M18 2H6v7a6 6 0 0012 0V2z" />
      </svg>
    ),
    transito: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="2" />
        <path d="M16 8h4l3 3v5h-7V8zM5.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM18.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
      </svg>
    ),
    gestion_riesgo: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
    ),
    talento_humano: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    merquilichao: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3h18v18H3zM3 9h18M9 21V9" />
        <path d="M13 13h4M13 17h4" />
      </svg>
    ),
  };
  return icons[id] || icons.talento_humano;
}

// ── Card individual ────────────────────────────────────────────────────────────
function SecretariaCard({ secretaria }) {
  const { id, name, color, description, hasMapa } = secretaria;

  return (
    <div className={`sec-card${hasMapa ? ' sec-card--active' : ' sec-card--coming'}`}
         style={{ '--card-color': color }}>
      <div className="sec-card-icon">
        <SecretariaIcon id={id} />
      </div>
      <div className="sec-card-body">
        <h3 className="sec-card-name">{name}</h3>
        <p className="sec-card-desc">{description}</p>
      </div>
      {hasMapa
        ? <Link to={`/portal/${id}`} className="sec-card-btn">Abrir Portal →</Link>
        : <span className="sec-card-badge">En construcción</span>
      }
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // Usuarios con secretaría asignada van directo a su portal
  useEffect(() => {
    if (user && user.role !== 'admin' && user.role !== 'editor_geo' && user.secretaria) {
      navigate(`/portal/${user.secretaria}`, { replace: true });
    }
  }, [user, navigate]);

  const activas = SECRETARIAS.filter(s => s.hasMapa).sort((a, b) => a.orden - b.orden);
  const proximamente = SECRETARIAS.filter(s => !s.hasMapa).sort((a, b) => a.orden - b.orden);

  return (
    <div className="dashboard-page">
      {/* ── Header ── */}
      <header className="dash-header">
        <div className="dash-header-brand">
          <img src="/logos/logocolombia.png" alt="Colombia" className="dash-logo" />
          <img src="/logos/alcaldia.png"     alt="Alcaldía" className="dash-logo" />
          <div>
            <div className="dash-entity">Alcaldía Municipal</div>
            <div className="dash-city">Santander de Quilichao</div>
          </div>
        </div>
        <div className="dash-header-right">
          {user?.role === 'admin' && (
            <NavLink to="/admin/usuarios" className="dash-admin-btn">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
              Usuarios
            </NavLink>
          )}
          {user && (
            <span className="dash-user-badge">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="7" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
              {user.username} · {user.role}
            </span>
          )}
          {user && (
            <button className="btn-logout" onClick={logout}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Cerrar sesión
            </button>
          )}
        </div>
      </header>

      {/* ── Main ── */}
      <main className="dash-main">
        <div className="dash-hero">
          <h1 className="dash-title">Geovisor Municipal</h1>
          <p className="dash-subtitle">Sistema de Información Geográfica · Selecciona la secretaría</p>
        </div>

        {/* Geovisores activos */}
        <section className="dash-section">
          <h2 className="dash-section-title">
            <span className="dash-section-dot dash-section-dot--active" />
            Geovisores disponibles
            <span className="dash-section-count">{activas.length}</span>
          </h2>
          <div className="sec-grid">
            {activas.map(s => <SecretariaCard key={s.id} secretaria={s} />)}
          </div>
        </section>

        {/* Próximamente */}
        <section className="dash-section">
          <h2 className="dash-section-title">
            <span className="dash-section-dot dash-section-dot--soon" />
            En construcción
            <span className="dash-section-count">{proximamente.length}</span>
          </h2>
          <div className="sec-grid sec-grid--sm">
            {proximamente.map(s => <SecretariaCard key={s.id} secretaria={s} />)}
          </div>
        </section>
      </main>
    </div>
  );
}
