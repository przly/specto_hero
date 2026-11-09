import { useRef, useSyncExternalStore } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import footerLogo from '../assets/footer-logo.svg?raw'
import './SiteFooter.css'

/* Port of specto-website `globals/SiteFooter` (develop @ 9756594), content
   from its Storybook story. Tailwind classes are translated to
   SiteFooter.css. On desktop the contents slide down from -75% to 0 while the
   footer scrolls into view (parallax reveal, clipped by the footer). */

type FooterItem =
  | { type: 'link'; title: string; href: string }
  | { type: 'location'; title: string; lines: string[] }

type FooterCol = { title?: string; items: FooterItem[] }

const COLS: FooterCol[] = [
  { title: 'Contact us', items: [{ type: 'link', title: 'info@specto.si', href: 'mailto:info@specto.si' }] },
  {
    items: [
      { type: 'location', title: 'Ljubljana', lines: ['Dunajska cesta 49', '1000 Ljubljana', 'Slovenia'] },
      { type: 'location', title: 'Stockholm', lines: ['Sweden'] },
    ],
  },
  {
    title: 'Get to know us',
    items: [
      { type: 'link', title: 'Let’s get in touch', href: '#' },
      { type: 'link', title: 'About us', href: '#' },
      { type: 'link', title: 'Work', href: '#' },
    ],
  },
  {
    title: 'Work with us',
    items: [
      { type: 'link', title: 'Services', href: '#' },
      { type: 'link', title: 'Careers', href: '#' },
    ],
  },
  {
    title: 'Socials',
    items: [
      { type: 'link', title: 'Instagram', href: '#' },
      { type: 'link', title: 'LinkedIn', href: '#' },
      { type: 'link', title: 'X', href: '#' },
    ],
  },
  {
    title: 'Legal',
    items: [
      { type: 'link', title: 'Privacy policy', href: '#' },
      { type: 'link', title: 'Cookie policy', href: '#' },
    ],
  },
]

const COPYRIGHT = 'Designed & developed by m****f****** Specto®'

// react-use `useMedia(query, defaultState)`, without the dependency.
function useMedia(query: string, defaultState: boolean) {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => defaultState,
  )
}

export default function SiteFooter() {
  const footerRef = useRef<HTMLElement>(null)
  const isDesktop = useMedia('(min-width: 1024px)', true)

  const { scrollYProgress } = useScroll({
    target: footerRef,
    offset: ['start end', 'end end'],
  })

  // A full transform string mapped straight from the progress: with this
  // offset (the "entry" range), Motion runs it as a native scroll-driven
  // animation on the compositor where supported, in step with the scroll.
  // (`y` would update from scroll events on the main thread, a frame behind.)
  const transform = useTransform(
    scrollYProgress,
    [0, 1],
    isDesktop ? ['translateY(-75%)', 'translateY(0%)'] : ['translateY(0%)', 'translateY(0%)'],
  )

  return (
    <footer className="site-footer" ref={footerRef}>
      <motion.div style={{ transform }} className="site-footer-container">
        <div className="site-footer-grid">
          {COLS.map((col, index) => (
            <div className="site-footer-col" key={`footer-col-${index}`}>
              {col.title && <div className="site-footer-col-title">{col.title}</div>}

              <ul className={`site-footer-list${col.items[0]?.type === 'location' ? ' is-locations' : ''}`}>
                {col.items.map((item, i) => (
                  <li className="site-footer-item" key={`footer-col-item-${i}`}>
                    {item.type === 'location' ? (
                      <>
                        <div className="site-footer-location-title">{item.title}</div>
                        <div className="site-footer-location">
                          {item.lines.map((line, l) => (
                            <span key={l}>
                              {line}
                              {l < item.lines.length - 1 && <br />}
                            </span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <a className="site-footer-link" href={item.href}>
                        {item.title}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="site-footer-copyright">
          <p>{COPYRIGHT}</p>
        </div>

        <div
          className="site-footer-logo"
          role="img"
          aria-label="Specto"
          // Website: <Icon icon="LargeBottomLogo" />, filled with currentColor.
          dangerouslySetInnerHTML={{ __html: footerLogo }}
        />
      </motion.div>
    </footer>
  )
}
