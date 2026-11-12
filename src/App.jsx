import Book from './Book.jsx';
import { useLang } from './i18n.js';
import { useDocumentTitle } from './useDocumentTitle.js';

export default function App() {
  const [lang, setLang] = useLang();
  useDocumentTitle(lang);
  return (
    <main className="app">
      <Book lang={lang} setLang={setLang} />
    </main>
  );
}
