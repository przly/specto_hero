import { useRef, type MouseEvent, type MutableRefObject } from 'react'
import { Link } from 'react-router-dom'
import spectoLogo from '../assets/specto-logo.svg'
import navArrow1 from '../assets/nav-arrow-1.svg'
import navArrow2 from '../assets/nav-arrow-2.svg'
import './Navbar.css'

const LINKS = [
  { label: 'Services', to: '/links' },
  { label: 'Our work', to: '#' },
  { label: 'Approach', to: '#' },
  { label: 'About us', to: '#' },
  { label: 'Blog', to: '#' },
  { label: 'Careers', to: '#' },
]

type Origin = 'left' | 'right'

function NavLink({ label, to, originRef }: { label: string; to: string; originRef: MutableRefObject<Origin> }) {
  const underlineRef = useRef<HTMLSpanElement>(null)

  const applyLockedOrigin = () => {
    const underline = underlineRef.current
    if (!underline) return
    underline.style.transformOrigin = originRef.current
  }

  return (
    <Link
      className="navbar-link"
      to={to}
      onMouseEnter={applyLockedOrigin}
      onMouseLeave={applyLockedOrigin}
    >
      {label}
      <span ref={underlineRef} className="navbar-link-underline" />
    </Link>
  )
}

export default function Navbar() {
  const originRef = useRef<Origin>('left')

  const lockOriginFromEntry = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const enteringFromLeft = event.clientX - rect.left < rect.width / 2
    originRef.current = enteringFromLeft ? 'left' : 'right'
  }

  return (
    <nav className="navbar">
      <img className="navbar-logo" src={spectoLogo} alt="Specto" />

      <div className="navbar-links" onMouseEnter={lockOriginFromEntry}>
        {LINKS.map(({ label, to }) => (
          <NavLink key={label} label={label} to={to} originRef={originRef} />
        ))}
      </div>

      <a className="navbar-cta" href="#">
        Contact us
        <span className="navbar-cta-icon">
          <img className="navbar-cta-icon-bar navbar-cta-icon-bar-1" src={navArrow1} alt="" />
          <img className="navbar-cta-icon-bar navbar-cta-icon-bar-2" src={navArrow2} alt="" />
        </span>
      </a>
    </nav>
  )
}
