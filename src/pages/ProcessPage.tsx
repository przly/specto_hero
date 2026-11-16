import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type Ref } from 'react'
import { useReducedMotion } from 'motion/react'
import { RevealText } from '../RevealText'
import { REVEAL_SPEED } from '../components/revealTrigger'
import { TICKET_SWAP_MS } from '../components/jiraTicketTiming'
import JiraTicket, { type AvatarTone, type TeamAvatar, type TicketState } from '../components/JiraTicket'
import sectionExploreVideo from '../assets/process/section-explore.mp4'
import sectionBuild from '../assets/process/section-build.png'
import sectionEvolve from '../assets/process/section-evolve.png'
import usersThree from '../assets/process/users-three.svg'
import binoculars from '../assets/process/binoculars.svg'
import brain from '../assets/process/brain.svg'
import sealCheck from '../assets/process/seal-check.svg'
import flowArrow from '../assets/process/flow-arrow.svg'
import bookOpenText from '../assets/process/book-open-text.svg'
import terminalWindow from '../assets/process/terminal-window.svg'
import shieldCheck from '../assets/process/shield-check.svg'
import rocketLaunch from '../assets/process/rocket-launch.svg'
import sketchLogo from '../assets/process/sketch-logo.svg'
import trendUp from '../assets/process/trend-up.svg'
import shieldChevron from '../assets/process/shield-chevron.svg'
import handshake from '../assets/process/handshake.svg'
import infinity from '../assets/process/infinity.svg'
import './ProcessPage.css'

/* Figma: Specto Website › "Process" (6614:24377).
   Left: sticky header + Jira ticket. Right: Explore / Build / Evolve, each a
   header and a dashed timeline of steps ending in a milestone.
   The ticket changes state as each section's image lines up with the card
   (Figma annotation on the Build and Evolve icons). */

/** `count` avatars of one colour, ids `${prefix}1…`. */
function teamAvatars(prefix: string, tone: AvatarTone, count: number): TeamAvatar[] {
  return Array.from({ length: count }, (_, i) => ({ id: `${prefix}${i + 1}`, tone }))
}

type Step = { label: string; icon: string; body: string }

type Section = {
  number: string
  title: string
  intro: string
  /** Section icon art and how Figma crops it inside the 107px frame. */
  art: { src: string; crop?: CSSProperties; video?: boolean }
  steps: Step[]
  milestone: { icon: string; title?: string; body?: string; bright?: boolean }
  /** Fade the timeline out at the bottom too (last section). */
  lineFadesOut?: boolean
  ticket: TicketState
}

// Figma crops the Explore/Build art to the middle of a wider image.
const ART_CROP: CSSProperties = { width: '206.25%', height: '116.02%', left: '-53.12%', top: '-8.01%' }

