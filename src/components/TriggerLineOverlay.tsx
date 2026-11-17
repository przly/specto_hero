import { useLocation } from 'react-router-dom'
import { useTriggerOffset } from './revealTrigger'

/** Debug only: add `?lines` to the URL to draw the reveal trigger lines
 *  fixed over the page. Renders nothing otherwise. */
export default function TriggerLineOverlay() {
  const { search } = useLocation()
  const offset = useTriggerOffset()
  if (!new URLSearchParams(search).has('lines')) return null

  const lines = [
    { bottom: offset, label: `Trigger line: ${offset}px`, color: '#ff2d55' },
  ]

  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 2147483647 }}>
      {lines.map((l) => (
        <div
          key={l.label}
          style={{ position: 'absolute', left: 0, right: 0, bottom: l.bottom, borderTop: `1px dashed ${l.color}` }}
        >
          <span
            style={{
              position: 'absolute',
              right: 8,
              bottom: 4,
              font: '500 11px/1 ui-monospace, monospace',
              color: '#fff',
              background: l.color,
              padding: '3px 6px',
              borderRadius: 4,
            }}
          >
            {l.label}
          </span>
        </div>
      ))}
    </div>
  )
}
