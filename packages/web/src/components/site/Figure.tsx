/**
 * Figure — the production stand-in for the design's <image-slot> drop targets.
 * Renders a real <img> when `src` is given, otherwise a tasteful cream/coral
 * placeholder with a label so it's obvious where a photo belongs. Sizing is
 * controlled by the parent context selectors in pollistics.css
 * (e.g. `.hero-photo .figure`, `.founder-grid .figure`).
 */
export function Figure({
  label,
  src,
  alt = '',
  className = '',
}: {
  label?: string;
  src?: string;
  alt?: string;
  className?: string;
}) {
  return (
    <div className={`figure ${className}`.trim()}>
      {src ? (
        <img src={src} alt={alt} />
      ) : (
        <div className="ph-in">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7h3l2-3h8l2 3h3a1 1 0 011 1v11a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
          {label && <span>{label}</span>}
        </div>
      )}
    </div>
  );
}
