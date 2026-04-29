import { useContext } from 'react';
import MapContext from '../../context/MapContext';
import './IpmLegendPanel.css';

const IPM_RANGES = [
  { range: '0 – 10%',   color: '#ffffcc', label: 'Muy bajo',        rango: 1  },
  { range: '10 – 20%',  color: '#ffeda0', label: 'Bajo',             rango: 2  },
  { range: '20 – 30%',  color: '#fed976', label: 'Bajo-medio',       rango: 3  },
  { range: '30 – 40%',  color: '#feb24c', label: 'Medio',            rango: 4  },
  { range: '40 – 50%',  color: '#fd8d3c', label: 'Medio-alto',       rango: 5  },
  { range: '50 – 60%',  color: '#fc4e2a', label: 'Alto',             rango: 6  },
  { range: '60 – 70%',  color: '#e31a1c', label: 'Alto',             rango: 7  },
  { range: '70 – 80%',  color: '#bd0026', label: 'Muy alto',         rango: 8  },
  { range: '80 – 90%',  color: '#800026', label: 'Crítico',          rango: 9  },
  { range: '90 – 100%', color: '#4d0013', label: 'Crítico extremo',  rango: 10 },
];

export default function IpmLegendPanel() {
  const { activeLayers } = useContext(MapContext);
  if (!activeLayers.has('ipm_santander')) return null;

  return (
    <div className="ipm-legend">
      <div className="ipm-legend__header">
        <svg className="ipm-legend__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <span>IPM — Pobreza Multidimensional</span>
      </div>

      <div className="ipm-legend__body">
        <p className="ipm-legend__subtitle">Índice de Pobreza Multidimensional (%)</p>

        <div className="ipm-legend__scale">
          {IPM_RANGES.map(({ range, color, label, rango }) => (
            <div key={rango} className="ipm-legend__row">
              <span className="ipm-legend__swatch" style={{ background: color }} />
              <span className="ipm-legend__range">{range}</span>
              <span className="ipm-legend__label">{label}</span>
              <span className="ipm-legend__rango">R{rango}</span>
            </div>
          ))}
        </div>

        <div className="ipm-legend__gradient-bar">
          <div className="ipm-legend__gradient" />
          <div className="ipm-legend__gradient-ticks">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
