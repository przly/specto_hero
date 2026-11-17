import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react'
import { useLocation } from 'react-router-dom'

/** Every text reveal on the site plays this many times faster than the
 *  Specto_TextReveal engine timings (title 1.6s, body 1.3s, and their
 *  staggers): each page divides its duration and stagger by it.
 *  1 = the engine's default speed. */
export const REVEAL_SPEED = 1

/** Trigger line, shared by every reveal on the site: 40px above the bottom
 *  of the viewport. On the homepage on desktop (1024px and up) it sits
 *  100px higher, 140px above the bottom. */
const TRIGGER_OFFSET = 40
const HOME_DESKTOP_RAISE = 100
const DESKTOP_QUERY = '(min-width: 1024px)'

function useIsDesktop() {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(DESKTOP_QUERY)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => true,
  )
}

/** The site's trigger line, in px above the bottom of the viewport, for the
 *  current page and screen width. */
export function useTriggerOffset() {
  const { pathname } = useLocation()
  const isDesktop = useIsDesktop()
  return TRIGGER_OFFSET + (pathname === '/' && isDesktop ? HOME_DESKTOP_RAISE : 0)
}

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
  const offset = useTriggerOffset()

  // Reveal: the element's top crosses the trigger line.
  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true)
      },
      { rootMargin: `0px 0px ${-(offset + raise)}px 0px` },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [ref, raise, offset])

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
