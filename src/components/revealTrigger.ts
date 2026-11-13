import { useEffect, useRef, useState, type RefObject } from 'react'

/** Every text reveal on the site plays this many times faster than the
 *  Specto_TextReveal engine timings (title 1.6s, body 1.3s, and their
 *  staggers): each page divides its duration and stagger by it.
 *  1 = the engine's default speed. */
export const REVEAL_SPEED = 1

/** Trigger line, shared by every reveal on the site: 40px above the bottom
 *  of the viewport (a negative bottom rootMargin). */
const TRIGGER_OFFSET = -40

/**
 * RevealText's trigger: true once the element's top crosses the trigger
 * line. It turns false again once you scroll back up and the element has
 * gone fully below the viewport (out of sight, so the reset is never seen),
 * ready to reveal again. Pass it as `isTriggered`, with `hideDelay={0}` so it
 * snaps back.
 *
 * `raise` moves the trigger line that many px further up the viewport for
 * this reveal only. `target` watches an element another reveal already holds
 * the ref of, so two reveals can share an element with different lines.
 */
export function useTestReveal<T extends HTMLElement>(
  raise = 0,
  target?: RefObject<T | null>,
): [RefObject<T | null>, boolean] {
  const ownRef = useRef<T>(null)
  const ref = target ?? ownRef
  const [visible, setVisible] = useState(false)

  // Reveal: the element's top crosses the trigger line.
  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true)
      },
      { rootMargin: `0px 0px ${TRIGGER_OFFSET - raise}px 0px` },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [ref, raise])

  // Reset: the element is entirely below the viewport again, i.e.
  // scrolled back up past it. Leaving off the top (scrolled past) keeps it.
  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting && entry.boundingClientRect.top >= (entry.rootBounds?.bottom ?? window.innerHeight))
        setVisible(false)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [ref])

  return [ref, visible]
}
