import spectoLogo from '../assets/specto-logo.svg'
import navArrow1 from '../assets/nav-arrow-1.svg'
import navArrow2 from '../assets/nav-arrow-2.svg'
import './Navbar.css'

const LINKS = ['Our work', 'Approach', 'About us', 'Blog', 'Careers']

export default function Navbar() {
  return (
    <nav className="navbar">
      <img className="navbar-logo" src={spectoLogo} alt="Specto" />

      <div className="navbar-links">
        {LINKS.map((label) => (
          <a key={label} className="navbar-link" href="#">
            {label}
            <span className="navbar-link-underline" />
          </a>
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
