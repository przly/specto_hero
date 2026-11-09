import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react'

/* Dev: the scroll position where text reveals start, shared by every
   RevealText on the site (passed in as `triggerMargin`, so RevealText itself
   stays a drop-in copy of the engine). Same idea and storage keys as the
   Specto_TextReveal demo: a negative offset moves the trigger line up from
   the bottom of the viewport. Saved per browser. */

// v2: the default moved from 0 to -100px; a new key so a value saved under
// the old default doesn't hide the new one.
const OFFSET_KEY = 'specto-trigger-y-offset-v2'
const GUIDE_KEY = 'specto-show-trigger-guide'
const REPLAY_KEY = 'specto-reveal-replay'
const DIAGONAL_ARROW_KEY = 'specto-arrow-push-diagonal'

/** Every text reveal on the site plays this many times faster than the
 *  Specto_TextReveal engine timings (title 1.6s, body 1.3s, and their
 *  staggers): each page divides its duration and stagger by it.
 *  1 = the engine's default speed. */
export const REVEAL_SPEED = 1

/** Default trigger line: 100px above the bottom of the viewport. */
export const TRIGGER_OFFSET_DEFAULT = -100
export const TRIGGER_OFFSET_MIN = -400
export const TRIGGER_OFFSET_MAX = 0

function read<T>(key: string, parse: (v: string) => T, fallback: T): T {
  try {
    const v = window.localStorage.getItem(key)
    return v === null ? fallback : parse(v)
  } catch {
    return fallback
  }
}

let offset = read(
  OFFSET_KEY,
  (v) => (Number.isFinite(Number(v)) ? Number(v) : TRIGGER_OFFSET_DEFAULT),
  TRIGGER_OFFSET_DEFAULT,
)
let showGuide = read(GUIDE_KEY, (v) => v === 'true', true)
let replay = read(REPLAY_KEY, (v) => v === 'true', true)
let diagonalArrow = read(DIAGONAL_ARROW_KEY, (v) => v === 'true', false)
const listeners = new Set<() => void>()

const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

const emit = () => listeners.forEach((fn) => fn())

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Private mode / blocked storage: keep it for this session only.
  }
}

export function setTriggerOffset(value: number) {
  offset = Math.min(TRIGGER_OFFSET_MAX, Math.max(TRIGGER_OFFSET_MIN, Math.round(value)))
  write(OFFSET_KEY, String(offset))
  emit()
}

export function setShowTriggerGuide(value: boolean) {
  showGuide = value
  write(GUIDE_KEY, String(value))
  emit()
}

export function setReplay(value: boolean) {
  replay = value
  write(REPLAY_KEY, String(value))
  emit()
}

/** Section-header arrow push, to compare: off = slides in from the left,
 *  on = comes in along its 45° diagonal (from the top left). */
export function setDiagonalArrow(value: boolean) {
  diagonalArrow = value
  write(DIAGONAL_ARROW_KEY, String(value))
  emit()
}

/** Px offset of the trigger line from the bottom of the viewport (≤ 0). */
export const useTriggerOffset = () => useSyncExternalStore(subscribe, () => offset, () => TRIGGER_OFFSET_DEFAULT)
export const useShowTriggerGuide = () => useSyncExternalStore(subscribe, () => showGuide, () => false)
export const useReplay = () => useSyncExternalStore(subscribe, () => replay, () => false)
export const useDiagonalArrow = () => useSyncExternalStore(subscribe, () => diagonalArrow, () => false)

/**
 * RevealText's trigger, for testing: true once the element's top crosses the
 * trigger line. With "Replay" on, it turns false again once you scroll back
 * up and the element has gone fully below the viewport (out of sight, so the
 * reset is never seen), ready to reveal again. Pass it as `isTriggered`, with
 * `hideDelay={0}` so it snaps back. With Replay off it fires once, like
 * RevealText's own trigger.
 */
export function useTestReveal<T extends HTMLElement>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null)
  const offset = useTriggerOffset()
  const canReplay = useReplay()
  const [visible, setVisible] = useState(false)

  // Reveal: the element's top crosses the trigger line.
  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true)
      },
      { rootMargin: `0px 0px ${offset}px 0px` },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [offset])

  // Reset (Replay): the element is entirely below the viewport again, i.e.
  // scrolled back up past it. Leaving off the top (scrolled past) keeps it.
  useEffect(() => {
    const node = ref.current
    if (!node || !canReplay) return

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting && entry.boundingClientRect.top >= (entry.rootBounds?.bottom ?? window.innerHeight))
        setVisible(false)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [canReplay])

  return [ref, visible]
}
