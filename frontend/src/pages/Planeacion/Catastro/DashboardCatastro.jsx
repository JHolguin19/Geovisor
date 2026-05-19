import { Link, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import AuthContext from '../../../context/AuthContext';
import '../Planeacion.css';

const HERRAMIENTAS = [
  {
    id: 'potencial-recaudo',
    nombre: 'Visor Potencial Recaudo',
    desc: 'Mapa interactivo con avalúos, tarifas y zonas para análisis de recaudo rural y urbano.',
    icono: '📍',
    activo: true,
    color: '#1A5F9B',
    path: '/planeacion/catastro/potencial-recaudo',
    btnLabel: 'Abrir Visor',
  },
  {
    id: 'pagos-2025',
    nombre: 'Estado de Pagos 2025',
    desc: 'Mapa semaforizado con el estado de recaudo, cartera morosa y predios al día.',
    icono: '💸',
    activo: true,
    color: '#15803d',
    path: '/planeacion/catastro/pagos-2025',
    btnLabel: 'Abrir Visor Financiero',
  },
  {
    id: 'zona-rural-avaluos',
    nombre: 'Análisis Zona Rural — Avalúos',
    desc: 'Impacto financiero de la actualización catastral rural: comparativo de avalúos, tarifas, Pareto y mapa de incrementos.',
    icono: '🌾',
    activo: true,
    color: '#2E7D32',
    path: '/planeacion/catastro/zona-rural-avaluos',
    btnLabel: 'Abrir Análisis',
  },
  {
    id: 'fichas',
    nombre: 'Fichas Prediales',
    desc: 'Generador de certificados y consulta detallada por código predial.',
    icono: '📄',
    activo: false,
    color: '#64748B',
  },
  {
    id: 'conservacion',
    nombre: 'Conservación Dinámica',
    desc: 'Registro de mutaciones de primera, segunda y tercera clase.',
    icono: '🔄',
    activo: false,
    color: '#64748B',
  },
];

export default function DashboardCatastro() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <div className="plan-page">

      {/* Header */}
      <header className="plan-header">
        <div className="plan-header-brand">
          <img src="/logos/logocolombia.png" alt="Colombia" className="plan-logo" />
          <img src="/logos/alcaldia.png"     alt="Alcaldía" className="plan-logo" />
          <div className="plan-header-text">
            <span className="plan-entity">Alcaldía Municipal · Santander de Quilichao</span>
            <span className="plan-header-name" style={{ color: '#90CAF9' }}>Secretaría de Planeación</span>
          </div>
        </div>
        <div className="plan-header-right">
          {user && (
            <span className="plan-user-badge" style={{ gap:6,padding:'6px 14px',background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.15)',borderRadius:99,color:'rgba(255,255,255,.75)',fontSize:12,fontWeight:600 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="7" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              {user.username}
            </span>
          )}
          <Link to="/portal/planeacion" className="plan-back-btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Portal
          </Link>
        </div>
      </header>

      {/* Banda de color */}
      <div className="plan-band" style={{ background: '#1A5F9B' }} />

      {/* Main */}
      <main className="plan-main">

        {/* Hero */}
        <div className="plan-hero">
          <div className="plan-hero-icon" style={{ background: '#1A5F9B' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18M9 21V9"/>
            </svg>
          </div>
          <div>
            <h1 className="plan-title">Gestión Catastral</h1>
            <p className="plan-subtitle">Selecciona el módulo o herramienta al que deseas ingresar.</p>
          </div>
        </div>

        {/* Sección activos */}
        <section className="plan-section">
          <h2 className="plan-section-title">
            <span className="plan-section-dot" style={{ background: '#1A5F9B' }} />
            Herramientas disponibles
          </h2>
          <div className="plan-grid">
            {HERRAMIENTAS.filter(h => h.activo).map(h => (
              <div
                key={h.id}
                className="plan-card plan-card--active"
                style={{ '--card-color': h.color }}
              >
                <div className="plan-card-icon">{h.icono}</div>
                <div className="plan-card-body">
                  <h3 className="plan-card-name">{h.nombre}</h3>
                  <p className="plan-card-desc">{h.desc}</p>
                </div>
                <div className="plan-card-footer">
                  <Link to={h.path} className="plan-card-btn" style={{ '--card-color': h.color }}>
                    {h.btnLabel} →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Sección próximamente */}
        <section className="plan-section">
          <h2 className="plan-section-title">
            <span className="plan-section-dot" style={{ background: '#94A3B8' }} />
            Próximamente
          </h2>
          <div className="plan-grid">
            {HERRAMIENTAS.filter(h => !h.activo).map(h => (
              <div
                key={h.id}
                className="plan-card plan-card--coming"
                style={{ '--card-color': h.color }}
              >
                <div className="plan-card-icon" style={{ fontSize: '20px' }}>{h.icono}</div>
                <div className="plan-card-body">
                  <h3 className="plan-card-name">{h.nombre}</h3>
                  <p className="plan-card-desc">{h.desc}</p>
                </div>
                <div className="plan-card-footer">
                  <span className="plan-card-badge">En desarrollo</span>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
