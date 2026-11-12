import { factorLabel, scaleStat, yieldStat } from './scale.js';
import { useScale } from './useScale.js';

// A small row of diner chips on the ingredient card's head, offering only the
// factors at which every amount can really be measured (see offeredFactors).
// With a plain-number yield the chips read as that yield ("12 24 48"), and the
// stat's own label sits beside them once; otherwise as factors ("1× 2× 4×").
export default function Scaler({ recipe, text, textLang, label }) {
  const [factor, setFactor, offered] = useScale(recipe);
  const y = yieldStat(text);
  return (
    <div className="scaler-row">
      <div className="scaler" role="group" aria-label={y ? `${label}: ${y.label}` : label}>
        {offered.map((f) => (
          <button
            key={f}
            type="button"
            className="scaler-chip"
            aria-pressed={factor === f}
            onClick={() => setFactor(f)}
          >
            {y ? scaleStat(y.value, f) : factorLabel(f)}
          </button>
        ))}
      </div>
      {y && (
        <span className="scaler-unit" lang={textLang} aria-hidden="true">
          {y.label}
        </span>
      )}
    </div>
  );
}
