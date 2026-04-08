import { useMemo, useState } from 'react';
import '../../Planeacion.css';

const fmt = (v) => new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(v || 0);

const Dashboard_VisorPagos2025 = ({
  datos,
  estadoActivo, onSelectEstado,
  zonaActiva,   onSelectZona,
  tarifaActiva, onSelectTarifa,
}) => {
  const [vista, setVista] = useState('resumen');

  const stats = useMemo(() => {
    if (!datos) return null;
    let s = { total: 0, urbano: 0, rural: 0, pagados: 0, deudores: 0, recaudado: 0, porTarifa: [] };
    const tmp = {};

    datos.features.forEach(f => {
      const p = f.properties;
      const zona = (p.zona || '').toLowerCase();
      const rec  = p.valorrecaudo || 0;
      const tar  = p.tarifa || 'Sin Tarifa';

      if (zona.includes('urban')) s.urbano++;
      else if (zona.includes('rural')) s.rural++;

      const pasaZona   = zonaActiva   === null || zona.includes(zonaActiva);
      const pasaEstado = estadoActivo === null || (estadoActivo === 'pagado' ? rec > 0 : rec === 0);
      const pasaTarifa = tarifaActiva === null || tar === tarifaActiva;

      if (pasaZona && pasaEstado && pasaTarifa) {
        s.total++;
        s.recaudado += rec;
        if (rec > 0) s.pagados++; else s.deudores++;
      }
      if (pasaZona && pasaEstado) {
        if (!tmp[tar]) tmp[tar] = 0;
        tmp[tar] += rec;
      }
    });

    s.porTarifa = Object.entries(tmp)
      .map(([nombre, dinero]) => ({ nombre, dinero, rawValue: nombre }))
      .sort((a, b) => b.dinero - a.dinero);

    return s;
  }, [datos, zonaActiva, estadoActivo, tarifaActiva]);

  if (!stats) return null;

  const TABS = [
    { id: 'resumen', label: 'Zonas'   },
    { id: 'estado',  label: 'Cartera' },
    { id: 'tarifas', label: 'Tarifa'  },
  ];

  return (
    <div className="sidepanel" style={{ width: 310 }}>

      <div className="sidepanel-header sidepanel-header--blue">
        <div className="sidepanel-title">💸 Recaudo Predial 2025</div>
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

      {/* Métrica principal */}
      <div className="sidepanel-metric">
        <span className="sidepanel-metric-label">Total recaudado</span>
        <span className="sidepanel-metric-value">{fmt(stats.recaudado)}</span>
      </div>

      <div className="sidepanel-body">

        {/* Zonas */}
        {vista === 'resumen' && (
          <>
            <button className={`sidepanel-item${zonaActiva === null ? ' sidepanel-item--active' : ''}`} onClick={() => onSelectZona(null)}>
              <span className={`sidepanel-item-label${zonaActiva === null ? ' sidepanel-item-label--active' : ''}`}>Total Predios</span>
              <span className="sidepanel-badge sidepanel-badge--primary">{stats.total}</span>
            </button>
            <button className={`sidepanel-item${zonaActiva === 'urbana' ? ' sidepanel-item--active' : ''}`} onClick={() => onSelectZona('urbana')}>
              <span className="sidepanel-item-label sidepanel-item-label--muted">🏙️ Zona Urbana</span>
              <span className="sidepanel-badge sidepanel-badge--secondary">{stats.urbano}</span>
            </button>
            <button className={`sidepanel-item${zonaActiva === 'rural' ? ' sidepanel-item--active' : ''}`} onClick={() => onSelectZona('rural')}>
              <span className="sidepanel-item-label sidepanel-item-label--muted">🌲 Zona Rural</span>
              <span className="sidepanel-badge sidepanel-badge--success">{stats.rural}</span>
            </button>
          </>
        )}

        {/* Estado de cartera */}
        {vista === 'estado' && (
          <>
            <button className={`sidepanel-item${estadoActivo === null ? ' sidepanel-item--active' : ''}`} onClick={() => onSelectEstado(null)}>
              <span className={`sidepanel-item-label${estadoActivo === null ? ' sidepanel-item-label--active' : ''}`}>Mostrar Todos</span>
              <span className="sidepanel-badge sidepanel-badge--primary">{stats.pagados + stats.deudores}</span>
            </button>
            <button className={`sidepanel-item${estadoActivo === 'pagado' ? ' sidepanel-item--active' : ''}`} onClick={() => onSelectEstado('pagado')}>
              <span className="sidepanel-item-label sidepanel-item-label--muted">
                <span style={{ display:'inline-block',width:8,height:8,borderRadius:'50%',background:'var(--success)',marginRight:6 }}/>
                Al Día (Pagados)
              </span>
              <span className="sidepanel-badge sidepanel-badge--success">{stats.pagados}</span>
            </button>
            <button className={`sidepanel-item${estadoActivo === 'deudor' ? ' sidepanel-item--active' : ''}`} onClick={() => onSelectEstado('deudor')}>
              <span className="sidepanel-item-label sidepanel-item-label--muted">
                <span style={{ display:'inline-block',width:8,height:8,borderRadius:'50%',background:'var(--error)',marginRight:6 }}/>
                En Deuda
              </span>
              <span className="sidepanel-badge sidepanel-badge--danger">{stats.deudores}</span>
            </button>
          </>
        )}

        {/* Por tarifa */}
        {vista === 'tarifas' && (
          <>
            <button
              className={`sidepanel-show-all${tarifaActiva === null ? ' sidepanel-show-all--active' : ''}`}
              onClick={() => onSelectTarifa(null)}
            >
              Mostrar todas las tarifas
            </button>
            {stats.porTarifa.map((item, i) => (
              <div
                key={i}
                className={`sidepanel-tarifa-item${tarifaActiva === item.rawValue ? ' sidepanel-tarifa-item--active' : ''}`}
                onClick={() => onSelectTarifa(item.rawValue)}
              >
                <span className={`sidepanel-tarifa-name${tarifaActiva === item.rawValue ? ' sidepanel-tarifa-name--active' : ''}`}>
                  Tarifa: {item.nombre}
                </span>
                <span className={`sidepanel-tarifa-value ${item.dinero > 0 ? 'sidepanel-tarifa-value--positive' : 'sidepanel-tarifa-value--zero'}`}>
                  {fmt(item.dinero)}
                </span>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="sidepanel-footer">GeoVisor Alcaldía · Hacienda</div>
    </div>
  );
};

export default Dashboard_VisorPagos2025;
