import { easeExpoOut } from '../RevealText'

/* Horizontal slide-in from off-screen left (the IntroText arrow push).
   Curve: the text reveal's expo-out, with an ease-in
   on its start so it doesn't jump off the line. Time is warped by
   `easeInTime` (a quadratic ramp over the first SLIDE_EASE_IN of the
   duration, then linear, joined smoothly) and fed to easeExpoOut, so the
   tail is the reveal's. */

const SLIDE_EASE_IN = 0.3
const SLIDE_SAMPLES = 60

const easeInTime = (t: number) => {
  const a = SLIDE_EASE_IN
  const g = t < a ? (t * t) / (2 * a) : t - a / 2
  return g / (1 - a / 2)
}

export const slideEase = (t: number) => easeExpoOut(easeInTime(t))

/** `translate` keyframes from `fromX` px to 0, sampled from slideEase. Play
 *  them with `easing: 'linear'` (WAAPI), so they run on the compositor. */
export function slideFrames(fromX: number): Keyframe[] {
  const frames: Keyframe[] = []
  for (let i = 0; i <= SLIDE_SAMPLES; i++) {
    frames.push({ translate: `${fromX * (1 - slideEase(i / SLIDE_SAMPLES))}px 0` })
  }
  return frames
}

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
