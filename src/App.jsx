import Book from './Book.jsx';
import { useLang } from './i18n.js';
import { useUnits } from './units.js';

export default function App() {
  const [lang, setLang] = useLang();
  const [units, setUnits] = useUnits();
  return (
    <main className="app">
      <Book lang={lang} setLang={setLang} units={units} setUnits={setUnits} />
    </main>
  );
}
