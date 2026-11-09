import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type MouseEvent, type PointerEvent } from 'react'
import autoHeight from 'embla-carousel-auto-height'
import classNames from 'embla-carousel-class-names'
import fade from 'embla-carousel-fade'
import useEmblaCarousel from 'embla-carousel-react'
import { motion, useMotionValue, useReducedMotion } from 'motion/react'
import Button from '../components/Button/Button'
import { RevealText } from '../RevealText'
import { REVEAL_SPEED, useTestReveal } from '../components/revealTrigger'
// Button styles are Tailwind; injected only while this page is mounted (same
// as ButtonsPage) so Tailwind's base layer doesn't leak into other pages.
import buttonCss from '../components/Button/Button.embed.css?inline'
import './Clients.css'

/* 1:1 clone of specto-website `modules/ClientSliders` + `molecules/ClientCard`
   (develop @ 9756594), content from its Storybook story. Embla setup, autoplay
   progress bars and the cursor-following "Next" button are the website's.
   Tailwind classes from the website are noted next to each rule in
   Clients.css.

   One change from the website: testimonials swap in place instead of
   sliding ~685px sideways. Embla's fade plugin stacks the slides; the new
   quote, name and role reveal line by line with the Specto text-reveal
   engine (RevealText, github.com/przly/Specto_TextReveal), and the old
   card's lines slide up and out of their masks first (RevealText `exit`).

   Motion polish (emil-design-eng review), also changes from the website:
   - a click / swipe reveals faster than autoplay (user waiting vs. ambient);
   - autoplay waits until the slider is first scrolled into view and pauses
     while the tab is hidden (not on hover). The current progress bar's own animation is the autoplay timer,
     so bar and slide change can't drift;
   - bars animate scaleX (compositor) instead of width;
   - the Next button (our default-size Button) follows the cursor 1:1,
     scales up from 0.4 on hover in and back down on hover out (not from /
     to 0), and presses to 0.95. */

type ClientCardProps = {
  person_name: string
  position: string
  text: string
}

const TITLE = '... but we prefer listening to the people.'
const NEXT_BUTTON = 'Next'

const PETER: ClientCardProps = {
  person_name: 'Peter Horvat',
  position: 'Strategy, Merkur',
  text: '“We collaborate with founders and teams to shape ideas, test prototypes, and build product strategies that unlock growth.”',
}
const ROMAN_LONG: ClientCardProps = {
  person_name: 'Roman Valjavec',
  position: 'Head of digital, Styria ltd.',
  text: '“Vivamus venenatis fermentum neque a posuere. Fusce feugiat velit enim, sed lacinia metus maximus vitae “Maecenas id libero sit amet nisl tristique sollicitudin. Vivamus venenatis fermentum neque a posuere. Fusce feugiat velit enim, sed lacinia metus maximus vitae “Maecenas id libero sit amet nisl tristique sollicitudin.”',
}
const ROMAN_SHORT: ClientCardProps = {
  person_name: 'Roman Valjavec',
  position: 'Head of digital, Styria ltd.',
  text: '“Maecenas id libero sit amet nisl tristique sollicitudin. Vivamus venenatis fermentum neque a posuere. Fusce feugiat velit enim, sed lacinia metus maximus vitae”',
}

const CARDS: ClientCardProps[] = [PETER, ROMAN_LONG, PETER, ROMAN_SHORT, PETER, PETER, ROMAN_LONG, PETER, ROMAN_SHORT]

const AUTOPLAY_DELAY = 5000 // ms, also the progress bar's duration

// Title: per-word reveal, same as the Numbers title (Specto_TextReveal
// SPECTO_TITLE_DURATION / HERO_DUPLICATE_WORD_STAGGER), at the site-wide
// REVEAL_SPEED.
const TITLE_DURATION = 1.6
const TITLE_WORD_STAGGER = 0.02

