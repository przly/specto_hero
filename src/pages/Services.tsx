import { useRef, useState, type CSSProperties, type MouseEvent, type MutableRefObject } from 'react'
import './Services.css'

const LINKS = ['Services', 'Branding', 'Web', 'Product', 'Motion', 'Strategy']
const COLUMN_COUNT = 4
const SPEED_OPTIONS = [0.1, 0.5, 1] as const

type Origin = 'left' | 'right'

function ServiceLink({
  label,
  originRef,
  resetSwitchesToLeft,
  isFirstLinkRef,
  columnRef,
}: {
  label: string
  originRef: MutableRefObject<Origin>
  resetSwitchesToLeft: boolean
  isFirstLinkRef: MutableRefObject<boolean>
  columnRef: MutableRefObject<HTMLDivElement | null>
}) {
  const underlineRef = useRef<HTMLSpanElement>(null)

  const handleEnter = (event: MouseEvent<HTMLAnchorElement>) => {
    const underline = underlineRef.current
    if (!underline) return

    let origin: Origin
    if (isFirstLinkRef.current) {
      const rect = event.currentTarget.getBoundingClientRect()
      const enteringFromLeft = event.clientX - rect.left < rect.width / 2
      origin = enteringFromLeft ? 'left' : 'right'
      originRef.current = origin
      isFirstLinkRef.current = false
    } else {
      origin = resetSwitchesToLeft ? 'left' : originRef.current
    }

    underline.style.transformOrigin = origin
  }

  const handleLeave = (event: MouseEvent<HTMLAnchorElement>) => {
    const underline = underlineRef.current
    if (!underline) return
    const rect = event.currentTarget.getBoundingClientRect()
    const exitingFromLeft = event.clientX - rect.left < rect.width / 2
    underline.style.transformOrigin = exitingFromLeft ? 'left' : 'right'

    const enteringElement = event.relatedTarget as Node | null
    const staysInColumn = !!enteringElement && !!columnRef.current?.contains(enteringElement)
    if (!staysInColumn) {
      isFirstLinkRef.current = true
    }
  }

  return (
    <a
      className="services-link"
      href="#"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {label}
      <span ref={underlineRef} className="services-link-underline" />
    </a>
  )
}

function ServiceColumn({ isFirstColumn }: { isFirstColumn: boolean }) {
  const originRef = useRef<Origin>('left')
  const isFirstLinkRef = useRef(true)
  const columnRef = useRef<HTMLDivElement>(null)

  return (
    <div className="services-column" ref={columnRef}>
      {LINKS.map((label) => (
        <ServiceLink
          key={label}
          label={label}
          originRef={originRef}
          resetSwitchesToLeft={isFirstColumn}
          isFirstLinkRef={isFirstLinkRef}
          columnRef={columnRef}
        />
      ))}
    </div>
  )
}

export default function Services() {
  const [motionScale, setMotionScale] = useState<number>(1)

  return (
    <div
      className="services-page"
      style={{ '--motion-scale': motionScale } as CSSProperties}
    >
      <div className="services-links">
        {Array.from({ length: COLUMN_COUNT }, (_, columnIndex) => (
          <ServiceColumn key={columnIndex} isFirstColumn={columnIndex === 0} />
        ))}
      </div>

      <div className="services-speed-controls">
        {SPEED_OPTIONS.map((speed) => (
          <button
            key={speed}
            type="button"
            className="services-speed-button"
            aria-pressed={motionScale === speed}
            onClick={() => setMotionScale(speed)}
          >
            {speed}x
          </button>
        ))}
      </div>
    </div>
  )
}
