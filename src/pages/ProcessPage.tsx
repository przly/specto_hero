import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import JiraTicket, { type AvatarTone, type TeamAvatar, type TicketState } from '../components/JiraTicket'
import sectionExplore from '../assets/process/section-explore.png'
import sectionBuild from '../assets/process/section-build.png'
import sectionEvolve from '../assets/process/section-evolve.png'
import timelineDot from '../assets/process/timeline-dot.svg'
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
  art: { src: string; crop?: CSSProperties }
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
    art: { src: sectionExplore, crop: ART_CROP },
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

/* Dashed timeline running from the top of the steps down to the milestone
   button. Its length depends on how the copy wraps, so it's measured. */
function Timeline({ section }: { section: Section }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const markerRef = useRef<HTMLSpanElement>(null)
  const [lineHeight, setLineHeight] = useState(0)

  useLayoutEffect(() => {
    const root = rootRef.current
    const marker = markerRef.current
    if (!root || !marker) return
    const measure = () =>
      setLineHeight(marker.getBoundingClientRect().top - root.getBoundingClientRect().top)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(root)
    return () => ro.disconnect()
  }, [])

  const { milestone } = section
  return (
    <div className="process-timeline" ref={rootRef}>
      <span
        className="process-timeline-line"
        data-fade-out={section.lineFadesOut ? true : undefined}
        style={{ height: lineHeight }}
        aria-hidden="true"
      />
      <ol className="process-steps">
        {section.steps.map((step) => (
          <li key={step.label} className="process-step">
            <div className="process-step-head">
              <span className="process-step-dot" aria-hidden="true">
                <img src={timelineDot} alt="" width={26} height={26} />
              </span>
              <span className="process-pill">
                <img src={step.icon} alt="" width={14} height={14} />
                <span className="process-pill-label">{step.label}</span>
              </span>
            </div>
            <p className="process-copy process-step-body">{step.body}</p>
          </li>
        ))}
      </ol>
      <div className="process-milestone">
        <span className="process-milestone-button" ref={markerRef} aria-hidden="true">
          <img src={milestone.icon} alt="" width={14} height={14} />
        </span>
        {milestone.title && (
          <div className="process-milestone-text">
            <h4 className="process-milestone-title" data-bright={milestone.bright ? true : undefined}>
              {milestone.title}
            </h4>
            <p className="process-copy process-step-body">{milestone.body}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ProcessPage() {
  const [active, setActive] = useState(0)
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
      let next = 0
      arts.forEach((c, i) => {
        if (c <= line) next = i
      })
      setActive(next)
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
                  <img
                    src={section.art.src}
                    alt=""
                    style={section.art.crop}
                    data-crop={section.art.crop ? true : undefined}
                  />
                </div>
                <h3 className="process-section-title">
                  <span className="process-section-number">{section.number}</span>
                  <span>{section.title}</span>
                </h3>
                <p className="process-copy">{section.intro}</p>
              </header>
              <Timeline section={section} />
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
