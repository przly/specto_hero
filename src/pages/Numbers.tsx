import { useEffect, useRef, type CSSProperties } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { RevealText, easeExpoOut } from '../RevealText'
import { useTestReveal } from '../components/revealTrigger'
import './Numbers.css'

/* 1:1 clone of specto-website `modules/NumbersModule` (develop @ 9756594),
   without the logos: sticky title on the left, cards that pin and stack on
   the right (lg+). Tailwind classes from the website are noted next to each
   rule in Numbers.css.

   Only addition: the title reveals per word with the Specto text-reveal
   engine (github.com/przly/Specto_TextReveal, src/RevealText.tsx), using
   its original title-scale word-mode timing. */

// Specto_TextReveal: SPECTO_TITLE_DURATION / HERO_DUPLICATE_WORD_STAGGER
const TITLE_DURATION = 1.6
const TITLE_WORD_STAGGER = 0.02

const SUBTITLE = 'Hush.'
// "Hush." reveals the same way as the title (per-word masked slide up).
const SUBTITLE_DURATION = TITLE_DURATION

// Sequence: "Hush." first, then the title TITLE_DELAY after "Hush." starts.
const TITLE_DELAY = 0.25

const TITLE = 'Sometimes we let the numbers speak ...'

const STATS = [
  { value: '€100M+', description: 'annual turnover powered by our solutions' },
  { value: '589', description: 'active projects under long-term client partnerships' },
  { value: '49 days', description: 'from a concept to a fully launched platform' },
  { value: '123 %', description: 'increase in client revenue after redesign' },
  { value: '250k', description: 'unique users served' },
]

// Count-up: each number rolls from 0 ("0" → "589") once its card
// crosses the trigger line. Prefix/suffix ("€", "M+", " days") stay put.
// The description under it reveals per word on the same trigger, with the
// Specto_TextReveal body duration (1.3s) and the word-mode stagger.
const COUNT_DURATION = 1400 // ms
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)

const DESCRIPTION_DURATION = 1.3
const DESCRIPTION_WORD_STAGGER = 0.02

// The card's top line draws in left to right (clip-path wipe) on the same
// trigger, on the description's duration and the reveal's expo-out ease, as
// the Clients progress lines do.
const LINE_DURATION = DESCRIPTION_DURATION

function StatContent({ value, description }: { value: string; description: string }) {
  const [ref, visible] = useTestReveal<HTMLDivElement>()
  const reduceMotion = useReducedMotion()

  return (
    <>
      <motion.div
        className="numbers-card-line"
        initial={{ clipPath: 'inset(0 100% 0 0)' }}
        animate={{ clipPath: visible ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)' }}
        // Hide instantly (out of sight, for the replay), like the text.
        transition={visible && !reduceMotion ? { duration: LINE_DURATION, ease: easeExpoOut } : { duration: 0 }}
      />
      <div className="numbers-card-content" ref={ref}>
        <CountUp value={value} visible={visible} />
        <RevealText
          as="div"
          text={description}
          by="word"
          className="numbers-description"
          duration={DESCRIPTION_DURATION}
          stagger={DESCRIPTION_WORD_STAGGER}
          isTriggered={visible}
          hideDelay={0}
        />
      </div>
    </>
  )
}

function CountUp({ value, visible }: { value: string; visible: boolean }) {
  const digitsRef = useRef<HTMLSpanElement>(null)
  const match = value.match(/^(\D*)(\d+)(.*)$/)
  const [, prefix = '', digits = '', suffix = ''] = match ?? []
  const target = Number(digits)

  useEffect(() => {
    const node = digitsRef.current
    if (!node || !digits) return
    if (!visible) {
      node.textContent = '0'
      return
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      node.textContent = digits
      return
    }
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_DURATION)
      node.textContent = String(Math.round(target * easeInOutCubic(t)))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [visible, target, digits])

  if (!match) return <div className="font-zero numbers-value">{value}</div>

  return (
    <div className="font-zero numbers-value" aria-label={value}>
      <span aria-hidden="true">
        {prefix}
        <span className="numbers-value-digits">
          {/* Invisible final value reserves the full width, so the prefix and
              suffix sit where they end up while the count is still short. */}
          <span className="numbers-value-sizer">{digits}</span>
          <span ref={digitsRef}>0</span>
        </span>
        {suffix}
      </span>
    </div>
  )
}

/** The module itself, as on the website: used by the homepage and /numbers. */
export function NumbersModule() {
  // Trigger line + replay-on-scroll-up. Observes
  // the subtitle + title block, so one crossing starts "Hush.", and the title
  // follows after TITLE_DELAY.
  const [titleRef, titleVisible] = useTestReveal<HTMLDivElement>()

  return (
    <div className="numbers-module">
      <div className="numbers-container">
        <div className="numbers-grid">
          <div className="numbers-heading-col">
            <div className="numbers-heading-sticky" ref={titleRef}>
              <RevealText
                as="div"
                text={SUBTITLE}
                by="word"
                className="numbers-subtitle"
                duration={SUBTITLE_DURATION}
                stagger={TITLE_WORD_STAGGER}
                isTriggered={titleVisible}
                hideDelay={0}
              />
              <div>
                <RevealText
                  as="h2"
                  text={TITLE}
                  by="word"
                  className="heading heading-2 font-zero numbers-title"
                  duration={TITLE_DURATION}
                  stagger={TITLE_WORD_STAGGER}
                  delay={TITLE_DELAY}
                  isTriggered={titleVisible}
                  hideDelay={0}
                />
              </div>
            </div>
          </div>

          <div className="numbers-cards-wrapper">
            <div className="numbers-cards" style={{ '--numcards': STATS.length } as CSSProperties}>
              {STATS.map((stat, index) => (
                <div
                  className="numbers-card"
                  key={stat.value}
                  style={{ '--index': index + 1, zIndex: index + 1 } as CSSProperties}
                >
                  <div className="numbers-card-inner">
                    <StatContent value={stat.value} description={stat.description} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SectionMargin size="large" */}
      <div className="numbers-section-margin" />
    </div>
  )
}

export default function Numbers() {
  return (
    <main className="numbers-page">
      {/* Scroll room so the module scrolls into view. */}
      <div className="numbers-intro" aria-hidden="true" />
      <NumbersModule />
    </main>
  )
}
