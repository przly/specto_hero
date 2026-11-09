import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from './Button/Button'
import logoWhite from '../assets/logo-white.svg'
// Button styles are Tailwind; injected only while the header is mounted (same
// as Clients) so Tailwind's base layer doesn't leak into other pages.
import buttonCss from './Button/Button.embed.css?inline'
import './SiteHeader.css'

/* 1:1 clone of specto-website `globals/SiteHeader` (develop @ 9756594),
   content and logo from its Storybook story. Tailwind classes from the
   website are noted next to each rule in SiteHeader.css.

   Desktop (lg+): floating pill with logo, menu links and the "Contact us"
   button. Below lg: logo, "Contact us" link and a Menu / Close toggle that
   opens a full-screen black menu (big links, socials, email). Clicking
   outside the pill or pressing Escape closes it.

   Changes from the website: the logo links to "/" through the router, and
   the toggle has aria-expanded / aria-controls. */

const LOGO = { src: logoWhite, alt: 'Specto' }
const OPEN_MENU_LABEL = 'Menu'
const CLOSE_MENU_LABEL = 'Close'
const CONTACT_BUTTON = { href: '#', title: 'Contact us' }

const MENU_ITEMS = [
  { href: '#', title: 'Our work' },
  { href: '#', title: 'Approach' },
  { href: '#', title: 'About us' },
  { href: '#', title: 'Blog' },
  { href: '#', title: 'Careers' },
]

const SOCIAL_MEDIA_TITLE = 'Socials'
const SOCIAL_MEDIA_ITEMS = [
  { href: '#instagram', title: 'Instagram' },
  { href: '#linkedin', title: 'LinkedIn' },
  { href: '#x', title: 'X' },
]

const CONTACT_TITLE = 'Get in touch'
const CONTACT_EMAIL = 'info@specto.si'

export default function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // useClickAway + useKeyPressEvent('Escape') from react-use on the website.
  useEffect(() => {
    if (!isMenuOpen) return

    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsMenuOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isMenuOpen])

  return (
    <header className="site-header">
      <style>{buttonCss}</style>

      <div className="site-header-pill" ref={menuRef}>
        <Link className="site-header-logo" to="/">
          <img src={LOGO.src} alt={LOGO.alt} width={90} height={20} />
        </Link>

        <div id="site-header-menu" className={isMenuOpen ? 'site-header-menu is-open' : 'site-header-menu'}>
          <nav>
            <ul className="site-header-links">
              {MENU_ITEMS.map((item, index) => (
                <li key={`${item.href}-${index}`}>
                  <a className="site-header-link" href={item.href}>
                    {item.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="site-header-contact-button">
            <Button asChild modifier="primary" rightIcon="ChevronRight">
              <a href={CONTACT_BUTTON.href}>{CONTACT_BUTTON.title}</a>
            </Button>
          </div>

          <div className="site-header-extra">
            <div className="site-header-extra-col site-header-extra-col--socials">
              <div className="site-header-extra-title">{SOCIAL_MEDIA_TITLE}</div>
              <ul className="site-header-extra-list">
                {SOCIAL_MEDIA_ITEMS.map((item, index) => (
                  <li key={index}>
                    <a className="site-header-extra-link" href={item.href}>
                      {item.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="site-header-extra-col site-header-extra-col--contact">
              <div className="site-header-extra-title">{CONTACT_TITLE}</div>
              <a className="site-header-extra-link" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>
        </div>

        <div className="site-header-mobile-controls">
          <div className="site-header-mobile-contact">
            <a href={CONTACT_BUTTON.href}>{CONTACT_BUTTON.title}</a>
            <div className="site-header-divider" />
          </div>

          <button
            type="button"
            className="site-header-toggle"
            aria-expanded={isMenuOpen}
            aria-controls="site-header-menu"
            onClick={() => setIsMenuOpen((prev) => !prev)}
          >
            <span>{isMenuOpen ? CLOSE_MENU_LABEL : OPEN_MENU_LABEL}</span>
          </button>
        </div>
      </div>
    </header>
  )
}
