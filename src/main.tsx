import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Distinct favicon + tab title in local dev so a localhost tab is never
// mistaken for prod.
if (import.meta.env.DEV) {
  const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (favicon) favicon.href = '/favicon-dev.png'
  document.title = `${document.title} [Local]`
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
