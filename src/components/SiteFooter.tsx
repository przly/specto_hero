import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react'
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react'
import { easeExpoOut } from '../RevealText'
import { useTriggerOffset } from './revealTrigger'
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

const COPYRIGHT_BEFORE = 'Designed & developed by '
const COPYRIGHT_AFTER = ' Specto®'
// One star per hidden letter, so the word keeps the same width (the mono
// font gives every character the same advance) in both states.
const CENSORED = 'm*****f******'
const UNCENSORED = 'motherfucking'

// Behind the stars, single letters of the real word blink in and out: a few
// at a time at most, so the whole word never shows.
const PEEK_TICK = 50 // ms between updates
const PEEK_CHANCE = 0.5 // chance per tick that another letter shows
const PEEK_MAX = 3 // most letters showing at once (of the 11 hidden)
const PEEK_MIN_MS = 120 // how long a letter shows, min…
const PEEK_MAX_MS = 350 // …and max

// Hidden positions: every star in CENSORED.
const HIDDEN = Array.from(CENSORED).flatMap((char, i) => (char === '*' ? [i] : []))

// Runs only while on screen; reduced motion keeps the stars.
function CensoredWord() {
  const ref = useRef<HTMLSpanElement>(null)
  const [inView, setInView] = useState(false)
  const [text, setText] = useState(CENSORED)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting))
    io.observe(node)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!inView) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // Position → time its letter hides again.
    const showing = new Map<number, number>()

    const tick = () => {
      const now = performance.now()
      for (const [i, until] of showing) if (now >= until) showing.delete(i)

      if (showing.size < PEEK_MAX && Math.random() < PEEK_CHANCE) {
        const free = HIDDEN.filter((i) => !showing.has(i))
        const i = free[Math.floor(Math.random() * free.length)]
        showing.set(i, now + PEEK_MIN_MS + Math.random() * (PEEK_MAX_MS - PEEK_MIN_MS))
      }

      setText(Array.from(CENSORED, (char, i) => (showing.has(i) ? UNCENSORED[i] : char)).join(''))
    }

    const id = window.setInterval(tick, PEEK_TICK)
    return () => {
      window.clearInterval(id)
      setText(CENSORED)
    }
  }, [inView])

  return (
    <span ref={ref} className="site-footer-censored">
      {text}
    </span>
  )
}

// Titles, links and address lines reveal per line (each is one line): the text slides up
// into a mask, like RevealText's line mode, staggered as a diagonal wave
// (column + row). Faster than the engine's body timing (1.3s, 60ms).
const LINE_DURATION = 0.8
const LINE_STAGGER = 0.035

// Row of a location's title within its column, counting the title and
// address lines of the locations above it, so the wave runs straight down.
function locationRow(col: FooterCol, itemIndex: number) {
  return col.items
    .slice(0, itemIndex)
    .reduce((row, item) => row + 1 + (item.type === 'location' ? item.lines.length : 0), 0)
}

function FooterLine({ text, index, visible }: { text: string; index: number; visible: boolean }) {
  const reduceMotion = useReducedMotion()
  const hidden = reduceMotion ? { opacity: 0 } : { transform: 'translateY(120%)' }
  const shown = reduceMotion ? { opacity: 1 } : { transform: 'translateY(0%)' }
  return (
    <span className="site-footer-line">
      <motion.span
        className="site-footer-line-inner"
        initial={hidden}
        animate={visible ? shown : hidden}
        // Hide instantly (out of sight, for the replay), like the other reveals.
        transition={
          visible
            ? reduceMotion
              ? { duration: 0.24, delay: index * 0.03, ease: 'easeOut' }
              : { duration: LINE_DURATION, delay: index * LINE_STAGGER, ease: easeExpoOut }
            : { duration: 0 }
        }
      >
        {text}
      </motion.span>
    </span>
  )
}

