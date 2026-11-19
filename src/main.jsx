import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './theme.css';
import './styles.css';
import './motion.css';

createRoot(document.getElementById('root')).render(<App />);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  // Refresh an already controlled page once the replacement worker takes over.
  let controlled = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (controlled && !reloading) {
      reloading = true;
      window.location.reload();
    }
    controlled = true;
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL, updateViaCache: 'none' })
      .then((registration) => registration.update())
      .catch(() => {});
  });
}
