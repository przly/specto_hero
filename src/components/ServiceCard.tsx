import { useEffect, useRef, useState, type PointerEvent } from 'react'
import HoverVideo from './HoverVideo'
import type { ServiceItem } from './serviceItems'
import './ServiceCard.css'

/* One item of specto-website `modules/HomeServices`: divider line, graphic,
   title (Title h4 / medium / text-3xl) and text.

   The graphic is a short `video` that plays forward while the card is
   hovered and backward when the pointer leaves. On touch screens (no
   hover) the card plays while it crosses the middle of the viewport. */

// Touch has no real hover: a tap fires enter and leave back to back,
// which would play and instantly rewind. Only mouse/pen drive it.
const isHoverPointer = (event: PointerEvent) => event.pointerType !== 'touch'

const LINE_EASING = 'cubic-bezier(0.65, 0, 0.35, 1)' // ease-in-out
const FALLBACK_LINE_DURATION = 600 // ms, until the video's length is known

// The line is a segment [start, end] of the card width (0..1), drawn as
// translateX(start) scaleX(end - start) with a left transform-origin.
type Segment = [number, number]
const toTransform = ([a, b]: Segment) => `translateX(${a * 100}%) scaleX(${b - a})`

// Read the segment currently on screen, including mid-animation.
function readSegment(el: HTMLElement): Segment {
  const m = new DOMMatrixReadOnly(getComputedStyle(el).transform)
  const width = el.offsetWidth || 1
  const a = m.e / width
  return [a, a + m.a]
}

type Side = 'left' | 'right'

// Which side of the card a point is on, by horizontal position.
const sideOf = (rect: DOMRect, x: number): Side => (x < rect.left + rect.width / 2 ? 'left' : 'right')

// Entering from the top or bottom edge always grows the line left → right,
// so it reads as a sweep. Only a side entry grows it from that side.
const entrySideOf = (rect: DOMRect, x: number, y: number): Side => {
  const toVertical = Math.min(y - rect.top, rect.bottom - y)
  const toHorizontal = Math.min(x - rect.left, rect.right - x)
  return toVertical <= toHorizontal ? 'left' : sideOf(rect, x)
}

/* Browsers don't send pointerenter/leave when the page scrolls under a
   resting cursor (Safari never does, Chrome only sometimes). So remember
   where the mouse last was, and on scroll each card hit-tests that point.
   Shared by every card: one set of window listeners. */
let lastPointer: { x: number; y: number } | null = null
let pointerListeners = 0
const trackPointer = (event: globalThis.PointerEvent) => {
  lastPointer = event.pointerType === 'touch' ? null : { x: event.clientX, y: event.clientY }
}
// Cursor left the window: nothing is under it any more.
const forgetPointer = (event: globalThis.PointerEvent) => {
  if (!event.relatedTarget) lastPointer = null
}
function usePointerTracking() {
  useEffect(() => {
    if (pointerListeners++ === 0) {
      window.addEventListener('pointermove', trackPointer, { passive: true })
      window.addEventListener('pointerdown', trackPointer, { passive: true })
      document.addEventListener('pointerout', forgetPointer, { passive: true })
    }
    return () => {
      if (--pointerListeners === 0) {
        window.removeEventListener('pointermove', trackPointer)
        window.removeEventListener('pointerdown', trackPointer)
        document.removeEventListener('pointerout', forgetPointer)
      }
    }
  }, [])
}

type ServiceCardProps = ServiceItem & {
  /** Playback speed, 1 = the video's own frame rate. */
  rate?: number
}

