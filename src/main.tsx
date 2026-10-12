import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register Service Worker for PWA compliance and offline functionality
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('✅ PWA ServiceWorker active on scope:', registration.scope);
      })
      .catch((err) => {
        console.warn('ServiceWorker notice:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
