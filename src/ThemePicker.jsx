import { useRef } from 'react';
import { THEME_IDS, THEMES, useTheme } from './theme.js';
import { themeText } from './theme-i18n.js';
import './theme-picker.css';

// The cover's colourway picker: a row of round swatches, each split into its
// primary and accent. A radio group: arrows move and choose, Tab enters once.
export default function ThemePicker({ lang }) {
  const [theme, setTheme] = useTheme();
  const t = themeText[lang] || themeText.en;
  const buttons = useRef([]);

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
  );
}