export default function ServiceCard({ video, poster, rate = 1, title, text }: ServiceCardProps) {
  const [hovered, setHovered] = useState(false)
  const [videoDuration, setVideoDuration] = useState<number | null>(null)
  const fillRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<Animation | null>(null)

  // The hover line runs for exactly as long as the video takes to play
  // through at the current rate, so both finish together.
  const lineDuration = videoDuration ? (videoDuration / rate) * 1000 : FALLBACK_LINE_DURATION

  useEffect(() => () => animRef.current?.cancel(), [])

  // Animate from wherever the line is now. If it is fully hidden, first jump
  // (invisibly) to `hiddenStart` so it grows out of the cursor's side.
  const animateLine = (target: Segment, hiddenStart?: Segment) => {
    const el = fillRef.current
    if (!el) return
    let from = readSegment(el)
    animRef.current?.cancel()
    if (hiddenStart && from[1] - from[0] < 0.001) from = hiddenStart

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // Scale time by the distance left to travel, like the video reversing
    // from its current frame.
    const distance = Math.max(Math.abs(target[0] - from[0]), Math.abs(target[1] - from[1]))
    el.style.transform = toTransform(target)
    animRef.current = el.animate([{ transform: toTransform(from) }, { transform: toTransform(target) }], {
      duration: reduceMotion ? 0 : lineDuration * distance,
      easing: LINE_EASING,
    })
  }

  const cardRef = useRef<HTMLDivElement>(null)
  const hoveredRef = useRef(false)

  // Both the pointer events and the scroll check go through these, so a card
  // never enters twice or leaves while it isn't hovered.
  const enter = (x: number, y: number) => {
    const card = cardRef.current
    if (!card || hoveredRef.current) return
    hoveredRef.current = true
    setHovered(true)
    const edge = entrySideOf(card.getBoundingClientRect(), x, y) === 'left' ? 0 : 1
    animateLine([0, 1], [edge, edge])
  }

  const leave = (x: number) => {
    const card = cardRef.current
    if (!card || !hoveredRef.current) return
    hoveredRef.current = false
    setHovered(false)
    const edge = sideOf(card.getBoundingClientRect(), x) === 'left' ? 0 : 1
    animateLine([edge, edge])
  }

  // The scroll listener is added once; keep it calling the latest handlers
  // (animateLine closes over the current line duration).
  const handlersRef = useRef({ enter, leave })
  useEffect(() => {
    handlersRef.current = { enter, leave }
  })

  usePointerTracking()

  useEffect(() => {
    let frame: number | null = null
    // Only hit-test while the card is on screen (or still marked hovered, so
    // it can leave): elementFromPoint forces a layout, and every card used
    // to run it on every scroll frame anywhere on the page.
    let inView = false
    const card = cardRef.current
    const visibility = card
      ? new IntersectionObserver(([entry]) => {
          inView = entry.isIntersecting
        })
      : null
    if (card) visibility?.observe(card)
    const check = () => {
      frame = null
      const card = cardRef.current
      if (!card) return
      const p = lastPointer
      // No mouse (touch screens, or it left the window): nothing to hit-test.
      // Touch is driven by the viewport-middle observer below instead.
      if (!p) return
      // Same rule as real hover: whatever is topmost under the cursor.
      const over = card.contains(document.elementFromPoint(p.x, p.y))
      if (over) handlersRef.current.enter(p.x, p.y)
      else if (hoveredRef.current) handlersRef.current.leave(p.x)
    }
    const onScroll = () => {
      if (!inView && !hoveredRef.current) return
      if (frame === null) frame = requestAnimationFrame(check)
    }
    // Capture: also catches scrolling inside nested scroll containers.
    window.addEventListener('scroll', onScroll, { passive: true, capture: true })
    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true })
      visibility?.disconnect()
      if (frame !== null) cancelAnimationFrame(frame)
    }
  }, [])

  // Touch screens have no hover: play while the card crosses the middle of
  // the viewport, play back out once it scrolls past. The root margin
  // shrinks the viewport to a 0px line across its middle.
  useEffect(() => {
    const card = cardRef.current
    if (!card) return
    const noHover = window.matchMedia('(hover: none)')
    let observer: IntersectionObserver | null = null

    const sync = () => {
      observer?.disconnect()
      observer = null
      if (!noHover.matches) return
      observer = new IntersectionObserver(
        ([entry]) => {
          const { left, top } = entry.boundingClientRect
          // A point on the top-left corner: the line grows from the left,
          // and retracts back to the left as the video rewinds.
          if (entry.isIntersecting) handlersRef.current.enter(left, top)
          else handlersRef.current.leave(left)
        },
        { rootMargin: '-50% 0px -50% 0px' },
      )
      observer.observe(card)
    }

    sync()
    noHover.addEventListener('change', sync)
    return () => {
      noHover.removeEventListener('change', sync)
      observer?.disconnect()
    }
  }, [])

  const onEnter = (event: PointerEvent<HTMLDivElement>) => {
    if (!isHoverPointer(event)) return
    enter(event.clientX, event.clientY)
  }

  const onLeave = (event: PointerEvent<HTMLDivElement>) => {
    if (!isHoverPointer(event)) return
    leave(event.clientX)
  }

  return (
    <div className="service-card" ref={cardRef} onPointerEnter={onEnter} onPointerLeave={onLeave}>
      <div className="service-card-line">
        <div className="service-card-line-fill" ref={fillRef} />
      </div>
      <div className="service-card-image-wrap">
        <HoverVideo
          className="service-card-image service-card-video"
          src={video}
          poster={poster}
          rate={rate}
          playing={hovered}
          label={title}
          onDuration={setVideoDuration}
        />
      </div>
      <h3 className="heading heading-4 font-zero service-card-title">{title}</h3>
      <p className="service-card-text">{text}</p>
    </div>
  )
}
