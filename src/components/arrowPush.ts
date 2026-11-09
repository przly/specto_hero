import { useLayoutEffect, type RefObject } from 'react'
import { useDiagonalArrow } from './revealTrigger'
import { prefersReducedMotion, slideEase, slideFrames } from './slideIn'

/** Seconds for every arrow push (IntroText + section headers). Fixed, not
 *  tied to the text reveal speed. */
export const ARROW_PUSH_DURATION = 0.8

/* The section-header arrow points down-right (45°). It starts turned back by
   that, pointing straight at the title, and turns down into place as it
   pushes the title, on the same curve and timing as the slide. */
const ARROW_START_ROTATE = -45 // deg

/* With "Arrow 45°" on in the dev trigger panel, the arrow comes in along
   its 45° diagonal (from the top left: the same distance up as across)
   instead of straight from the left. The title is still pushed sideways. */
const startTranslate = (fromX: number, diagonal: boolean) => `${fromX}px ${diagonal ? fromX : 0}px`

function arrowFrames(fromX: number, fromDeg: number, diagonal: boolean): Keyframe[] {
  const frames = slideFrames(fromX)
  return frames.map((_, i) => {
    const left = 1 - slideEase(i / (frames.length - 1))
    return { translate: startTranslate(fromX * left, diagonal), rotate: `${fromDeg * left}deg` }
  })
}

/* Section-header arrow push, the same move as the IntroText arrow below the
   hero video: the title reveals flush left (shifted back over the arrow's
   spot), then the arrow slides in from just past the viewport's left edge
   and pushes the title out to its place, turning from pointing at the title
   to its resting 45°. Both travel together on the shared
   slide-in curve (slideIn.ts), as WAAPI animations on the compositor.

   `rowRef` is the flex row holding the arrow (first child) and the
   RevealText title. While hidden, both sit at their start state (inline
   `translate`); cancelling on hide drops back to it, so Replay works. */
export function useArrowPush(
  rowRef: RefObject<HTMLElement | null>,
  visible: boolean,
  { delay, duration }: { delay: number; duration: number },
) {
  const diagonal = useDiagonalArrow()

  useLayoutEffect(() => {
    const row = rowRef.current
    const arrow = row?.firstElementChild as (HTMLElement | SVGElement) | null
    const title = row?.querySelector<HTMLElement>(':scope > .specto-paragraph-wrap')
    if (!row || !arrow || !title || prefersReducedMotion()) return

    // Resting layout (no translate), then the distances to travel.
    arrow.style.translate = ''
    arrow.style.rotate = ''
    title.style.translate = ''
    const arrowRect = arrow.getBoundingClientRect()
    const indent = title.getBoundingClientRect().left - arrowRect.left
    // Just out of view past the viewport's left edge.
    const from = -(arrowRect.right + 8)

    arrow.style.translate = startTranslate(from, diagonal)
    arrow.style.rotate = `${ARROW_START_ROTATE}deg`
    title.style.translate = `${-indent}px 0`
    if (!visible) return

    const timing: KeyframeAnimationOptions = {
      duration: duration * 1000,
      delay: delay * 1000,
      easing: 'linear',
      fill: 'both',
    }
    const animations = [
      arrow.animate(arrowFrames(from, ARROW_START_ROTATE, diagonal), timing),
      title.animate(slideFrames(-indent), timing),
    ]
    return () => animations.forEach((a) => a.cancel())
  }, [rowRef, visible, delay, duration, diagonal])
}
