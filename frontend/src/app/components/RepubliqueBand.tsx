/**
 * Bandeau institutionnel "Republique Gabonaise" affiche au-dessus de la nav.
 * Tres discret, typographie ceremonielle, identifie la plateforme comme
 * un service de l'Etat.
 */
export function RepubliqueBand() {
  return (
    <div className="pnpi-republique-band" aria-label="Republique Gabonaise">
      <div className="pnpi-republique-inner">
        <div className="pnpi-republique-seal" aria-hidden="true">
          <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            {/* Anneau tricolore (drapeau Gabon) */}
            <circle cx="16" cy="16" r="15" fill="none" stroke="#006233" strokeWidth="1.2" strokeDasharray="31.4 62.8" strokeDashoffset="0" />
            <circle cx="16" cy="16" r="15" fill="none" stroke="#FCD116" strokeWidth="1.2" strokeDasharray="31.4 62.8" strokeDashoffset="-31.4" />
            <circle cx="16" cy="16" r="15" fill="none" stroke="#3A75C4" strokeWidth="1.2" strokeDasharray="31.4 62.8" strokeDashoffset="-62.8" />
            {/* Monogramme PNPI */}
            <text x="16" y="20" textAnchor="middle" fontFamily="Playfair Display, serif" fontSize="9" fontWeight="800" fill="#1E3A8A">PI</text>
          </svg>
        </div>
        <div className="pnpi-republique-text">
          <span className="pnpi-republique-country">Republique Gabonaise</span>
          <span className="pnpi-republique-sep" aria-hidden="true">·</span>
          <span className="pnpi-republique-ministry">Ministere de l&apos;Industrie et de la Transformation Locale</span>
        </div>
        <div className="pnpi-republique-motto" aria-hidden="true">
          <span>Union &middot; Travail &middot; Justice</span>
        </div>
      </div>
    </div>
  );
}
