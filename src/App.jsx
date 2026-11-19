import { useCallback, useRef } from 'react';
import Book from './Book.jsx';
import { ensureRecipeLang, hasRecipeLang } from './content.js';
import { useLang } from './i18n.js';
import { useUnits } from './units.js';
import { ScaleProvider } from './useScale.js';
import './scale.css';

export default function App() {
  const [lang, setLangState] = useLang();
  const [units, setUnits] = useUnits();
  const requestedLang = useRef(lang);

  const setLang = useCallback((next) => {
    requestedLang.current = next;
    if (hasRecipeLang(next)) {
      setLangState(next);
      return;
    }
    ensureRecipeLang(next)
      .then(() => {
        if (requestedLang.current === next) setLangState(next);
      })
      .catch(() => {});
  }, [setLangState]);

  return (
    <main className="app">
      <ScaleProvider>
        <Book lang={lang} setLang={setLang} units={units} setUnits={setUnits} />
      </ScaleProvider>
    </main>
  );
}
