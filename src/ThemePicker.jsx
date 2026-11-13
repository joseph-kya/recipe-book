import { useEffect, useRef } from 'react';
import { THEME_IDS, THEMES, useTheme } from './theme.js';
import { themeText } from './theme-i18n.js';
import { reducedMotion } from './motion.js';
import './theme-picker.css';

// The cover's colourway picker: a row of round swatches, each split into its
// primary and accent, plus a diner nameplate for the active flavour.
// A radio group: arrows move and choose, Tab enters once.
export default function ThemePicker({ lang }) {
  const [theme, setTheme] = useTheme();
  const t = themeText[lang] || themeText.en;
  const buttons = useRef([]);
  const plateRef = useRef(null);
  const prevTheme = useRef(theme);
  const animsRef = useRef([]);

  useEffect(() => () => animsRef.current.forEach((a) => a?.cancel()), []);

  useEffect(() => {
    const prev = prevTheme.current;
    prevTheme.current = theme;
    if (prev === theme || reducedMotion()) return;
    animsRef.current.forEach((a) => a?.cancel());
    const activeBtn = buttons.current[THEME_IDS.indexOf(theme)];
    const plate = plateRef.current;
    const created = [];
    if (activeBtn?.animate) {
      created.push(
        activeBtn.animate(
          [
            { transform: 'scale(0.92)' },
            { transform: 'scale(1.08)', offset: 0.48 },
            { transform: 'scale(1)' },
          ],
          { delay: 40, duration: 220, easing: 'cubic-bezier(0.32, 1.32, 0.56, 1)' },
        ),
      );
    }
    if (plate?.animate) {
      created.push(
        plate.animate(
          [
            { transform: 'translateY(2px) scale(0.95)' },
            { transform: 'translateY(0) scale(1)' },
          ],
          { delay: 50, duration: 190, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
        ),
      );
    }
    animsRef.current = created;
  }, [theme]);

  const onKeyDown = (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    e.stopPropagation(); // arrows choose a colour here, they never turn the page
    const i = (THEME_IDS.indexOf(theme) + step + THEME_IDS.length) % THEME_IDS.length;
    setTheme(THEME_IDS[i]);
    buttons.current[i]?.focus();
  };

  return (
    <div className="theme-picker-wrap">
      <div className="theme-picker" role="radiogroup" aria-label={t.group} onKeyDown={onKeyDown}>
        {THEME_IDS.map((id, i) => (
          <button
            key={id}
            ref={(el) => (buttons.current[i] = el)}
            type="button"
            role="radio"
            aria-checked={theme === id}
            aria-label={t.names[id]}
            tabIndex={theme === id ? 0 : -1}
            className="theme-swatch"
            style={{ '--sw-a': THEMES[id].primary, '--sw-b': THEMES[id].accent }}
            onClick={() => setTheme(id)}
          />
        ))}
      </div>
      <span
        ref={plateRef}
        className="theme-nameplate"
        aria-hidden="true"
        style={{ '--sw-a': THEMES[theme].primary, '--sw-b': THEMES[theme].accent }}
      >
        <span className="theme-nameplate-dot" />
        <span>{t.names[theme]}</span>
      </span>
    </div>
  );
}
