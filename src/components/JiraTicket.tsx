import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'motion/react'
import checkIcon from '../assets/jira-ticket/check.svg'
import tagBrandIcon from '../assets/jira-ticket/tag-brand-comms.svg'
import tagDevelopmentIcon from '../assets/jira-ticket/tag-development.svg'
import tagProductIcon from '../assets/jira-ticket/tag-product.svg'
import tagStrategyIcon from '../assets/jira-ticket/tag-strategy.svg'
import userIcon from '../assets/jira-ticket/memoji-user.svg'
import warningIcon from '../assets/jira-ticket/warning-circle.svg'
import './JiraTicket.css'

/* Figma: Specto Website › "Jira ticket states" (6611:7474).
   One ticket, three states (to do → in progress → done). The ticket frame
   stays put; the status check, tags and assignees swap when `state` changes. */

export type TicketStatus = 'todo' | 'in-progress' | 'done'
export type TicketTag = 'strategy' | 'product' | 'development' | 'brand-comms'
export type AvatarTone = 'yellow' | 'green' | 'blue'

export type TeamAvatar = { id: string; tone: AvatarTone }

export type TicketState = {
  status: TicketStatus
  tags: TicketTag[]
  /** Assignees, leader first. Ids give each avatar an identity, so a change
      that keeps some of them (someone joins or leaves) slides the line
      instead of replacing it. Each spot back from the leader is dimmer. */
  avatars: TeamAvatar[]
  team: string
}

export type JiraTicketProps = {
  ticketKey: string
  title: string
  priority: string
  state: TicketState
  /** Changes whenever the state changes; drives the swap animation. */
  stateKey: string | number
  /** Duration multiplier for slow-motion review (10 = 0.1x speed). CSS
      transitions read the same value from the inherited --motion-slow var. */
  slowMo?: number
}

const TAGS: Record<TicketTag, { label: string; icon: string; width: number; height: number }> = {
  strategy: { label: 'Strategy', icon: tagStrategyIcon, width: 8.0811, height: 7.01948 },
  product: { label: 'Product', icon: tagProductIcon, width: 9.27779, height: 6.19042 },
  development: { label: 'Development', icon: tagDevelopmentIcon, width: 8.08115, height: 7.01949 },
  'brand-comms': { label: 'Brand & Comms', icon: tagBrandIcon, width: 14.175, height: 7.425 },
}

const STATUS_ORDER: Record<TicketStatus, number> = { todo: 0, 'in-progress': 1, done: 2 }

type Direction = 1 | -1

const EASE_OUT = [0.23, 1, 0.32, 1] as const
const EASE_IN_OUT_CUBIC = [0.65, 0, 0.35, 1] as const

/* Card timeline. Every state change runs as two equal phases, so the whole
   card moves together instead of each part keeping its own clock:
     out   0–190ms   tags + team name leave; the status pie sweeps + recolours
     in  190–380ms   tags + team name arrive; on "done" the disc swells, tick lands
   One phase = a 150ms text swap + one 40ms stagger step. Avatars crossfade
   across both phases (300ms per spot, 40ms apart: 0–300 / 40–340 / 80–380),
   so the three handoffs sit at 150 / 190 / 230ms, centred on the phase
   change. The CSS reads the same value as --swap-phase on .jira-ticket. */
const SWAP_PHASE_MS = 190
const TEXT_SWAP_S = 0.15

type SwapCustom = {
  dir: Direction
  reduce: boolean
  delay: number
  slow: number
  /** Overrides the swap's own duration (seconds), e.g. to match the avatar belt. */
  duration?: number
}

/* Content swap. Follows the scroll: moving forward, the old content leaves
   one way and the new one arrives from the other; moving back, the reverse.
   Tags travel vertically (up/out, in from below); the team name travels
   horizontally with the avatar belt (left/out, in from the right). Exit uses the
   same timing as enter. Full transform strings (not x/y) so Motion can run
   them off the main thread. */