const SECTIONS: Section[] = [
  {
    number: '01',
    title: 'Explore',
    intro:
      'Every great product starts with clarity. This phase uncovers business goals, challenges, and opportunities - turning insights into a clear strategic and creative foundation. Workshops, research, and a clickable prototype ensure everyone moves forward with confidence and alignment.',
    art: { src: sectionExploreVideo, video: true },
    steps: [
      {
        label: 'Discovery Workshops',
        icon: usersThree,
        body: 'Structured sessions reveal key opportunities, user needs, and business challenges worth solving.',
      },
      {
        label: 'Research & Product Strategy',
        icon: binoculars,
        body: 'Data, insights, and brand positioning merge into a roadmap that connects business intent with customer value.',
      },
      {
        label: 'Creative Direction & Prototyping',
        icon: brain,
        body: 'Ideas take shape through a clickable prototype that defines user flows and visual direction early on.',
      },
    ],
    milestone: {
      icon: sealCheck,
      title: 'Validation',
      body: 'Concepts are tested and refined with your team and stakeholders to ensure strategic, technical, and brand alignment.',
    },
    ticket: {
      status: 'todo',
      tags: ['product', 'brand-comms'],
      avatars: teamAvatars('design', 'yellow', 2),
      team: 'Design Team',
    },
  },
  {
    number: '02',
    title: 'Build',
    intro:
      'Once the vision is validated, strategy meets design and technology. This is where ideas grow into tangible experiences - crafted to perform beautifully and express your brand with purpose.',
    art: { src: sectionBuild, crop: ART_CROP },
    steps: [
      {
        label: 'UI & Visual Design',
        icon: flowArrow,
        body: 'A distinct visual language and interface bring the brand’s character to life while ensuring intuitive usability.',
      },
      {
        label: 'Content & Communication',
        icon: bookOpenText,
        body: 'Stories, tone, and messaging align product purpose with human connection.',
      },
      {
        label: 'Development',
        icon: terminalWindow,
        body: 'Design evolves into a robust, scalable product — built with precision and a focus on long-term maintainability. We rely on modern tech and frameworks to ensure performance, security, and future flexibility.',
      },
      {
        label: 'Quality Assurance',
        icon: shieldCheck,
        body: 'Every detail is tested, refined, and released with confidence for a smooth transition into the real world.',
      },
    ],
    milestone: {
      icon: rocketLaunch,
      title: 'Launch',
      bright: true,
      body: 'We deliver. You go live. Your product or brand system is delivered, tested, and deployed. We support your internal team during the launch and provide all documentation and final assets needed to hit the ground running.',
    },
    ticket: {
      status: 'in-progress',
      tags: ['development'],
      avatars: teamAvatars('dev', 'green', 3),
      team: 'Development Team',
    },
  },
  {
    number: '03',
    title: 'Evolve',
    intro:
      'We believe in lasting partnerships - we don’t do one-night stands! Long-term collaboration allows continuous improvement, scaling, and brand growth as your business evolves.',
    art: { src: sectionEvolve },
    steps: [
      {
        label: 'Performance, Optimization, Scaling',
        icon: sketchLogo,
        body: 'Regular analysis and refinement keep your product fast, accessible, and delightful to use.',
      },
      {
        label: 'Brand & Experience Growth',
        icon: trendUp,
        body: 'Design and storytelling evolve alongside your company to reflect new goals and audiences.',
      },
      {
        label: 'Cybersecurity & Reliability',
        icon: shieldChevron,
        body: 'Continuous updates, audits, and infrastructure management protect your product at every layer.',
      },
      {
        label: 'SLA & Continuous Support',
        icon: handshake,
        body: 'Dedicated support and improvement cycles ensure your product stays relevant and ready for what’s next.',
      },
    ],
    milestone: { icon: infinity },
    lineFadesOut: true,
    ticket: {
      status: 'done',
      tags: ['strategy', 'product'],
      avatars: teamAvatars('pm', 'blue', 1),
      team: 'Project Management',
    },
  },
]

/* Each section's timeline plays as one timed sequence: once the section's
   image lines up with the Jira ticket, the ticket swaps state, and when that
   swap is done (TICKET_SWAP_MS) the line draws down over LINE_DRAW_MS. Each
   step reveals as the line reaches its dot, the milestone when it arrives
   at its button. Scrolling back above the section retracts the line
   (LINE_RETRACT_MS) and the steps fade out as it passes them. Durations are
   for the full length; an interrupted draw/retract only covers what's left. */
const LINE_DRAW_MS = 1400
const LINE_RETRACT_MS = 500
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
/** Soft fade at the drawing end of the line (px) while it draws. Over the
    last TIP_FADE px before the milestone button it shrinks to 0, so the
    finished line runs solid into the button. */
const TIP_FADE = 32
/** Matches the 200ms quiet fade in the texts-reveal exit (.is-hiding). */
const REVEAL_HIDE_MS = 200

