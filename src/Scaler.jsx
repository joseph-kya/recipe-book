import { factorLabel, FACTORS } from './scale.js';
import { useScale } from './useScale.js';

// ½× 1× 2× 3×: a small row of diner chips on the ingredient card's head.
// Buttons with aria-pressed in a labelled group, like the other toggles.
export default function Scaler({ slug, label }) {
  const [factor, setFactor] = useScale(slug);
  return (
    <div className="scaler" role="group" aria-label={label}>
      {FACTORS.map((f) => (
        <button
          key={f}
          type="button"
          className="scaler-chip"
          aria-pressed={factor === f}
          onClick={() => setFactor(f)}
        >
          {factorLabel(f)}
        </button>
      ))}
    </div>
  );
}