function makeSwap(
  axis: 'X' | 'Y',
  distance: number,
  duration = 0.12,
  ease: readonly [number, number, number, number] = EASE_OUT,
): Variants {
  const offset = (px: number) => `translate${axis}(${px}px)`
  return {
    enter: ({ dir, reduce }: SwapCustom) =>
      reduce ? { opacity: 0 } : { opacity: 0, transform: offset(dir * distance), filter: 'blur(6px)' },
    center: ({ delay, slow, duration: d = duration }: SwapCustom) => ({
      opacity: 1,
      transform: offset(0),
      filter: 'blur(0px)',
      transition: { duration: d * slow, ease, delay: delay * slow },
    }),
    exit: ({ dir, reduce, slow, duration: d = duration }: SwapCustom) =>
      reduce
        ? { opacity: 0, transition: { duration: d * slow, ease } }
        : {
            opacity: 0,
            transform: offset(dir * -distance),
            filter: 'blur(6px)',
            transition: { duration: d * slow, ease },
          },
  }
}

/* Product tags — transitions.dev "Text states swap", one per pill.
   Two phases, never overlapping: the old pills leave (up, blur 2px, fade,
   150ms ease-in-out), then the new pills arrive from below. Pills start
   --tag-stagger (40ms) apart — left to right going forward, right to
   left going back (and the vertical travel flips). A change that lands
   mid-exit just updates what comes in; one that lands mid-enter starts the
   exit from wherever the pills are. The exit always takes one full
   SWAP_PHASE_MS (even with one pill) so the entrance lands on the card's
   phase change. */

type TagPhase = 'idle' | 'exit' | 'enter-start'

function TagSwap({
  tags,
  direction,
  slowMo,
  reduce,
}: {
  tags: TicketTag[]
  direction: Direction
  slowMo: number
  reduce: boolean
}) {
  const [shown, setShown] = useState(tags)
  const [phase, setPhase] = useState<TagPhase>('idle')
  const [dir, setDir] = useState(direction)
  const rowRef = useRef<HTMLDivElement>(null)
  const latest = useRef(tags)
  const targetKey = tags.join(',')
  const shownKey = shown.join(',')

  useEffect(() => {
    latest.current = tags
  })

  // Start the exit when the target differs from what's on screen; cancel it
  // if the target comes back before the old pills are gone (adjusting state
  // during render).
  if (targetKey !== shownKey && phase === 'idle') {
    setDir(direction)
    setPhase('exit')
  } else if (targetKey === shownKey && phase === 'exit') {
    setPhase('idle')
  }

  // Once the last old pill is out, put the new ones below (no transition).
  const exitMs = reduce ? 0 : SWAP_PHASE_MS * slowMo
  useEffect(() => {
    if (phase !== 'exit') return
    const t = setTimeout(() => {
      setShown(latest.current)
      setPhase('enter-start')
    }, exitMs)
    return () => clearTimeout(t)
  }, [phase, exitMs])

  // Reflow so the browser commits the "below" position, then release the
  // pills to rest — this is what makes the entrance transition run.
  useLayoutEffect(() => {
    if (phase !== 'enter-start') return
    void rowRef.current?.offsetHeight
    // Must follow the forced reflow above; can't be derived during render.
    // oxlint-disable-next-line react/set-state-in-effect
    setPhase('idle')
  }, [phase])

  const phaseClass = phase === 'idle' ? '' : ` is-${phase}`
  return (
    <div ref={rowRef} className="jira-ticket-tags" data-direction={dir === 1 ? 'forward' : 'back'}>
      {shown.map((tag, i) => {
        const t = TAGS[tag]
        const order = dir === 1 ? i : shown.length - 1 - i
        return (
          <span
            key={tag}
            className={`t-text-swap${phaseClass}`}
            style={{ transitionDelay: `calc(var(--tag-stagger) * ${order} * var(--motion-slow, 1))` }}
          >
            <span className="jira-ticket-tag" data-tone={tag}>
              <img className="jira-ticket-tag-icon" src={t.icon} alt="" width={t.width} height={t.height} />
              <span className="jira-ticket-tag-label font-zero">{t.label}</span>
            </span>
          </span>
        )
      })}
    </div>
  )
}

