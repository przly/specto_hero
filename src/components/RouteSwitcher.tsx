import { useLocation, useNavigate } from 'react-router-dom'
import './RouteSwitcher.css'

export const ROUTES = [
  { path: '/', label: 'Home' },
  { path: '/links', label: 'Links' },
  { path: '/navbar', label: 'Navbar' },
  { path: '/numbers', label: 'Numbers' },
  { path: '/logo-shader', label: 'Logo shader' },
  { path: '/home-services', label: 'Home services' },
  { path: '/service-card', label: 'Service card' },
] as const

export default function RouteSwitcher() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const isKnown = ROUTES.some((route) => route.path === pathname)

  return (
    <div className="route-switcher">
      <label className="route-switcher-label" htmlFor="route-switcher-select">
        Page
      </label>
      <select
        id="route-switcher-select"
        className="route-switcher-select"
        value={isKnown ? pathname : ''}
        onChange={(event) => {
          navigate(event.target.value)
          window.scrollTo(0, 0)
        }}
      >
        {!isKnown && (
          <option value="" disabled>
            {pathname}
          </option>
        )}
        {ROUTES.map((route) => (
          <option key={route.path} value={route.path}>
            {route.label} — {route.path}
          </option>
        ))}
      </select>
      <svg className="route-switcher-chevron" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M3.5 5.25 7 8.75l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