type RevealTiming = { duration: number; stagger: number }
// Autoplay (nobody waiting): Specto_TextReveal body-copy engine, 1.3s per
// line, 60ms between lines — at the site-wide REVEAL_SPEED.
const REVEAL_AMBIENT: RevealTiming = { duration: 1.3 / REVEAL_SPEED, stagger: 0.06 / REVEAL_SPEED }
// Click / swipe / keyboard (the user asked for it): settle sooner.
const REVEAL_USER: RevealTiming = { duration: 0.9 / REVEAL_SPEED, stagger: 0.04 / REVEAL_SPEED }
// Out: the old card's lines slide up and out of their masks, quicker than
// they came in (asymmetric close), on ease smooth-out.
const EXIT = { duration: 0.28, stagger: 0.015 }
// The exit's ease-out front-loads it: the old first line is ~90% out by
// ~0.12s, so the new card starts then without the two overlapping.
const ENTER_DELAY = 0.12

// Next button: the cursor grows into it on hover in and shrinks back out on
// hover out (from / to 40%, never from 0), quicker out than in. Strong
// ease-out; the button is centred on the cursor, so it scales from there.
const EASE_OUT = [0.23, 1, 0.32, 1] as const
const CURSOR_HIDDEN_SCALE = 0.4
const CURSOR_PRESSED_SCALE = 0.95
// Per phase: scale and opacity timed separately. Opacity lands first, so the
// button reads as a solid object growing / shrinking rather than a ghost
// fading (the native cursor hides instantly, so a slow fade leaves a gap).
type CursorPhase = 'out' | 'in' | 'press' | 'release'
const CURSOR_TRANSITIONS: Record<CursorPhase, { transform: object; opacity: object }> = {
  in: { transform: { duration: 0.25, ease: EASE_OUT }, opacity: { duration: 0.12, ease: EASE_OUT } },
  out: { transform: { duration: 0.18, ease: EASE_OUT }, opacity: { duration: 0.15, ease: EASE_OUT } },
  // Press and release are both quick: letting go should feel as snappy as pressing.
  press: { transform: { duration: 0.15, ease: EASE_OUT }, opacity: { duration: 0.15, ease: EASE_OUT } },
  release: { transform: { duration: 0.15, ease: EASE_OUT }, opacity: { duration: 0.15, ease: EASE_OUT } },
}

// Touch has no hover: a tap would fire enter + leave back to back.
const isHoverPointer = (e: PointerEvent) => e.pointerType !== 'touch'

