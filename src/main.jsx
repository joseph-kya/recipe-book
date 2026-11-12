import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import shrikhandURL from '../assets/fonts/Shrikhand-Regular.woff2?url';
import lilitaURL from '../assets/fonts/LilitaOne-Regular.woff2?url';
import './fonts-fallback.css';
import './styles.css';

for (const href of [shrikhandURL, lilitaURL]) {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'font';
  link.type = 'font/woff2';
  link.crossOrigin = 'anonymous';
  link.href = href;
  document.head.append(link);
}

createRoot(document.getElementById('root')).render(<App />);
