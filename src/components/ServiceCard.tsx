import { useEffect, useRef, useState, type PointerEvent } from 'react'
import FrameSequence from './FrameSequence'
import type { ServiceItem } from './serviceItems'
import './ServiceCard.css'

/* One item of specto-website `modules/HomeServices`: divider line, graphic,
   title (Title h4 / medium / text-3xl) and text.

   Graphic is either a still `image` or a `frames` sequence. A sequence plays
   forward while the card is hovered and backward when the pointer leaves. */

// Touch has no real hover: a tap fires enter and leave back to back,
// which would play and instantly rewind. Only mouse/pen drive it.
const isHoverPointer = (event: PointerEvent) => event.pointerType !== 'touch'

const LINE_EASING = 'cubic-bezier(0.65, 0, 0.35, 1)' // ease-in-out
const STILL_LINE_DURATION = 600 // ms, cards without a sequence

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

// Which side of the card the pointer is on, by horizontal position.
const sideOf = (event: PointerEvent<HTMLElement>) => {
  const rect = event.currentTarget.getBoundingClientRect()
  return event.clientX < rect.left + rect.width / 2 ? 'left' : 'right'
}

export default function ServiceCard({ image, frames, fps, title, text }: ServiceItem) {
  const [hovered, setHovered] = useState(false)
  const hasSequence = Boolean(frames?.length)
  const fillRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<Animation | null>(null)

  // The hover line runs for exactly as long as the sequence takes to play
  // through (same fps default as FrameSequence), so both finish together.
  const lineDuration = hasSequence ? ((frames!.length - 1) / (fps ?? 60)) * 1000 : STILL_LINE_DURATION

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
    // Scale time by the distance left to travel, like the sequence reversing
    // from its current frame.
    const distance = Math.max(Math.abs(target[0] - from[0]), Math.abs(target[1] - from[1]))
    el.style.transform = toTransform(target)
    animRef.current = el.animate([{ transform: toTransform(from) }, { transform: toTransform(target) }], {
      duration: reduceMotion ? 0 : lineDuration * distance,
      easing: LINE_EASING,
    })
  }

  const onEnter = (event: PointerEvent<HTMLDivElement>) => {
    if (!isHoverPointer(event)) return
    setHovered(true)
    const edge = sideOf(event) === 'left' ? 0 : 1
    animateLine([0, 1], [edge, edge])
  }

  const onLeave = (event: PointerEvent<HTMLDivElement>) => {
    if (!isHoverPointer(event)) return
    setHovered(false)
    const edge = sideOf(event) === 'left' ? 0 : 1
    animateLine([edge, edge])
  }

  return (
    <div className="service-card" onPointerEnter={onEnter} onPointerLeave={onLeave}>
      <div className="service-card-line">
        <div className="service-card-line-fill" ref={fillRef} />
      </div>
      <div className="service-card-image-wrap">
        {hasSequence ? (
          <FrameSequence
            className="service-card-image service-card-sequence"
            frames={frames!}
            fps={fps}
            playing={hovered}
            label={title}
          />
        ) : (
          image && (
            <img className="service-card-image" src={image} alt={title} width={200} height={200} loading="lazy" />
          )
        )}
      </div>
      <h3 className="heading heading-4 font-zero service-card-title">{title}</h3>
      <p className="service-card-text">{text}</p>
    </div>
  )
}
