import { useId } from 'react';

// Small inline SVG ornaments from the Retro Diner sheet. All decorative.

// Build a scalloped bite edge of small rounded tooth marks (each segment is a
// circular arc curving into the cupcake) plus the closed cut-out mask path.
function scallopedBite(r, cusps, bulgeFactors, outer) {
  let edge = `M${cusps[0][0]} ${cusps[0][1]}`;
  for (let i = 1; i < cusps.length; i++) {
    const [x0, y0] = cusps[i - 1];
    const [x1, y1] = cusps[i];
    const chord = Math.hypot(x1 - x0, y1 - y0);
    const toothR = Number((chord * bulgeFactors[i - 1]).toFixed(2));
    edge += ` A${toothR} ${toothR} 0 0 0 ${x1} ${y1}`;
  }
  const mask = `${edge}${outer.map(([x, y]) => ` L${x} ${y}`).join('')} Z`;
  return { r, edge, mask };
}

// Bites taken out of the cover cupcake, in order (hold the cupcake to take one).
export const CUPCAKE_BITES = [
  // Bite 1: upper-right chomp with 5 varied rounded tooth marks
  scallopedBite(
    22,
    [[57, 17.5], [55, 25.5], [54.5, 35], [58, 44], [65.5, 51.5], [77.5, 57]],
    [0.53, 0.505, 0.505, 0.52, 0.62],
    [[96, 57], [96, 8], [57, 8]],
  ),
  // Bite 2: left/lower-left chomp with 5 differently proportioned tooth marks
  scallopedBite(
    23,
    [[24, 69.5], [33.5, 64.5], [40, 55.5], [40.5, 43.5], [37.5, 32], [32.5, 21]],
    [0.54, 0.51, 0.505, 0.515, 0.54],
    [[32.5, 14], [8, 14], [8, 69.5]],
  ),
  // Bite 3: final bite swallows the rest of the cupcake and cherry
  { r: 60, edge: null, mask: 'M-10 -10 H110 V110 H-10 Z' },
];

export function Cupcake({ className = '', bites = 0 }) {
  const uid = useId();
  const maskId = `${uid}-mask`;
  const clipId = `${uid}-clip`;
  const taken = CUPCAKE_BITES.slice(0, bites);
  const finished = bites >= CUPCAKE_BITES.length;
  const mask = taken.length ? `url(#${maskId})` : undefined;
  const edges = !finished ? taken.filter((b) => b.edge) : [];
  return (
    <svg className={`cupcake ${className}`} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      {taken.length > 0 && (
        <defs>
          <mask id={maskId}>
            <rect width="100" height="100" fill="#fff" />
            {taken.map((b, i) => (
              <path key={i} d={b.mask} fill="#000" />
            ))}
          </mask>
          {edges.length > 0 && (
            <clipPath id={clipId}>
              <path d="M22 38 h56 l-8 50 h-40 z" />
              <ellipse cx="50" cy="34" rx="32" ry="9" />
              <path d="M28 32 q8-16 22-12 q14-6 22 12" />
            </clipPath>
          )}
        </defs>
      )}
      {/* colours come from the colourway (src/theme.css), not the markup */}
      <g className="cupcake-line" strokeWidth="3" strokeLinejoin="round" mask={mask}>
        <path d="M22 38 h56 l-8 50 h-40 z" className="cupcake-cup" />
        <path d="M30 38 l4 50 M42 38 l1 50 M58 38 l-1 50 M70 38 l-4 50" strokeWidth="2" fill="none" />
        <ellipse cx="50" cy="34" rx="32" ry="9" className="cupcake-cream" />
        <path d="M28 32 q8-16 22-12 q14-6 22 12" className="cupcake-frosting" />
      </g>
      {edges.length > 0 && (
        <g
          className="cupcake-line"
          strokeWidth="2.2"
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
          clipPath={`url(#${clipId})`}
        >
          {edges.map((b, i) => (
            <path key={i} d={b.edge} />
          ))}
        </g>
      )}
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
  { kind: 'circle', r: 3.6, dx: '36px', dy: '-28px', rot: '32deg', fill: 'var(--cupcake-cream)' },
  { kind: 'chunk', dx: '-42px', dy: '6px', rot: '-42deg', fill: 'var(--cupcake-cream)' },
  { kind: 'circle', r: 3.2, dx: '42px', dy: '10px', rot: '22deg', fill: 'var(--mustard)' },
  { kind: 'circle', r: 3.5, dx: '-26px', dy: '34px', rot: '-18deg', fill: 'var(--mustard)' },
  { kind: 'chunk', dx: '28px', dy: '36px', rot: '38deg', fill: 'var(--cupcake-cream)' },
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
