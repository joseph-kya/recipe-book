import Book from './Book.jsx';
import { useLang } from './i18n.js';
import { useUnits } from './units.js';
import { ScaleProvider } from './useScale.js';
import './scale.css';

export default function App() {
  const [lang, setLang] = useLang();
  const [units, setUnits] = useUnits();
  return (
    <main className="app">
      <ScaleProvider>
        <Book lang={lang} setLang={setLang} units={units} setUnits={setUnits} />
      </ScaleProvider>
    </main>
  );
}
