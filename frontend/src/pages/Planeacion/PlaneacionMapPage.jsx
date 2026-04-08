import { useParams, Link } from 'react-router-dom';
import VisorPotencialRecaudo from './Catastro/VisorPotencialRecaudo';
import VisorPagos2025 from './Catastro/VisorPagos2025';
import VisorVillaMariana from './Vivienda/VisorVillaMariana';
import './Planeacion.css';

const VISOR_MAP = {
  'potencial-recaudo': {
    componente: VisorPotencialRecaudo,
    titulo: 'Potencial de Recaudo',
    categoria: 'catastro',
    categoriaLabel: 'Catastro',
    color: '#1A5F9B',
    badge: 'Avalúos · Tarifas',
  },
  'pagos-2025': {
    componente: VisorPagos2025,
    titulo: 'Estado de Pagos 2025',
    categoria: 'catastro',
    categoriaLabel: 'Catastro',
    color: '#15803d',
    badge: 'Recaudo · Cartera',
  },
  'villamariana': {
    componente: VisorVillaMariana,
    titulo: 'Proyecto Villa Mariana',
    categoria: 'vivienda',
    categoriaLabel: 'Vivienda',
    color: '#15803d',
    badge: 'Beneficiarios',
  },
};

export default function PlaneacionMapPage() {
  const { visorId } = useParams();
  const config = VISOR_MAP[visorId];

  if (!config) {
    return (
      <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',gap:12,color:'var(--text-muted)' }}>
        <span style={{ fontSize:48 }}>🗺️</span>
        <h3 style={{ fontFamily:'Barlow Condensed',color:'var(--navy)',fontSize:24,fontWeight:700 }}>Visor no encontrado</h3>
        <Link to="/portal/planeacion" style={{ color:'var(--blue)',fontWeight:600,textDecoration:'none' }}>← Volver a Planeación</Link>
      </div>
    );
  }

  const { componente: VisorComponent, titulo, categoria, categoriaLabel, color, badge } = config;

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column' }}>

      {/* Barra de navegación del visor */}
      <div className="visor-topbar" style={{ '--visor-color': color }}>
        <Link to={`/planeacion/${categoria}`} className="visor-topbar-back">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          {categoriaLabel}
        </Link>
        <span className="visor-topbar-sep">›</span>
        <span className="visor-topbar-title">{titulo}</span>
        {badge && <span className="visor-topbar-badge">{badge}</span>}
      </div>

      {/* Contenedor del visor */}
      <div style={{ flex:1, position:'relative', overflow:'hidden' }}>
        <VisorComponent />
      </div>
    </div>
  );
}
