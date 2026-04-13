/**
 * Componente de popup que OpenLayers posiciona como overlay.
 * Los refs son pasados al hook useMapInit para que OL controle posición.
 */
export default function PopupOverlay({ popupRef, closerRef, contentRef }) {
  return (
    <div ref={popupRef} className="ol-popup">
      <button ref={closerRef} className="ol-popup-closer">&#x2716;</button>
      <div ref={contentRef} className="ol-popup-content" />
    </div>
  );
}
