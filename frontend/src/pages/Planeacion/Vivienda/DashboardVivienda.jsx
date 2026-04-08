import { Link } from 'react-router-dom';
import { useContext } from 'react';
import AuthContext from '../../../context/AuthContext';
import '../Planeacion.css';

const PROYECTOS = [
  {
    id: 'villamariana',
    nombre: 'Proyecto Villa Mariana',
    desc: 'Visor geográfico de familias beneficiarias en zonas urbanas y rurales. Estadísticas de género, enfoque diferencial y georeferenciación.',
    icono: '🏘️',
    activo: true,
    color: '#15803d',
    path: '/planeacion/vivienda/villamariana',
    btnLabel: 'Ver Mapa de Beneficiarios',
  },
  {
    id: 'mejoramiento',
    nombre: 'Mejoramiento de Vivienda',
    desc: 'Base de datos de postulantes para subsidios de mejoramiento estructural.',
    icono: '🔧',
    activo: false,
    color: '#64748B',
  },
  {
    id: 'nuevos',
    nombre: 'Proyectos Nuevos',
    desc: 'Registro y seguimiento de iniciativas habitacionales en formulación.',
    icono: '📐',
    activo: false,
    color: '#64748B',
  },
];

export default function DashboardVivienda() {
  const { user } = useContext(AuthContext);

  return (
    <div className="plan-page">

      {/* Header */}
      <header className="plan-header">
        <div className="plan-header-brand">
          <img src="/logos/logocolombia.png" alt="Colombia" className="plan-logo" />
          <img src="/logos/alcaldia.png"     alt="Alcaldía" className="plan-logo" />
          <div className="plan-header-text">
            <span className="plan-entity">Alcaldía Municipal · Santander de Quilichao</span>
            <span className="plan-header-name" style={{ color: '#a7f3d0' }}>Secretaría de Planeación</span>
          </div>
        </div>
        <div className="plan-header-right">
          {user && (
            <span style={{ display:'flex',alignItems:'center',gap:6,padding:'6px 14px',background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.15)',borderRadius:99,color:'rgba(255,255,255,.75)',fontSize:12,fontWeight:600 }}>
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
      <div className="plan-band" style={{ background: '#15803d' }} />

      {/* Main */}
      <main className="plan-main">

        {/* Hero */}
        <div className="plan-hero">
          <div className="plan-hero-icon" style={{ background: '#15803d' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
              <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
              <path d="M9 21V12h6v9"/>
            </svg>
          </div>
          <div>
            <h1 className="plan-title">Módulo de Vivienda</h1>
            <p className="plan-subtitle">Gestión de proyectos habitacionales y beneficiarios del municipio.</p>
          </div>
        </div>

        {/* Activos */}
        <section className="plan-section">
          <h2 className="plan-section-title">
            <span className="plan-section-dot" style={{ background: '#15803d' }} />
            Proyectos activos
          </h2>
          <div className="plan-grid">
            {PROYECTOS.filter(p => p.activo).map(p => (
              <div key={p.id} className="plan-card plan-card--active" style={{ '--card-color': p.color }}>
                <div className="plan-card-icon">{p.icono}</div>
                <div className="plan-card-body">
                  <h3 className="plan-card-name">{p.nombre}</h3>
                  <p className="plan-card-desc">{p.desc}</p>
                </div>
                <div className="plan-card-footer">
                  <Link to={p.path} className="plan-card-btn" style={{ '--card-color': p.color }}>
                    {p.btnLabel} →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Próximamente */}
        <section className="plan-section">
          <h2 className="plan-section-title">
            <span className="plan-section-dot" style={{ background: '#94A3B8' }} />
            Próximamente
          </h2>
          <div className="plan-grid">
            {PROYECTOS.filter(p => !p.activo).map(p => (
              <div key={p.id} className="plan-card plan-card--coming" style={{ '--card-color': p.color }}>
                <div className="plan-card-icon">{p.icono}</div>
                <div className="plan-card-body">
                  <h3 className="plan-card-name">{p.nombre}</h3>
                  <p className="plan-card-desc">{p.desc}</p>
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