// Team name travels sideways: out left, in from the right (mirrored going back).
// Same two phases as the tags — out over 150ms, in from the 190ms mark.
const horizontalSwap = makeSwap('X', 6, TEXT_SWAP_S, EASE_IN_OUT_CUBIC)

/* Team avatars — transitions.dev "Icon swap", one per spot.
   Three fixed spots (12px apart, leader on top). When the team changes,
   every spot whose avatar changes crossfades in place: the old avatar fades
   out, blurs and shrinks while the new one fades in and grows from small
   (--icon-swap-* tokens: ease-in-out, 2px blur, from 0.25 scale; 300ms here
   instead of the 250ms token so the swap spans the card timeline).
   Spots start --duration-stagger (40ms) apart — front to back going forward,
   back to front going back. Empty spots simply fade. Each spot's colour is
   dimmed by its distance from the lead spot (100 / 50 / 25%). */
const AVATAR_SPOTS = 3
const AVATAR_SPOT_OFFSET = 12 // 24px avatar overlapped by 12px
/* Strength of the team colour per spot, leader first. Matches Figma's
   #a5ff00 → #598506 → #334909 (green at 100/50/25% over the card). */
const SPOT_STRENGTH = [1, 0.5, 0.25]

type SpotTone = AvatarTone | null
type Spot = { a: SpotTone; b: SpotTone; state: 'a' | 'b' }

function AvatarSpots({ avatars, direction }: { avatars: TeamAvatar[]; direction: Direction }) {
  const tones = Array.from({ length: AVATAR_SPOTS }, (_, i): SpotTone => avatars[i]?.tone ?? null)
  const key = tones.join(',')

  // Each spot keeps two layers (a/b). A change writes the new avatar into the
  // hidden layer and flips data-state, so the two crossfade (adjusting state
  // during render, no effect needed).
  const [spots, setSpots] = useState(() => ({
    key,
    dir: direction,
    list: tones.map((t): Spot => ({ a: t, b: null, state: 'a' })),
  }))
  if (spots.key !== key) {
    setSpots({
      key,
      dir: direction,
      list: spots.list.map((sp, i): Spot => {
        const shown = sp.state === 'a' ? sp.a : sp.b
        if (shown === tones[i]) return sp
        return sp.state === 'a' ? { a: sp.a, b: tones[i], state: 'b' } : { a: tones[i], b: sp.b, state: 'a' }
      }),
    })
  }

  return (
    <span className="jira-ticket-avatars">
      {spots.list.map((sp, i) => {
        const order = spots.dir === 1 ? i : AVATAR_SPOTS - 1 - i
        const delay = `calc(var(--duration-stagger) * ${order} * var(--motion-slow, 1))`
        return (
          <span
            key={i}
            className="jira-ticket-spot"
            style={{ left: i * AVATAR_SPOT_OFFSET, zIndex: AVATAR_SPOTS - i }}
          >
            <span className="t-icon-swap" data-state={sp.state}>
              {(['a', 'b'] as const).map((layer) => (
                <span key={layer} className="t-icon" data-icon={layer} style={{ transitionDelay: delay }}>
                  {sp[layer] && <Memoji tone={sp[layer]} strength={SPOT_STRENGTH[i]} />}
                </span>
              ))}
            </span>
          </span>
        )
      })}
    </span>
  )
}

const STATUS_LABEL: Record<TicketStatus, string> = {
  todo: 'To do',
  'in-progress': 'In progress',
  done: 'Done',
}

/* One persistent element for all three statuses, so changes are transitions
   rather than swaps: the ring recolours (white → yellow → green), the inner
   pie sweeps clockwise like a clock hand (0 → half → full), and on "done"
   the whole disc fills green and the tick pops in. Geometry matches the
   Figma in-progress icon: 1.3px ring, 5.5px-radius half disc. */
