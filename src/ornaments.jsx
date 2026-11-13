import { useId } from 'react';

// Small inline SVG ornaments from the Retro Diner sheet. All decorative.

// Bites taken out of the cover cupcake, in order (hold the cupcake to take one).
export const CUPCAKE_BITES = [
  { cx: 70, cy: 36, r: 22 },
  { cx: 28, cy: 52, r: 23 },
  { cx: 50, cy: 50, r: 60 },
];

export function Cupcake({ className = '', bites = 0 }) {
  const maskId = useId();
  const taken = CUPCAKE_BITES.slice(0, bites);
  const finished = bites >= CUPCAKE_BITES.length;
  const mask = taken.length ? `url(#${maskId})` : undefined;
  return (
    <svg className={`cupcake ${className}`} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      {taken.length > 0 && (
        <mask id={maskId}>
          <rect width="100" height="100" fill="#fff" />
          {taken.map((b, i) => (
            <circle key={i} cx={b.cx} cy={b.cy} r={b.r} fill="#000" />
          ))}
        </mask>
      )}
      {/* colours come from the colourway (src/theme.css), not the markup */}
      <g className="cupcake-line" strokeWidth="3" strokeLinejoin="round" mask={mask}>
        <path d="M22 38 h56 l-8 50 h-40 z" className="cupcake-cup" />
        <path d="M30 38 l4 50 M42 38 l1 50 M58 38 l-1 50 M70 38 l-4 50" strokeWidth="2" fill="none" />
        <ellipse cx="50" cy="34" rx="32" ry="9" className="cupcake-cream" />
        <path d="M28 32 q8-16 22-12 q14-6 22 12" className="cupcake-frosting" />
      </g>
      {/* the cherry survives bites 1–2, then goes with the last bite */}
      <g className="cupcake-line" strokeWidth="3" strokeLinejoin="round" mask={finished ? mask : undefined}>
        <circle cx="50" cy="14" r="6" className="cupcake-cherry" />
        <path d="M50 8 q3-6 8-6" fill="none" />
      </g>
    </svg>
  );
}

const CRUMBS = [
  { kind: 'chunk', dx: '-34px', dy: '-32px', rot: '-26deg', fill: 'var(--mustard)' },
  { kind: 'circle', r: 3.6, dx: '36px', dy: '-28px', rot: '32deg', fill: 'var(--cream)' },
  { kind: 'chunk', dx: '-42px', dy: '6px', rot: '-42deg', fill: 'var(--cream)' },
  { kind: 'circle', r: 3.2, dx: '42px', dy: '10px', rot: '22deg', fill: 'var(--mustard)' },
  { kind: 'circle', r: 3.5, dx: '-26px', dy: '34px', rot: '-18deg', fill: 'var(--mustard)' },
  { kind: 'chunk', dx: '28px', dy: '36px', rot: '38deg', fill: 'var(--cream)' },
  { kind: 'circle', r: 2.6, dx: '-4px', dy: '-42px', rot: '14deg', fill: 'var(--choc)' },
  { kind: 'circle', r: 2.6, dx: '6px', dy: '42px', rot: '-28deg', fill: 'var(--choc)' },
];

export function CupcakeCrumbs({ className = '' }) {
  return (
    <svg className={`cover-crumbs ${className}`} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      {CRUMBS.map((c, i) => (
        <g
          key={i}
          className="cover-crumb cupcake-line"
          style={{ '--dx': c.dx, '--dy': c.dy, '--rot': c.rot }}
          strokeWidth="2.4"
          strokeLinejoin="round"
        >
          {c.kind === 'chunk' ? (
            <path d="M46 47 l7 -1 l2 6 l-6 2 z" fill={c.fill} />
          ) : (
            <circle cx="50" cy="50" r={c.r} fill={c.fill} />
          )}
        </g>
      ))}
    </svg>
  );
}

// A diner service bell. Colours follow the colourway.
export function Bell({ className = '' }) {
  return (
    <svg className={`bell ${className}`} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <g className="cupcake-line" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        <path d="M18 70 q0-30 32-30 q32 0 32 30 z" className="cupcake-cream" />
        <path d="M44 40 v-8 h12 v8" className="cupcake-cup" />
        <circle cx="50" cy="26" r="6" className="cupcake-cherry" />
        <rect x="10" y="70" width="80" height="12" rx="3" className="cupcake-cup" />
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
