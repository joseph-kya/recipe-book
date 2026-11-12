import Book from './Book.jsx';
import { useLang } from './i18n.js';

export default function App() {
  const [lang, setLang] = useLang();
  return (
    <main className="app">
      <Book lang={lang} setLang={setLang} />
    </main>
  );
}