function StatusCheck({ status, direction }: { status: TicketStatus; direction: Direction }) {
  return (
    <span
      className="jira-ticket-check"
      data-status={status}
      data-direction={direction === 1 ? 'forward' : 'back'}
    >
      <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle className="jira-ticket-check-ring" cx={8} cy={8} r={7.35} strokeWidth={1.3} />
        {/* A circle of radius r with stroke 2r draws a pie; the dash length sets how much of it shows. */}
        <circle
          className="jira-ticket-check-pie"
          cx={8}
          cy={8}
          r={2.75}
          strokeWidth={5.5}
        />
      </svg>
      <img className="jira-ticket-check-tick" src={checkIcon} alt="" width={12} height={12} />
    </span>
  )
}

// The dimming is a card-coloured layer over the fill (under the icon), not
// the avatar's own opacity, so overlapping avatars stay solid like in Figma.
function Memoji({ tone, strength }: { tone: AvatarTone; strength: number }) {
  return (
    <span className="jira-ticket-memoji" data-tone={tone}>
      <span className="jira-ticket-memoji-shade" style={{ opacity: 1 - strength }} />
      <span className="jira-ticket-memoji-icon">
        <img src={userIcon} alt="" width={11.812} height={11.3951} />
      </span>
    </span>
  )
}

/* Overall tempo of the card's motion: 1.25 = everything 25% slower than the
   base timings written above and in JiraTicket.css. Applied by re-setting
   --motion-slow on the card, so every CSS duration, delay and stagger (and
   the JS timers below) scales together and stays in sync. */
const CARD_TEMPO = 1.25

export default function JiraTicket({ ticketKey, title, priority, state, stateKey, slowMo: pageSlowMo = 1 }: JiraTicketProps) {
  const slowMo = pageSlowMo * CARD_TEMPO
  const reduceMotion = useReducedMotion() ?? false

  // Track which way the ticket moved (adjusting state during render, so the
  // direction is known on the same render as the new state).
  const [prevStatus, setPrevStatus] = useState(state.status)
  const [direction, setDirection] = useState<Direction>(1)
  if (state.status !== prevStatus) {
    const dir: Direction = STATUS_ORDER[state.status] > STATUS_ORDER[prevStatus] ? 1 : -1
    setDirection(dir)
    setPrevStatus(state.status)
  }

  const swapProps = (variants: Variants, delay: number, duration?: number) => ({
    variants,
    custom: { dir: direction, reduce: reduceMotion, delay, slow: slowMo, duration } satisfies SwapCustom,
    initial: 'enter',
    animate: 'center',
    exit: 'exit',
  })
  const presenceCustom: SwapCustom = { dir: direction, reduce: reduceMotion, delay: 0, slow: slowMo }

  return (
    <article
      className="jira-ticket"
      style={{ '--motion-slow': slowMo } as CSSProperties}
      aria-label={`${ticketKey}: ${title}, ${STATUS_LABEL[state.status]}`}>
      <div className="jira-ticket-header">
        <div className="jira-ticket-key-row">
          <p className="jira-ticket-key font-mono">{ticketKey}</p>
          <div className="jira-ticket-priority">
            <img src={warningIcon} alt="" width={16} height={16} />
            <span className="jira-ticket-meta font-zero">{priority}</span>
          </div>
        </div>
        <div className="jira-ticket-title-row">
          <StatusCheck status={state.status} direction={direction} />
          <h3 className="jira-ticket-title font-zero">{title}</h3>
        </div>
      </div>

      <div className="jira-ticket-slot jira-ticket-tags-slot">
        <TagSwap tags={state.tags} direction={direction} slowMo={slowMo} reduce={reduceMotion} />
      </div>

      <div className="jira-ticket-footer">
        {/* Avatars on the left, team name pinned to the right edge. The name
            doesn't follow the belt, so each name makes exactly one move: the
            old one slides out, the new one slides in. */}
        <div className="jira-ticket-team">
          <AvatarSpots avatars={state.avatars} direction={direction} />
          <AnimatePresence initial={false} custom={presenceCustom}>
            <motion.span
              key={stateKey}
              className="jira-ticket-meta jira-ticket-meta-strong jira-ticket-team-name font-zero"
              {...swapProps(horizontalSwap, SWAP_PHASE_MS / 1000)}
            >
              {state.team}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
    </article>
  )
}
