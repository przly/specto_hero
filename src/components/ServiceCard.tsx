import { useState, type PointerEvent } from 'react'
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

export default function ServiceCard({ image, frames, fps, title, text }: ServiceItem) {
  const [hovered, setHovered] = useState(false)
  const hasSequence = Boolean(frames?.length)

  return (
    <div
      className="service-card"
      onPointerEnter={hasSequence ? (e) => isHoverPointer(e) && setHovered(true) : undefined}
      onPointerLeave={hasSequence ? (e) => isHoverPointer(e) && setHovered(false) : undefined}
    >
      <div className="service-card-line" />
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