/* Paragraphs reveal line by line (RevealText, from Specto_TextReveal): each
   wrapped line slides up out of its own mask, no blur. They start where the
   blurred copy used to: one stagger after the pill plus the text gap
   (60ms + 80ms, mirroring --stagger-stagger × --reveal-tempo and
   --reveal-text-gap in ProcessPage.css). Duration and line stagger are the
   Specto_TextReveal defaults, at the site-wide REVEAL_SPEED (the start
   delay is not scaled: it lines up with the CSS pill / title). On hide, the parent's 200ms fade covers them,
   then the lines drop back below their masks. */
const PARAGRAPH_DELAY_S = 0.06 + 0.08
const PARAGRAPH_DURATION_S = 1.3 / REVEAL_SPEED
const PARAGRAPH_LINE_STAGGER_S = 0.06 / REVEAL_SPEED

/** `after`: extra seconds, e.g. one stagger so the milestone body follows its title. */
function paragraphTiming(slowMo: number, after = 0) {
  return {
    delay: (PARAGRAPH_DELAY_S + after) * slowMo,
    duration: PARAGRAPH_DURATION_S * slowMo,
    stagger: PARAGRAPH_LINE_STAGGER_S * slowMo,
    hideDelay: (REVEAL_HIDE_MS / 1000) * slowMo,
  }
}

/** Texts-reveal state for one .t-stagger: shown, then a short .is-hiding
    fade when it's taken away, then back to the hidden resting state. */
function useRevealClass(shown: boolean, slowMo: number) {
  const [hiding, setHiding] = useState(false)
  const [prevShown, setPrevShown] = useState(shown)
  if (shown !== prevShown) {
    setPrevShown(shown)
    setHiding(!shown)
  }
  useEffect(() => {
    if (!hiding) return
    const t = setTimeout(() => setHiding(false), REVEAL_HIDE_MS * slowMo)
    return () => clearTimeout(t)
  }, [hiding, slowMo])
  return shown ? ' is-shown' : hiding ? ' is-hiding' : ''
}

/** Section art video: plays once when the section is reached, holds on its
    last frame, and rewinds to the first once you scroll back above it so it
    plays again next time. */
function ArtVideo({ src, play }: { src: string; play: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const video = ref.current
    if (!video) return
    if (play) {
      video.play().catch(() => {})
    } else {
      video.pause()
      video.currentTime = 0
    }
  }, [play])
  return <video ref={ref} src={src} muted playsInline preload="auto" aria-hidden="true" />
}

function TimelineStep({ step, shown, slowMo }: { step: Step; shown: boolean; slowMo: number }) {
  const reveal = useRevealClass(shown, slowMo)
  return (
    <li className={`process-step t-stagger${reveal}`}>
      <div className="process-step-head">
        <span className="process-step-dot t-badge-dot" aria-hidden="true" />
        <span className="process-pill t-stagger-line t-stagger-line--2">
          <img src={step.icon} alt="" width={14} height={14} />
          <span className="process-pill-label">{step.label}</span>
        </span>
      </div>
      <div className="process-step-body process-reveal-text">
        <RevealText
          text={step.body}
          className="process-copy"
          isTriggered={shown}
          {...paragraphTiming(slowMo)}
        />
      </div>
    </li>
  )
}

