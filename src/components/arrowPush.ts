import { useLayoutEffect, type RefObject } from 'react'
import { prefersReducedMotion, slideFrames } from './slideIn'

/** Seconds for every arrow push (IntroText + section headers). Fixed, not
 *  tied to the text reveal speed. */
export const ARROW_PUSH_DURATION = 0.8

/* Section-header arrow push, the same move as the IntroText arrow below the
   hero video: the title reveals flush left (shifted back over the arrow's
   spot), then the arrow slides in from just past the viewport's left edge
   and pushes the title out to its place. Both travel together on the shared
   slide-in curve (slideIn.ts), as WAAPI animations on the compositor.

   `rowRef` is the flex row holding the arrow (first child) and the
   RevealText title. While hidden, both sit at their start state (inline
   `translate`); cancelling on hide drops back to it, so Replay works. */
export function useArrowPush(
  rowRef: RefObject<HTMLElement | null>,
  visible: boolean,
  { delay, duration }: { delay: number; duration: number },
) {
  useLayoutEffect(() => {
    const row = rowRef.current
    const arrow = row?.firstElementChild as (HTMLElement | SVGElement) | null
    const title = row?.querySelector<HTMLElement>(':scope > .specto-paragraph-wrap')
    if (!row || !arrow || !title || prefersReducedMotion()) return

    // Resting layout (no translate), then the distances to travel.
    arrow.style.translate = ''
    title.style.translate = ''
    const arrowRect = arrow.getBoundingClientRect()
    const indent = title.getBoundingClientRect().left - arrowRect.left
    // Just out of view past the viewport's left edge.
    const from = -(arrowRect.right + 8)

    arrow.style.translate = `${from}px 0`
    title.style.translate = `${-indent}px 0`
    if (!visible) return

    const timing: KeyframeAnimationOptions = {
      duration: duration * 1000,
      delay: delay * 1000,
      easing: 'linear',
      fill: 'both',
    }
    const animations = [arrow.animate(slideFrames(from), timing), title.animate(slideFrames(-indent), timing)]
    return () => animations.forEach((a) => a.cancel())
  }, [rowRef, visible, delay, duration])
}
