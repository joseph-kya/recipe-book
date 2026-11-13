import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { slidePill } from './motion.js';
import { clampFactor, CUSTOM_MAX, CUSTOM_MIN, factorLabel, scaleStat, yieldStat } from './scale.js';
import { useScale } from './useScale.js';

const round1 = (x) => Math.round(x * 10) / 10;
const parse = (s) => Number(String(s).replace(',', '.').trim());

// A small row of diner chips on the ingredient card's head, offering only the
// factors at which every amount can really be measured (see offeredFactors).
// With a plain-number yield the chips read as that yield ("12 24 48"), and the
// stat's own label sits beside them once; otherwise as factors ("1× 2× 4×").
// The last chip, "custom", opens a stepper that scales exactly as entered:
// in servings when there is a yield, else as a free factor (0.1–10×).
export default function Scaler({ recipe, text, textLang, t }) {
  const { factor, custom, offered, setFactor, setCustom } = useScale(recipe);
  const y = yieldStat(text);
  const base = y ? Number(y.value) : 1; // servings per 1×, or 1 for a plain factor
  const shown = round1(factor * base);
  const [draft, setDraft] = useState(String(shown));
  const timer = useRef(0);
  const field = useRef(null);
  const opening = useRef(false);
  const groupRef = useRef(null);
  const animRef = useRef(null);
  const prevSelection = useRef({ factor, custom });
  const chipLabel = (f) => (y ? scaleStat(y.value, f) : factorLabel(f));
  const labels = offered.map(chipLabel).join('|');

  useEffect(() => () => {
    animRef.current?.cancel();
  }, []);

  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const indicator = group.querySelector('.scaler-indicator');
    const buttons = [...group.querySelectorAll('.scaler-chip')];
    let disposed = false;
    const prev = prevSelection.current;
    prevSelection.current = { factor, custom };
    const animate = !custom && (prev.custom || prev.factor !== factor);

    const measure = (shouldAnimate = false) => {
      if (disposed || !indicator) return;
      const active = group.querySelector('[aria-pressed="true"]');
      slidePill(group, indicator, active, { animate: shouldAnimate, animRef });
    };
    measure(animate);
    const observer = new ResizeObserver(() => measure(false));
    observer.observe(group);
    buttons.forEach((b) => observer.observe(b));
    const onFonts = () => measure(false);
    document.fonts?.ready.then(onFonts);
    document.fonts?.addEventListener('loadingdone', onFonts);
    return () => {
      disposed = true;
      observer.disconnect();
      document.fonts?.removeEventListener('loadingdone', onFonts);
    };
  }, [factor, custom, labels]);

  // keep the field in step with the saved value unless someone is typing in it
  useEffect(() => {
    if (document.activeElement !== field.current) setDraft(String(shown));
  }, [shown]);

  // focus the field when the custom chip opens it
  useEffect(() => {
    if (custom && opening.current) {
      opening.current = false;
      field.current?.focus();
      field.current?.select();
    }
  }, [custom]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const commit = (value) => {
    const v = parse(value);
    if (!Number.isFinite(v) || v <= 0) return;
    setCustom(clampFactor(v / base), { animate: false });
  };

  const onType = (e) => {
    setDraft(e.target.value);
    clearTimeout(timer.current);
    // debounced: desktop spreads re-paginate on each commit
    timer.current = setTimeout(() => commit(e.target.value), 350);
  };

  const step = (dir) => {
    clearTimeout(timer.current);
    const unit = y ? 1 : 0.1;
    const current = Number.isFinite(parse(draft)) ? parse(draft) : shown;
    const next = clampFactor(round1(current + dir * unit) / base);
    setDraft(String(round1(next * base)));
    setCustom(next, { animate: false });
  };

  const min = round1(CUSTOM_MIN * base);
  const max = round1(CUSTOM_MAX * base);
  const fieldLabel = y ? `${t.customAmount}: ${y.label}` : `${t.customAmount} (×)`;

  return (
    <div className="scaler-row">
      <div ref={groupRef} className="scaler" role="group" aria-label={y ? `${t.scale}: ${y.label}` : t.scale}>
        {offered.map((f) => {
          const textLabel = chipLabel(f);
          return (
            <button
              key={f}
              type="button"
              className="scaler-chip"
              aria-pressed={!custom && factor === f}
              onClick={() => setFactor(f)}
            >
              {textLabel}
              <span className="scaler-label-active" aria-hidden="true">{textLabel}</span>
            </button>
          );
        })}
        <span className="scaler-indicator" aria-hidden="true" />
      </div>
      {custom ? (
        <div className="scaler-custom" role="group" aria-label={t.customAmount}>
          <button type="button" className="scaler-step" aria-label={t.less} onClick={() => step(-1)} disabled={shown <= min}>
            −
          </button>
          <input
            ref={field}
            className="scaler-field"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            aria-label={fieldLabel}
            value={draft}
            onChange={onType}
            onBlur={() => {
              clearTimeout(timer.current);
              commit(draft);
              setDraft(String(shown));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                clearTimeout(timer.current);
                commit(draft);
              } else if (e.key === 'Escape') {
                e.currentTarget.blur();
              } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                // inside the field, arrows step the amount (never turn the page)
                e.preventDefault();
                e.stopPropagation();
                step(e.key === 'ArrowUp' ? 1 : -1);
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.stopPropagation(); // move the caret, not the book
              }
            }}
          />
          <button type="button" className="scaler-step" aria-label={t.more} onClick={() => step(1)} disabled={shown >= max}>
            +
          </button>
          {!y && (
            <span className="scaler-x" aria-hidden="true">
              ×
            </span>
          )}
        </div>
      ) : (
        <button
          type="button"
          className="scaler-chip scaler-chip--custom"
          aria-pressed="false"
          onClick={() => {
            opening.current = true;
            setCustom(factor, { animate: false });
          }}
        >
          {t.custom}
        </button>
      )}
      {y && (
        <span className="scaler-unit" lang={textLang} aria-hidden="true">
          {y.label}
        </span>
      )}
    </div>
  );
}
