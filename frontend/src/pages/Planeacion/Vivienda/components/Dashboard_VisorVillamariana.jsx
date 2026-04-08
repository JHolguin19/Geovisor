import { useMemo, useState } from 'react';
import '../../Planeacion.css';

const Dashboard_VisorVillamariana = ({ datos, barrioActivo, onSelectBarrio, zonaActiva, onSelectZona }) => {
  const [vista, setVista] = useState('impacto');

  const stats = useMemo(() => {
    if (!datos) return null;
    let s = { familias:0, personas:0, mujeres:0, hombres:0, cabeza:0, victimas:0, discapacidad:0, lgtbiq:0, urbano:0, rural:0, barrios:[] };
    const cnt = {};

    datos.features.forEach(f => {
      if (f.properties.tipo !== 'poligono') return;
      const p = f.properties;
      const zona = (p.tipo_zona || '').toLowerCase();

      if (zona.includes('urban')) s.urbano += (p.total_familias || 0);
      else if (zona.includes('rural')) s.rural += (p.total_familias || 0);

      const pasa = zonaActiva === null || zona.includes(zonaActiva);
      if (pasa) {
        s.familias    += (p.total_familias    || 0);
        s.personas    += (p.total_personas    || 0);
        s.mujeres     += (p.total_mujeres     || 0);
        s.hombres     += (p.total_hombres     || 0);
        s.cabeza      += (p.cabeza_hogar      || 0);
        s.victimas    += (p.total_victimas    || 0);
        s.discapacidad+= (p.total_discapacidad|| 0);
        s.lgtbiq      += (p.total_lgtbiq      || 0);

        const key = (p.nombre_barrio || 'SIN BARRIO').toUpperCase();
        if (!cnt[key]) cnt[key] = { n: 0, raw: p.nombre_barrio };
        cnt[key].n += (p.total_familias || 0);
      }
    });

    s.barrios = Object.entries(cnt)
      .map(([nombre, d]) => ({ nombre, cantidad: d.n, rawValue: d.raw }))
      .sort((a, b) => b.cantidad - a.cantidad);

    return s;
  }, [datos, zonaActiva]);

  if (!stats) return null;

  const TABS = [
    { id: 'impacto', label: '📊 Impacto' },
    { id: 'zonas',   label: '🗺️ Zonas'   },
    { id: 'barrios', label: '📍 Barrios'  },
  ];

  const ENFOQUES = [
    { label: 'Madres Cabeza', value: stats.cabeza,       emoji: '👑', color: '#d97706' },
    { label: 'Víctimas',      value: stats.victimas,     emoji: '🕊️', color: '#dc2626' },
    { label: 'Discapacidad',  value: stats.discapacidad, emoji: '♿', color: '#374151' },
    { label: 'LGTBIQ+',       value: stats.lgtbiq,       emoji: '🏳️‍🌈', color: '#e83e8c' },
  ];

  return (
    <div className="sidepanel" style={{ width: 330 }}>

      <div className="sidepanel-header sidepanel-header--green">
        <div className="sidepanel-title">🏘️ Proyecto Villamariana</div>
        <div className="sidepanel-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`sidepanel-tab${vista === t.id ? ' sidepanel-tab--active' : ''}`}
              onClick={() => setVista(t.id)}
            >{t.label}</button>
          ))}
        </div>
      </div>

      <div className="sidepanel-body">

        {/* IMPACTO */}
        {vista === 'impacto' && (
          <>
            {zonaActiva && (
              <div className="sidepanel-zona-badge">
                Zona activa: <strong>{zonaActiva.toUpperCase()}</strong>
              </div>
            )}

            <div className="sidepanel-highlight-row">
              <div className="sidepanel-highlight sidepanel-highlight--primary">
                <span className="sidepanel-highlight-val">{stats.familias}</span>
                <span className="sidepanel-highlight-label">Familias</span>
              </div>
              <div className="sidepanel-highlight sidepanel-highlight--info">
                <span className="sidepanel-highlight-val">{stats.personas}</span>
                <span className="sidepanel-highlight-label">Personas</span>
              </div>
            </div>

            <div className="sidepanel-body-section">Enfoque diferencial</div>

            <div className="sidepanel-stats-grid">
              {ENFOQUES.map(e => (
                <div key={e.label} className="sidepanel-stat-card" style={{ '--stat-color': e.color }}>
                  <span className="sidepanel-stat-label">{e.label}</span>
                  <span className="sidepanel-stat-value">{e.emoji} {e.value}</span>
                </div>
              ))}
            </div>

            <div className="sidepanel-body-section">Género</div>
            <div style={{ display:'flex',justifyContent:'space-between',padding:'10px 16px',background:'var(--white)' }}>
              <span style={{ fontSize:13,color:'var(--text-muted)',fontWeight:600 }}>
                👧 <strong style={{ color:'var(--blue)' }}>{stats.mujeres}</strong> mujeres
              </span>
              <span style={{ fontSize:13,color:'var(--text-muted)',fontWeight:600 }}>
                👦 <strong style={{ color:'var(--text)' }}>{stats.hombres}</strong> hombres
              </span>
            </div>
          </>
        )}

        {/* ZONAS */}
        {vista === 'zonas' && (
          <>
            <button className={`sidepanel-item${zonaActiva === null ? ' sidepanel-item--active' : ''}`} onClick={() => onSelectZona(null)}>
              <span className={`sidepanel-item-label${zonaActiva === null ? ' sidepanel-item-label--active' : ''}`}>Municipio Total</span>
              <span className="sidepanel-badge sidepanel-badge--success">{stats.urbano + stats.rural} fam.</span>
            </button>
            <button className={`sidepanel-item${zonaActiva === 'urbana' ? ' sidepanel-item--active' : ''}`}
              onClick={() => { onSelectZona('urbana'); onSelectBarrio(null); }}>
              <span className="sidepanel-item-label sidepanel-item-label--muted">🏙️ Zona Urbana</span>
              <span className="sidepanel-badge sidepanel-badge--secondary">{stats.urbano} fam.</span>
            </button>
            <button className={`sidepanel-item${zonaActiva === 'rural' ? ' sidepanel-item--active' : ''}`}
              onClick={() => { onSelectZona('rural'); onSelectBarrio(null); }}>
              <span className="sidepanel-item-label sidepanel-item-label--muted">🌲 Zona Rural</span>
              <span className="sidepanel-badge sidepanel-badge--success">{stats.rural} fam.</span>
            </button>
          </>
        )}

        {/* BARRIOS */}
        {vista === 'barrios' && (
          <>
            <div className="sidepanel-subheader">
              Ranking {zonaActiva === 'urbana' ? '· Urbana' : zonaActiva === 'rural' ? '· Rural' : ''}
            </div>
            <button
              className={`sidepanel-show-all${barrioActivo === null ? ' sidepanel-show-all--active' : ''}`}
              onClick={() => onSelectBarrio(null)}
            >
              Mostrar todos en el mapa
            </button>
            {stats.barrios.map((item, i) => (
              <button
                key={i}
                className={`sidepanel-item${barrioActivo === item.rawValue ? ' sidepanel-item--active' : ''}`}
                onClick={() => onSelectBarrio(item.rawValue)}
              >
                <span className={`sidepanel-item-label${barrioActivo === item.rawValue ? ' sidepanel-item-label--active' : ' sidepanel-item-label--muted'}`}
                  style={{ fontSize: 12 }}>
                  {i + 1}. {item.nombre}
                </span>
                <span className={`sidepanel-badge ${barrioActivo === item.rawValue ? 'sidepanel-badge--success' : 'sidepanel-badge--outline'}`}>
                  {item.cantidad}
                </span>
              </button>
            ))}
          </>
        )}
      </div>

      <div className="sidepanel-footer">GeoVisor Alcaldía · Secretaría de Planeación</div>
    </div>
  );
};

export default Dashboard_VisorVillamariana;