// True while the tab is in the background (autoplay pauses).
function usePageHidden() {
  return useSyncExternalStore(
    (onChange) => {
      document.addEventListener('visibilitychange', onChange)
      return () => document.removeEventListener('visibilitychange', onChange)
    },
    () => document.hidden,
    () => false,
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

function ClientCard({
  person_name,
  position,
  text,
  active,
  timing,
}: ClientCardProps & { active: boolean; timing: RevealTiming }) {
  // Chain the stagger: name and role continue after the quote's last line.
  const [textLines, setTextLines] = useState(0)
  const reveal = { ...timing, delay: ENTER_DELAY, exit: EXIT, isTriggered: active }

  return (
    <div className="client-card">
      <RevealText as="div" text={text} className="client-card-text" onCountChange={setTextLines} {...reveal} />

      <div className="client-card-person">
        <RevealText as="div" text={person_name} className="client-card-name" startIndex={textLines} {...reveal} />
        <RevealText as="div" text={position} className="client-card-position" startIndex={textLines + 1} {...reveal} />
      </div>
    </div>
  )
}

/** The module itself, as on the website: used by the homepage and /clients. */
export function ClientsModule() {
  const containerRef = useRef<HTMLDivElement>(null)
  const barRefs = useRef<(HTMLSpanElement | null)[]>([])
  const timerRef = useRef<Animation | null>(null)
  // Set by click / swipe / keyboard just before Embla selects, so that
  // selection reveals with the faster user timing.
  const userNavRef = useRef(false)
  // Title and first testimonial reveal at the trigger line (and replay on
  // scroll up when that's on in the dev trigger panel).
  const [titleRef, titleVisible] = useTestReveal<HTMLDivElement>()
  const [sliderRef, sliderInView] = useTestReveal<HTMLDivElement>()

  const isMobile = useMedia('(max-width: 1023px)', true)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isHovering, setIsHovering] = useState(false)
  const [cursorPhase, setCursorPhase] = useState<CursorPhase>('out')
  const reduceMotion = useReducedMotion()
  const [revealTiming, setRevealTiming] = useState(REVEAL_AMBIENT)
  const pageHidden = usePageHidden()
  // Autoplay waits until the slider has scrolled into view, so the first
  // testimonial is the one that reveals when you first reach it.
  const paused = pageHidden || !sliderInView

  const x = useMotionValue(0)
  const y = useMotionValue(0)

  // Embla Carousel Setup
  const plugins = useMemo(() => {
    const base = [
      fade(),
      classNames({ snapped: 'is-snapped' }),
    ]

    if (isMobile) {
      base.push(autoHeight())
    }

    return base
  }, [isMobile])

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      duration: 33,
      loop: true,
      watchDrag: isMobile,
    },
    plugins,
  )

  // Go to Next Slide (selecting restarts the autoplay timer below)
  const goNext = () => {
    if (!emblaApi) return

    userNavRef.current = true
    emblaApi.scrollNext()
  }

  // Cursor
  const handleMove = (e: MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    x.set(e.clientX - rect.left)
    y.set(e.clientY - rect.top)
  }

  const handleEnter = (e: PointerEvent) => {
    if (!isHoverPointer(e)) return
    handleMove(e)
    setIsHovering(true)
    setCursorPhase('in')
  }

  const handleLeave = (e: PointerEvent) => {
    if (!isHoverPointer(e)) return
    setIsHovering(false)
    setCursorPhase('out')
  }

  const cursorScale =
    reduceMotion || cursorPhase === 'in' || cursorPhase === 'release'
      ? 1
      : cursorPhase === 'press'
        ? CURSOR_PRESSED_SCALE
        : CURSOR_HIDDEN_SCALE

  // Selected Index Sync
  useEffect(() => {
    if (!emblaApi) return

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap())
      setRevealTiming(userNavRef.current ? REVEAL_USER : REVEAL_AMBIENT)
      userNavRef.current = false
    }
    // A swipe is the user asking too.
    const onPointerDown = () => {
      userNavRef.current = true
    }
    emblaApi.on('select', onSelect)
    emblaApi.on('pointerDown', onPointerDown)
    onSelect()

    return () => {
      emblaApi.off('select', onSelect)
      emblaApi.off('pointerDown', onPointerDown)
    }
  }, [emblaApi])

  // Autoplay: the current progress bar's own animation is the timer. When it
  // finishes, go to the next slide; pausing it pauses autoplay, so the bar
  // always tells the truth. Restarts on every selection.
  useEffect(() => {
    const bar = barRefs.current[selectedIndex]
    if (!emblaApi || !bar) return

    const timer = bar.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
      duration: AUTOPLAY_DELAY,
      easing: 'linear',
      fill: 'forwards',
    })
    timer.onfinish = () => emblaApi.scrollNext()
    timerRef.current = timer

    return () => {
      timer.onfinish = null
      timer.cancel()
      timerRef.current = null
    }
  }, [emblaApi, selectedIndex])

  // Pause while the tab is hidden or the slider hasn't been scrolled to yet.
  // Hovering the quote doesn't pause it.
  useEffect(() => {
    const timer = timerRef.current
    if (!timer) return
    if (paused) timer.pause()
    else timer.play()
  }, [paused, selectedIndex, emblaApi])

  // Replay (dev trigger panel): once scrolled back up past the slider, go
  // back to the first testimonial with a fresh timer, out of sight, so the
  // next scroll down reveals it again from the start.
  useEffect(() => {
    if (sliderInView || !emblaApi) return
    emblaApi.scrollTo(0, true)
    if (timerRef.current) timerRef.current.currentTime = 0
  }, [sliderInView, emblaApi])

  // RevealText fills each card after measuring its lines, and re-splits on
  // resize, so card heights change after Embla has measured them. Embla only
  // re-measures when a slide's width changes, so auto-height (mobile) would
  // keep the empty-card height: re-init when a card's height changes.
  useEffect(() => {
    if (!emblaApi) return

    const heights = new Map<Element, number>()
    let frame: number | null = null
    const observer = new ResizeObserver((entries) => {
      let changed = false
      for (const entry of entries) {
        const height = entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height
        // Includes the first report: the lines may have filled in between
        // Embla's own measurement and this observer starting.
        if (heights.get(entry.target) !== height) changed = true
        heights.set(entry.target, height)
      }
      if (changed && frame === null) {
        frame = requestAnimationFrame(() => {
          frame = null
          emblaApi.reInit()
        })
      }
    })
    emblaApi.slideNodes().forEach((slide) => observer.observe(slide))

    return () => {
      observer.disconnect()
      if (frame !== null) cancelAnimationFrame(frame)
    }
  }, [emblaApi])

  return (
    <div className="clients-module">
      {/* Button styles are Tailwind: injected only while this module is
          mounted, so its base layer doesn't leak into pages without it. */}
      <style>{buttonCss}</style>
      {/* SectionMargin size="none" */}

      <div className="clients-container">
        <div className="clients-grid">
          <div className="clients-title-col">
            <div ref={titleRef}>
              <RevealText
                as="h2"
                text={TITLE}
                by="word"
                className="heading heading-2 font-zero clients-title"
                duration={TITLE_DURATION / REVEAL_SPEED}
                stagger={TITLE_WORD_STAGGER / REVEAL_SPEED}
                isTriggered={titleVisible}
                hideDelay={0}
              />
            </div>
          </div>

          <div className="clients-slider-col" ref={sliderRef}>
            <div className="clients-bars">
              {CARDS.map((_, index) => (
                <div key={index} className="clients-bar">
                  {/* Past bars full, future empty; the current one is
                      animated by the autoplay timer above. */}
                  <span
                    ref={(el) => {
                      barRefs.current[index] = el
                    }}
                    className="clients-bar-fill"
                    style={{ transform: index < selectedIndex ? 'scaleX(1)' : 'scaleX(0)' }}
                  />
                </div>
              ))}
            </div>

            <div className="clients-slider">
              <div className="clients-viewport" ref={emblaRef}>
                <div className="clients-track">
                  {CARDS.map((card, index) => (
                    <div className="clients-slide" key={`client-card-${index}`}>
                      <ClientCard
                        {...card}
                        active={sliderInView && index === selectedIndex}
                        timing={revealTiming}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="clients-cursor-area"
                onPointerMove={(e) => isHoverPointer(e) && handleMove(e)}
                ref={containerRef}
                role="button"
                tabIndex={0}
                onPointerEnter={handleEnter}
                onPointerLeave={handleLeave}
                onPointerDown={(e) => isHoverPointer(e) && setCursorPhase('press')}
                onPointerUp={(e) => isHoverPointer(e) && setCursorPhase('release')}
                onClick={goNext}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    goNext()
                  }
                }}
              >
                {/* Outer: follows the cursor 1:1. Inner: appear / disappear /
                    press as a full transform string (compositor), centred
                    on the cursor so it grows from the pointer. Both have
                    pointer-events: none, so the area gets the click and
                    drives the press. */}
                <motion.div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    x,
                    y,
                    translateX: '-50%',
                    translateY: '-50%',
                  }}
                  className="clients-cursor"
                >
                  <motion.div
                    initial={{ transform: `scale(${reduceMotion ? 1 : CURSOR_HIDDEN_SCALE})`, opacity: 0 }}
                    animate={{
                      transform: `scale(${cursorScale})`,
                      opacity: isHovering ? 1 : 0,
                    }}
                    transition={CURSOR_TRANSITIONS[cursorPhase]}
                  >
                    <Button rightIcon="ChevronRight" isParentHover={isHovering} title={NEXT_BUTTON} />
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SectionMargin size="default" */}
      <div className="clients-section-margin" />
    </div>
  )
}

export default function Clients() {
  return (
    <main className="clients-page">
      <ClientsModule />
    </main>
  )
}
