import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

import { useProjectStore, DEMO_PROJECTS } from './stores/useProjectStore'
import { useAuthStore } from './stores/useAuthStore'

if (typeof window !== 'undefined') {
  (window as any).useProjectStore = useProjectStore;
  (window as any).useAuthStore = useAuthStore;
  (window as any).DEMO_PROJECTS = DEMO_PROJECTS;
}

// Register PWA Service Worker
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

