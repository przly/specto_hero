import { useEffect, useRef, useState, type CSSProperties } from 'react'
import JiraTicket, { type AvatarTone, type TeamAvatar, type TicketState } from '../components/JiraTicket'
import './JiraTicketPage.css'

/* Scroll section: the ticket sticks on the left, the steps on the right scroll
   past it. Whichever step crosses the middle of the viewport sets the ticket's
   state. Step copy is placeholder — the Figma frame only defines the ticket. */

type Step = {
  eyebrow: string
  heading: string
  body: string
  ticket: TicketState
  /** Optional: the assignees change as you scroll through this step. Each
      entry is one stage; scroll progress through the step picks the stage. */
  avatarStages?: TeamAvatar[][]
}

/** `count` avatars of one colour, ids `${prefix}1…`. */
function teamAvatars(prefix: string, tone: AvatarTone, count: number): TeamAvatar[] {
  return Array.from({ length: count }, (_, i) => ({ id: `${prefix}${i + 1}`, tone }))
}

const DEV = teamAvatars('dev', 'green', 3)
const [d1, d2, d3] = DEV
// Designers who join the development team for a while, then hand back.
const [h1, h2] = teamAvatars('helper', 'yellow', 2)

const STEPS: Step[] = [
  {
    eyebrow: '01',
    heading: 'Shape the brief',
    body: 'Product and brand set the scope together, so the work starts from the same picture.',
    ticket: {
      status: 'todo',
      tags: ['product', 'brand-comms'],
      avatars: teamAvatars('design', 'yellow', 2),
      team: 'Design Team',
    },
  },
  {
    eyebrow: '02',
    heading: 'Build it',
    body: 'Development picks the ticket up and ships it in small, reviewable steps.',
    ticket: {
      status: 'in-progress',
      tags: ['development'],
      avatars: DEV,
      team: 'Development Team',
    },
    // A designer joins at the front, then a second; then they leave again
    // one by one and the developers move back up.
    avatarStages: [
      [d1, d2, d3],
      [h1, d1, d2],
      [h2, h1, d1],
      [h1, d1, d2],
      [d1, d2, d3],
    ],
  },
  {
    eyebrow: '03',
    heading: 'Close the loop',
    body: 'Project management signs it off against the strategy and the ticket is done.',
    ticket: {
      status: 'done',
      tags: ['strategy', 'product'],
      avatars: teamAvatars('pm', 'blue', 1),
      team: 'Project Management',
    },
  },
]

export default function JiraTicketPage() {
  const [active, setActive] = useState(0)
  const [stage, setStage] = useState(0)
  const [slow, setSlow] = useState(false)
  const slowMo = slow ? 10 : 1
  const stepRefs = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    // A zero-height band at the vertical centre: a step is "active" while it covers it.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index))
        }
      },
      { rootMargin: '-50% 0px -50% 0px' },
    )
    stepRefs.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [])

  // Stage within the active step: how far the viewport centre has travelled
  // through it, split evenly across its avatar stages.
  const stageCount = STEPS[active].avatarStages?.length ?? 1
  useEffect(() => {
    if (stageCount < 2) return
    const el = stepRefs.current[active]
    if (!el) return
    let frame = 0
    const update = () => {
      frame = 0
      const r = el.getBoundingClientRect()
      const progress = Math.min(Math.max((window.innerHeight / 2 - r.top) / r.height, 0), 0.9999)
      setStage(Math.floor(progress * stageCount))
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
  }, [active, stageCount])

  const step = STEPS[active]
  const ticketState: TicketState = step.avatarStages
    ? { ...step.ticket, avatars: step.avatarStages[Math.min(stage, step.avatarStages.length - 1)] }
    : step.ticket

  return (
    <main className="jira-ticket-page" style={{ '--motion-slow': slowMo } as CSSProperties}>
      <section className="jira-scroll">
        <div className="jira-scroll-sticky">
          <JiraTicket
            ticketKey="SPEC-11"
            title="Specto’s Website - v8"
            priority="Highest Priority"
            state={ticketState}
            stateKey={active}
            slowMo={slowMo}
          />
        </div>

        <ol className="jira-scroll-steps">
          {STEPS.map((step, i) => (
            <li
              key={step.eyebrow}
              ref={(el) => {
                stepRefs.current[i] = el
              }}
              data-index={i}
              data-active={i === active}
              data-staged={step.avatarStages ? true : undefined}
              className="jira-scroll-step"
            >
              <div className="jira-scroll-step-content">
                <p className="jira-scroll-eyebrow font-mono">{step.eyebrow}</p>
                <h2 className="jira-scroll-heading font-zero">{step.heading}</h2>
                <p className="jira-scroll-body font-zero">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
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
