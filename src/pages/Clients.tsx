import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type PointerEvent } from 'react'
import autoHeight from 'embla-carousel-auto-height'
import classNames from 'embla-carousel-class-names'
import fade from 'embla-carousel-fade'
import useEmblaCarousel from 'embla-carousel-react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'motion/react'
import Button from '../components/Button/Button'
import { RevealText, easeExpoOut } from '../RevealText'
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
   - a click / tap reveals faster than autoplay (user waiting vs. ambient);
   - on touch screens a tap anywhere on the testimonial advances it (the
     website's swipe is removed);
   - the first testimonial reveals with the title, autoplay waits until
     both have finished revealing, and it pauses
     while the tab is hidden (not on hover). The current progress bar's own animation is the autoplay timer,
     so bar and slide change can't drift;
   - bars animate scaleX (compositor) instead of width;
   - the Next button (our default-size Button) follows the cursor 1:1,
     scales up from 0.2 on hover in and back down on hover out (not from /
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
// Click / tap / keyboard (the user asked for it): settle sooner.
const REVEAL_USER: RevealTiming = { duration: 0.9 / REVEAL_SPEED, stagger: 0.04 / REVEAL_SPEED }
// Out: the old card's lines slide up and out of their masks, quicker than
// they came in (asymmetric close), on ease smooth-out.
const EXIT = { duration: 0.28, stagger: 0.015 }
// The exit's ease-out front-loads it: the old first line is ~90% out by
// ~0.12s, so the new card starts then without the two overlapping.
const ENTER_DELAY = 0.12

// Progress-bar lines: the whole row draws in as one line growing left to
// right (clip-path wipe, so it crosses the gaps), with the first
// testimonial, on its timing and ease.
const BARS_IN = { duration: REVEAL_AMBIENT.duration, delay: ENTER_DELAY }

// Next button: the cursor grows into it on hover in and shrinks back out on
// hover out (from / to 20%, never from 0), quicker out than in. Strong
// ease-out; the button is centred on the cursor, so it scales from there.
const EASE_OUT = [0.23, 1, 0.32, 1] as const
const CURSOR_HIDDEN_SCALE = 0.2
const CURSOR_PRESSED_SCALE = 0.95
// Per phase: scale and opacity timed separately. Opacity lands first, so the
// button reads as a solid object growing / shrinking rather than a ghost
// fading (the native cursor hides instantly, so a slow fade leaves a gap).
type CursorPhase = 'out' | 'in' | 'press' | 'release'
const CURSOR_TRANSITIONS: Record<CursorPhase, { transform: object; opacity: object }> = {
  in: { transform: { duration: 0.6, ease: EASE_OUT }, opacity: { duration: 0.29, ease: EASE_OUT } },
  out: { transform: { duration: 0.43, ease: EASE_OUT }, opacity: { duration: 0.36, ease: EASE_OUT } },
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
  onTextLinesChange,
}: ClientCardProps & { active: boolean; timing: RevealTiming; onTextLinesChange?: (count: number) => void }) {
  // Chain the stagger: name and role continue after the quote's last line.
  const [textLines, setTextLines] = useState(0)
  useEffect(() => {
    onTextLinesChange?.(textLines)
  }, [textLines, onTextLinesChange])
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
  // Set by click / tap / keyboard just before Embla selects, so that
  // selection reveals with the faster user timing.
  const userNavRef = useRef(false)
  // The title and the first testimonial reveal together when the title
  // crosses the trigger line (and replay on scroll up).
  const [titleRef, titleVisible] = useTestReveal<HTMLDivElement>()
  const [titleWords, setTitleWords] = useState(0)
  const [firstCardLines, setFirstCardLines] = useState(0)
  // True once every line of that first reveal has finished animating.
  const [introDone, setIntroDone] = useState(false)

  const isMobile = useMedia('(max-width: 1023px)', true)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isHovering, setIsHovering] = useState(false)
  const [cursorPhase, setCursorPhase] = useState<CursorPhase>('out')
  const reduceMotion = useReducedMotion()
  const [revealTiming, setRevealTiming] = useState(REVEAL_AMBIENT)
  const pageHidden = usePageHidden()
  // Autoplay (and the first progress bar) waits until the title and the
  // first testimonial have finished revealing.
  const paused = pageHidden || !introDone

  // The Next button, rendered fixed to the viewport (see the cursor effect).
  const cursorRef = useRef<HTMLDivElement>(null)

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
      // No swipe at any width: the only way to advance by hand is a press
      // (tap on touch, click with a mouse, Enter / Space on the keyboard).
      watchDrag: false,
    },
    plugins,
  )

  // Go to Next Slide (selecting restarts the autoplay timer below)
  const goNext = () => {
    if (!emblaApi) return

    userNavRef.current = true
    emblaApi.scrollNext()
  }

  // Cursor. One window-level listener decides both where the Next button is
  // and whether it shows, so the two can't disagree:
  // - the button is position: fixed and follows the pointer's client
  //   coordinates, written straight to its transform in the pointermove
  //   handler (no React render, no frame of lag). Scrolling doesn't move it;
  // - hover is "the element under the pointer is inside the cursor area",
  //   from the event target on move, and re-checked once per frame on
  //   scroll, since scrolling moves the module under a still pointer
  //   without firing any pointer events.
  const hoveringRef = useRef(false)
  useEffect(() => {
    let pointer: { x: number; y: number } | null = null
    let frame: number | null = null
    // Half the button's size, for centring it on the pointer in whole pixels.
    // translate(-50%, -50%) of the 43px-tall button lands on half pixels:
    // the pill's edges blur across two pixels while the label snaps to one,
    // so the text reads off-centre.
    let half = { x: 0, y: 0 }
    const cursorEl = cursorRef.current
    const sizeObserver = new ResizeObserver(([entry]) => {
      const box = entry.borderBoxSize[0]
      half = { x: (box?.inlineSize ?? entry.contentRect.width) / 2, y: (box?.blockSize ?? entry.contentRect.height) / 2 }
      if (pointer) place(pointer)
    })
    if (cursorEl) sizeObserver.observe(cursorEl)

    const place = ({ x, y }: { x: number; y: number }) => {
      if (cursorEl) cursorEl.style.transform = `translate3d(${Math.round(x - half.x)}px, ${Math.round(y - half.y)}px, 0)`
    }

    const setHover = (inside: boolean) => {
      if (inside === hoveringRef.current) return
      hoveringRef.current = inside
      // The native cursor hides only while hovering (CSS on [data-hover]),
      // toggled here, synchronously. Browsers re-pick the cursor on mouse
      // moves, not on scroll, but they also do when an element's `cursor`
      // value changes, so this flip swaps it under a still pointer too.
      const area = containerRef.current
      if (area) {
        if (inside) area.dataset.hover = ''
        else delete area.dataset.hover
      }
      setIsHovering(inside)
      setCursorPhase(inside ? 'in' : 'out')
    }
    const isInArea = (target: EventTarget | Element | null) =>
      !!target && !!containerRef.current?.contains(target as Node)

    const onPointerMove = (e: globalThis.PointerEvent) => {
      // Touch has no hover.
      if (e.pointerType === 'touch') return
      pointer = { x: e.clientX, y: e.clientY }
      place(pointer)
      setHover(isInArea(e.target))
    }
    const onLeaveWindow = () => {
      pointer = null
      setHover(false)
    }
    const sync = () => {
      frame = null
      if (pointer) setHover(isInArea(document.elementFromPoint(pointer.x, pointer.y)))
    }
    const onScroll = () => {
      if (frame === null) frame = requestAnimationFrame(sync)
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeaveWindow)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      document.documentElement.removeEventListener('pointerleave', onLeaveWindow)
      window.removeEventListener('scroll', onScroll)
      if (frame !== null) cancelAnimationFrame(frame)
      sizeObserver.disconnect()
    }
  }, [])

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
    emblaApi.on('select', onSelect)
    onSelect()

    return () => {
      emblaApi.off('select', onSelect)
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

  // Intro end: the later of the title's last word and the first card's last
  // line (its role, chained after the quote and name) finishing.
  useEffect(() => {
    if (!titleVisible) {
      setIntroDone(false)
      return
    }
    const titleEnd = (TITLE_DURATION + Math.max(titleWords - 1, 0) * TITLE_WORD_STAGGER) / REVEAL_SPEED
    const cardEnd = ENTER_DELAY + REVEAL_AMBIENT.duration + (firstCardLines + 1) * REVEAL_AMBIENT.stagger
    const barsEnd = BARS_IN.delay + BARS_IN.duration
    const id = window.setTimeout(() => setIntroDone(true), Math.max(titleEnd, cardEnd, barsEnd) * 1000)
    return () => window.clearTimeout(id)
  }, [titleVisible, titleWords, firstCardLines])

  // Pause while the tab is hidden or the slider hasn't been scrolled to yet.
  // Hovering the quote doesn't pause it.
  useEffect(() => {
    const timer = timerRef.current
    if (!timer) return
    if (paused) timer.pause()
    else timer.play()
  }, [paused, selectedIndex, emblaApi])

  // Replay: once scrolled back up past the slider, go
  // back to the first testimonial with a fresh timer, out of sight, so the
  // next scroll down reveals it again from the start.
  useEffect(() => {
    if (titleVisible || !emblaApi) return
    emblaApi.scrollTo(0, true)
    if (timerRef.current) timerRef.current.currentTime = 0
  }, [titleVisible, emblaApi])

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
                onCountChange={setTitleWords}
              />
            </div>
          </div>

          <div className="clients-slider-col">
            <motion.div
              className="clients-bars"
              initial={{ clipPath: 'inset(0 100% 0 0)' }}
              animate={{ clipPath: titleVisible ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)' }}
              // Hide instantly (out of sight, for the replay), like the title.
              transition={
                titleVisible && !reduceMotion
                  ? { duration: BARS_IN.duration, delay: BARS_IN.delay, ease: easeExpoOut }
                  : { duration: 0 }
              }
            >
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
            </motion.div>

            <div className="clients-slider">
              <div className="clients-viewport" ref={emblaRef}>
                <div className="clients-track">
                  {CARDS.map((card, index) => (
                    <div className="clients-slide" key={`client-card-${index}`}>
                      <ClientCard
                        {...card}
                        active={titleVisible && index === selectedIndex}
                        timing={revealTiming}
                        onTextLinesChange={index === 0 ? setFirstCardLines : undefined}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="clients-cursor-area"
                ref={containerRef}
                role="button"
                tabIndex={0}
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
                {/* Outer: fixed to the viewport, follows the pointer 1:1
                    (transform written by the cursor effect). Portalled to
                    <body> so no transformed ancestor can turn `fixed` into
                    `absolute`. Inner: appear / disappear / press as a full
                    transform string (compositor), centred on the pointer so
                    it grows from there. pointer-events: none, so the area
                    gets the click and drives the press. */}
                {createPortal(
                  <div ref={cursorRef} className="clients-cursor" aria-hidden="true">
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
                  </div>,
                  document.body,
                )}
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