function TimelineMilestone({
  milestone,
  shown,
  slowMo,
  markerRef,
}: {
  milestone: Section['milestone']
  shown: boolean
  slowMo: number
  markerRef: Ref<HTMLSpanElement>
}) {
  const reveal = useRevealClass(shown, slowMo)
  return (
    <div className={`process-milestone t-stagger${reveal}`}>
      <span className="process-milestone-button t-badge-dot" ref={markerRef} aria-hidden="true">
        <img src={milestone.icon} alt="" width={14} height={14} />
      </span>
      {milestone.title && (
        <div className="process-milestone-text">
          <h4
            className="process-milestone-title t-stagger-line t-stagger-line--3"
            data-bright={milestone.bright ? true : undefined}
          >
            {milestone.title}
          </h4>
          <div className="process-step-body process-reveal-text">
            <RevealText
              text={milestone.body ?? ''}
              className="process-copy"
              isTriggered={shown}
              {...paragraphTiming(slowMo, 0.06)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/* Dashed timeline running from the top of the steps down to the milestone
   button. Its length depends on how the copy wraps, so it's measured; how
   much of it is drawn follows the scroll. */
function Timeline({
  section,
  slowMo,
  play,
  playDelayMs,
}: {
  section: Section
  slowMo: number
  /** Draw the line and reveal the steps (false retracts them). */
  play: boolean
  /** Wait before drawing, e.g. for the ticket swap to finish. */
  playDelayMs: number
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<HTMLSpanElement>(null)
  const markerRef = useRef<HTMLSpanElement>(null)
  const reduceMotion = useReducedMotion() ?? false
  const [lineHeight, setLineHeight] = useState(0)
  // How many items (steps, then the milestone) the line has reached.
  const [reached, setReached] = useState(0)
  // How much of the line is drawn, 0–1 (a fraction, so a resize keeps it).
  const progress = useRef(0)
  // Line length, and the distance from its top to each step dot's centre and
  // finally to the milestone button.
  const geometry = useRef({ height: 0, stops: [] as number[] })

  // Writes the drawn length to the line and reveals the items it has reached.
  const paint = useCallback(() => {
    const line = lineRef.current
    if (!line) return
    const { height, stops } = geometry.current
    const draw = progress.current * height
    line.style.setProperty('--draw', `${draw}px`)
    line.style.setProperty('--tip', `${Math.min(TIP_FADE, height - draw)}px`)
    // The milestone counts once the line has fully arrived at its button.
    setReached(stops.filter((y, i) => (i === stops.length - 1 ? draw >= y - 1 : draw >= y)).length)
  }, [])

  // Measure (layout offsets, so the reveals' translateY never skews them).
  useLayoutEffect(() => {
    const root = rootRef.current
    const marker = markerRef.current
    if (!root || !marker) return
    const offsetIn = (el: HTMLElement) => {
      let y = 0
      for (let n: HTMLElement | null = el; n && n !== root; n = n.offsetParent as HTMLElement | null) y += n.offsetTop
      return y
    }
    const measure = () => {
      const dots = Array.from(root.querySelectorAll<HTMLElement>('.process-step-dot'))
      const height = offsetIn(marker)
      geometry.current = { height, stops: [...dots.map((d) => offsetIn(d) + d.offsetHeight / 2), height] }
      setLineHeight(height)
      paint()
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(root)
    return () => ro.disconnect()
  }, [paint])

  // Play / retract.
  useEffect(() => {
    const target = play ? 1 : 0
    const from = progress.current
    if (from === target) return
    if (reduceMotion) {
      progress.current = target
      paint()
      return
    }
    const duration = (play ? LINE_DRAW_MS : LINE_RETRACT_MS) * slowMo * Math.abs(target - from)
    let frame = 0
    let start = 0
    const tick = (now: number) => {
      if (!start) start = now
      const t = Math.min((now - start) / duration, 1)
      progress.current = from + (target - from) * easeInOutCubic(t)
      paint()
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    const timer = setTimeout(() => {
      frame = requestAnimationFrame(tick)
    }, play ? playDelayMs : 0)
    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(frame)
    }
  }, [play, playDelayMs, slowMo, reduceMotion, paint])

  const { milestone } = section
  return (
    <div className="process-timeline" ref={rootRef}>
      <span
        className="process-timeline-line"
        ref={lineRef}
        data-fade-out={section.lineFadesOut ? true : undefined}
        style={{ height: lineHeight }}
        aria-hidden="true"
      />
      <ol className="process-steps">
        {section.steps.map((step, i) => (
          <TimelineStep key={step.label} step={step} shown={reached > i} slowMo={slowMo} />
        ))}
      </ol>
      <TimelineMilestone
        milestone={milestone}
        shown={reached > section.steps.length}
        slowMo={slowMo}
        markerRef={markerRef}
      />
    </div>
  )
}

export default function ProcessPage() {
  // How many sections' images have lined up with the ticket. The ticket
  // shows the last of them; each of them has its timeline played.
  const [reachedSections, setReachedSections] = useState(0)
  const active = Math.max(reachedSections - 1, 0)
  const [slow, setSlow] = useState(false)
  const slowMo = slow ? 10 : 1
  const artRefs = useRef<(HTMLElement | null)[]>([])
  const ticketRef = useRef<HTMLDivElement>(null)

  // Trigger line = the vertical centre of the (sticky) ticket card. A section
  // becomes active once its image's centre has scrolled up to that line, i.e.
  // when the image lines up with the card.
  useEffect(() => {
    let frame = 0
    const centre = (r: DOMRect) => r.top + r.height / 2
    const update = () => {
      frame = 0
      const card = ticketRef.current?.querySelector('.jira-ticket')
      if (!card) return
      const line = centre(card.getBoundingClientRect())
      const arts = artRefs.current.map((el) => (el ? centre(el.getBoundingClientRect()) : Infinity))
      let count = 0
      // The first image sits above the ticket's centre from the start, so it
      // can never "line up" with it: it plays when it scrolls into view (its
      // centre crosses the shared reveal line, 40px above the viewport bottom).
      const firstLine = Math.min(line, window.innerHeight - 40)
      arts.forEach((c, i) => {
        if (c <= (i === 0 ? firstLine : line)) count = i + 1
      })
      setReachedSections(count)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])


  return (
    <main className="process-page" style={{ '--motion-slow': slowMo } as CSSProperties}>
      {/* Empty viewport above, so the section's entrance can be tested while scrolling in. */}
      <div className="process-viewport-spacer" aria-hidden="true" />
      <section className="process" aria-labelledby="process-title">
        <div className="process-aside">
          <div className="process-sticky">
            <header className="process-header">
              <p className="process-eyebrow font-zero">Our process</p>
              <div className="process-header-text">
                <h2 className="process-title" id="process-title">
                  Specto’s blueprint
                  <br />
                  for digital success.
                </h2>
                <p className="process-copy process-subtitle">
                  Take a look at how we blend strategy, design and development into one seamless process.
                </p>
              </div>
            </header>
            <div className="process-ticket" ref={ticketRef}>
              <JiraTicket
                ticketKey="SPEC-11"
                title="Specto’s Website - v8"
                priority="Highest Priority"
                state={SECTIONS[active].ticket}
                stateKey={active}
                slowMo={slowMo}
              />
            </div>
          </div>
        </div>

        <div className="process-sections">
          {SECTIONS.map((section, i) => (
            <article key={section.number} className="process-section">
              <header className="process-section-header">
                <div
                  className="process-section-art"
                  ref={(el) => {
                    artRefs.current[i] = el
                  }}
                >
                  {section.art.video ? (
                    <ArtVideo src={section.art.src} play={reachedSections > i} />
                  ) : (
                    <img
                      src={section.art.src}
                      alt=""
                      style={section.art.crop}
                      data-crop={section.art.crop ? true : undefined}
                    />
                  )}
                </div>
                <h3 className="process-section-title">
                  <span className="process-section-number">{section.number}</span>
                  <span>{section.title}</span>
                </h3>
                <p className="process-copy">{section.intro}</p>
              </header>
              <Timeline
                section={section}
                slowMo={slowMo}
                play={reachedSections > i}
                // The first section's state is already on the ticket (no swap
                // to wait for); later ones wait for the ticket to finish.
                playDelayMs={i === 0 ? 0 : TICKET_SWAP_MS * slowMo}
              />
            </article>
          ))}
        </div>
      </section>

      <button
        type="button"
        className="motion-slow-toggle"
        aria-pressed={slow}
        onClick={() => setSlow((v) => !v)}
      >
        {slow ? '0.1× speed' : '1× speed'}
      </button>
    </main>
  )
}