// The lines reveal once they can actually be seen: the footer's top edge (where
// the dark page above ends) has scrolled up past the top of the grid, and the
// grid is above the site's trigger line (see useTriggerOffset). On
// desktop the contents slide down inside the clipped footer, so this is later
// than the grid merely entering the viewport. Resets once the footer is fully
// below the viewport again (out of sight), ready to replay.
function useFooterLinesVisible(
  footerRef: RefObject<HTMLElement | null>,
  gridRef: RefObject<HTMLElement | null>,
) {
  const [visible, setVisible] = useState(false)
  const triggerOffset = useTriggerOffset()

  useEffect(() => {
    let frame = 0
    const check = () => {
      frame = 0
      const footer = footerRef.current
      const grid = gridRef.current
      if (!footer || !grid) return
      const footerTop = footer.getBoundingClientRect().top
      const gridTop = grid.getBoundingClientRect().top
      const vh = window.innerHeight
      if (footerTop <= gridTop && gridTop <= vh - triggerOffset) setVisible(true)
      else if (footerTop >= vh) setVisible(false)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(check)
    }
    check()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [footerRef, gridRef, triggerOffset])

  return visible
}

// Wordmark letters: the S rides the footer's parallax as is; each next letter
// trails a little further behind, rising later and slower, and they all line
// up when the footer is fully in view. Lag is in the SVG's own units (the
// logo's viewBox is 304 tall); letter i sits i × LETTER_LAG lower at the start
// of the footer's entry, easing to 0 by its end.
const LETTER_LAG = 30
const LOGO_HEIGHT = 304

// The wordmark split into one full-size SVG per letter, stacked in one grid
// cell. Each letter is its own element with a plain CSS transform, so the
// browser just moves a composited layer; transforming the <path>s inside a
// single SVG made Safari repaint the whole wordmark on every scroll frame.
const LOGO_LETTERS = (() => {
  const open = footerLogo.match(/<svg[^>]*>/)?.[0] ?? '<svg>'
  const paths = footerLogo.match(/<path[\s\S]*?\/>/g) ?? []
  return paths.map((path) => `${open}${path}</svg>`)
})()

// Lag as a percentage of the letter layer's own height (= the logo's), so
// nothing needs measuring: i × LETTER_LAG of the 304-unit viewBox.
function FooterLetter({
  svg,
  index,
  progress,
  stagger,
}: {
  svg: string
  index: number
  progress: MotionValue<number>
  stagger: boolean
}) {
  const lag = (index * LETTER_LAG * 100) / LOGO_HEIGHT
  // A transform string straight from the progress, like the container's, so
  // Motion can run it on a native scroll timeline where supported.
  const transform = useTransform(
    progress,
    [0, 1],
    stagger ? [`translateY(${lag}%)`, 'translateY(0%)'] : ['translateY(0%)', 'translateY(0%)'],
  )
  return (
    <motion.div
      className="site-footer-letter"
      style={{ transform }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

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
  const gridRef = useRef<HTMLDivElement>(null)
  const linesVisible = useFooterLinesVisible(footerRef, gridRef)

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

  const reduceMotion = useReducedMotion()
  const staggerLetters = isDesktop && !reduceMotion

  return (
    <footer className="site-footer" ref={footerRef}>
      <motion.div style={{ transform }} className="site-footer-container">
        <div className="site-footer-grid" ref={gridRef}>
          {COLS.map((col, index) => (
            <div className="site-footer-col" key={`footer-col-${index}`}>
              {col.title && (
                <div className="site-footer-col-title">
                  <FooterLine text={col.title} index={index} visible={linesVisible} />
                </div>
              )}

              <ul className={`site-footer-list${col.items[0]?.type === 'location' ? ' is-locations' : ''}`}>
                {col.items.map((item, i) => (
                  <li className="site-footer-item" key={`footer-col-item-${i}`}>
                    {item.type === 'location' ? (
                      <>
                        <div className="site-footer-location-title">
                          <FooterLine text={item.title} index={index + locationRow(col, i)} visible={linesVisible} />
                        </div>
                        <div className="site-footer-location">
                          {item.lines.map((line, l) => (
                            <span key={l}>
                              <FooterLine
                                text={line}
                                index={index + locationRow(col, i) + 1 + l}
                                visible={linesVisible}
                              />
                              {l < item.lines.length - 1 && <br />}
                            </span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <a className="site-footer-link" href={item.href}>
                        <FooterLine
                          text={item.title}
                          index={index + i + (col.title ? 1 : 0)}
                          visible={linesVisible}
                        />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="site-footer-copyright">
          <p>
            {COPYRIGHT_BEFORE}
            <CensoredWord />
            {COPYRIGHT_AFTER}
          </p>
        </div>

        {/* Website: <Icon icon="LargeBottomLogo" />, filled with currentColor. */}
        <div className="site-footer-logo" role="img" aria-label="Specto">
          {LOGO_LETTERS.map((svg, i) => (
            <FooterLetter key={i} svg={svg} index={i} progress={scrollYProgress} stagger={staggerLetters} />
          ))}
        </div>
      </motion.div>
    </footer>
  )
}
