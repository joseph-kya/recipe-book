// Small inline SVG ornaments from the Retro Diner sheet. All decorative.

export function Cupcake({ className = '' }) {
  return (
    <svg className={`cupcake ${className}`} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <g stroke="#3A2216" strokeWidth="3" strokeLinejoin="round">
        <path d="M22 38 h56 l-8 50 h-40 z" className="cupcake-cup" fill="#C8233A" />
        <path d="M30 38 l4 50 M42 38 l1 50 M58 38 l-1 50 M70 38 l-4 50" strokeWidth="2" fill="none" />
        <ellipse cx="50" cy="34" rx="32" ry="9" fill="#FFF4DF" />
        <path d="M28 32 q8-16 22-12 q14-6 22 12" fill="#7A4A35" />
        <circle cx="50" cy="14" r="6" fill="#C8233A" />
        <path d="M50 8 q3-6 8-6" fill="none" />
      </g>
    </svg>
  );
}

export function Checkers({ tone = 'choc', edge = 'top' }) {
  return <div className={`checkers checkers--${tone} checkers--${edge}`} aria-hidden="true" />;
}

export function Arrow({ dir }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="arrow-icon">
      <path
        d={dir === 'left' ? 'M15 5 8 12l7 7' : 'M9 5l7 7-7 7'}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
