import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// Distinct tab title in local dev so a localhost tab is never mistaken for
// prod (the dev favicon is set in the HTML by vite.config.ts).
if (import.meta.env.DEV) {
  document.title = `${document.title} [Local]`
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
