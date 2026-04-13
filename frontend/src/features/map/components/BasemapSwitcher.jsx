import './BasemapSwitcher.css';

export default function BasemapSwitcher({ basemap, onChange }) {
  return (
    <div className="basemap-switcher">
      <button
        className={`bm-btn${basemap === 'osm' ? ' bm-btn--active' : ''}`}
        title="Mapa base OpenStreetMap"
        onClick={() => onChange('osm')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 13l4.553 2.276A1 1 0 0021 21.382V10.618a1 1 0 00-.553-.894L15 7m0 13V7m0 0L9 4" />
        </svg>
        Mapa
      </button>
      <button
        className={`bm-btn${basemap === 'satellite' ? ' bm-btn--active' : ''}`}
        title="Imagen satelital Esri (sin etiquetas)"
        onClick={() => onChange('satellite')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M6.343 6.343a8 8 0 1011.314 11.314A8 8 0 006.343 6.343zM3.515 3.515l3.536 3.536M20.485 20.485l-3.536-3.536M3.515 20.485l3.536-3.536M20.485 3.515l-3.536 3.536" />
        </svg>
        Satelite
      </button>
      <button
        className={`bm-btn${basemap === 'hybrid' ? ' bm-btn--active' : ''}`}
        title="Satelite con etiquetas (hibrido)"
        onClick={() => onChange('hybrid')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
        </svg>
        Hibrido
      </button>
    </div>
  );
}
