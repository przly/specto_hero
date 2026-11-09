import {
  setReplay,
  setShowTriggerGuide,
  setTriggerOffset,
  TRIGGER_OFFSET_MAX,
  TRIGGER_OFFSET_MIN,
  useReplay,
  useShowTriggerGuide,
  useTriggerOffset,
} from './revealTrigger'
import './TriggerGuide.css'

/* Dev: shows where text reveals trigger (a line across the viewport) and
   lets you move it. A reveal starts when the top of its text crosses this
   line while scrolling down; with Replay on it resets once it has scrolled
   back down out of the viewport, so it can be watched again. */
export default function TriggerGuide() {
  const offset = useTriggerOffset()
  const show = useShowTriggerGuide()
  const replay = useReplay()

  return (
    <>
      {show && (
        <div className="trigger-guide" aria-hidden="true" style={{ bottom: -offset }}>
          <span className="trigger-guide-label">Trigger line · {offset}px</span>
        </div>
      )}

      <div className="trigger-panel">
        <label className="trigger-panel-toggle">
          <input type="checkbox" checked={show} onChange={(e) => setShowTriggerGuide(e.target.checked)} />
          Trigger line
        </label>
        <input
          className="trigger-panel-slider"
          type="range"
          min={TRIGGER_OFFSET_MIN}
          max={TRIGGER_OFFSET_MAX}
          step={1}
          value={offset}
          onChange={(e) => setTriggerOffset(Number(e.target.value))}
          aria-label="Trigger offset from the bottom of the screen"
        />
        <output className="trigger-panel-value">{offset}px</output>
        <label className="trigger-panel-toggle">
          <input type="checkbox" checked={replay} onChange={(e) => setReplay(e.target.checked)} />
          Replay
        </label>
      </div>
    </>
  )
}
