import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ROUTER_MODE } from './lib/router.jsx'

const container = document.getElementById('root')
const app = (
  <StrictMode>
    <App />
  </StrictMode>
)

// Pre-rendered pages (npm run build) are hydrated; in development we render from scratch.
if (container.firstElementChild) hydrateRoot(container, app)
else createRoot(container).render(app)

// Installable app (PWA) + offline support. Only on the live https site, not in development or previews.
if (ROUTER_MODE === 'history' && 'serviceWorker' in navigator && window.location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
