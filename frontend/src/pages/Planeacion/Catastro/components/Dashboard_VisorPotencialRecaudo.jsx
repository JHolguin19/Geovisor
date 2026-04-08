import { useMemo, useState } from 'react';
import '../../Planeacion.css';

const Dashboard = ({ datos, tarifaActiva, onSelectTarifa, zonaActiva, onSelectZona }) => {
  const [vista, setVista] = useState('resumen');

  const estadisticas = useMemo(() => {
    if (!datos) return null;
    let totalUrbano = 0, totalRural = 0;
    const conteoTarifas = {};

    datos.features.forEach(f => {
      const zona = (f.properties.zona || '').toLowerCase();
      if (zona.includes('urban')) totalUrbano++;
      else if (zona.includes('rural')) totalRural++;

      const contar = zonaActiva === null || zona.includes(zonaActiva);
      if (contar) {
        const raw = f.properties.tarifa;
        const label = raw ? `Tarifa ${raw}` : 'Sin Información';
        if (!conteoTarifas[label]) conteoTarifas[label] = { cantidad: 0, rawValue: raw || null };
        conteoTarifas[label].cantidad++;
      }
    });

    const ranking = Object.entries(conteoTarifas)
      .map(([nombre, d]) => ({ nombre, cantidad: d.cantidad, rawValue: d.rawValue }))
      .sort((a, b) => b.cantidad - a.cantidad);

    return {
      total: datos.features.length,
      urbano: totalUrbano,
      rural: totalRural,
      ranking,
      totalFiltrado: ranking.reduce((acc, i) => acc + i.cantidad, 0),
    };
  }, [datos, zonaActiva]);

  if (!estadisticas) return null;

  const TABS = [
    { id: 'resumen', label: 'Zonas' },
    { id: 'tarifas', label: 'Tarifas' },
  ];

  return (
    <div className="sidepanel">

      {/* Header */}
      <div className="sidepanel-header sidepanel-header--blue">
        <div className="sidepanel-title">📊 Panel de Control</div>
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

      {/* Body */}
      <div className="sidepanel-body">

        {/* Vista: Resumen Zonas */}
        {vista === 'resumen' && (
          <>
            <button
              className={`sidepanel-item${zonaActiva === null ? ' sidepanel-item--active' : ''}`}
              onClick={() => onSelectZona(null)}
            >
              <span className={`sidepanel-item-label${zonaActiva === null ? ' sidepanel-item-label--active' : ''}`}>Total Predios</span>
              <span className="sidepanel-badge sidepanel-badge--primary">{estadisticas.total}</span>
            </button>
            <button
              className={`sidepanel-item${zonaActiva === 'urbana' ? ' sidepanel-item--active' : ''}`}
              onClick={() => { onSelectZona('urbana'); onSelectTarifa(null); }}
            >
              <span className="sidepanel-item-label sidepanel-item-label--muted">🏙️ Zona Urbana</span>
              <span className="sidepanel-badge sidepanel-badge--secondary">{estadisticas.urbano}</span>
            </button>
            <button
              className={`sidepanel-item${zonaActiva === 'rural' ? ' sidepanel-item--active' : ''}`}
              onClick={() => { onSelectZona('rural'); onSelectTarifa(null); }}
            >
              <span className="sidepanel-item-label sidepanel-item-label--muted">🌲 Zona Rural</span>
              <span className="sidepanel-badge sidepanel-badge--success">{estadisticas.rural}</span>
            </button>
          </>
        )}

        {/* Vista: Tarifas */}
        {vista === 'tarifas' && (
          <>
            <div className="sidepanel-subheader">
              {zonaActiva === 'urbana' ? '🏙️ Zona Urbana' : zonaActiva === 'rural' ? '🌲 Zona Rural' : 'Todas las zonas'}
            </div>
            <button
              className={`sidepanel-show-all${tarifaActiva === null ? ' sidepanel-show-all--active' : ''}`}
              onClick={() => onSelectTarifa(null)}
            >
              Mostrar todos ({estadisticas.totalFiltrado})
            </button>
            {estadisticas.ranking.length === 0
              ? <div style={{ padding:'20px',textAlign:'center',fontSize:12,color:'var(--text-light)' }}>Sin tarifas en esta zona</div>
              : estadisticas.ranking.map((item, i) => (
                <button
                  key={i}
                  className={`sidepanel-item${tarifaActiva === item.rawValue ? ' sidepanel-item--active' : ''}`}
                  onClick={() => onSelectTarifa(item.rawValue)}
                >
                  <span className={`sidepanel-item-label${tarifaActiva === item.rawValue ? ' sidepanel-item-label--active' : ' sidepanel-item-label--muted'}`}>
                    {i + 1}. {item.nombre}
                  </span>
                  <span className={`sidepanel-badge ${tarifaActiva === item.rawValue ? 'sidepanel-badge--primary' : 'sidepanel-badge--outline'}`}>
                    {item.cantidad}
                  </span>
                </button>
              ))
            }
          </>
        )}
      </div>

      <div className="sidepanel-footer">GeoVisor Alcaldía · Catastro</div>
    </div>
  );
};

export default Dashboard;
