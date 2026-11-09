import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { motion, useMotionValue, useReducedMotion, useScroll, useTransform } from 'motion/react'
import heroText from '../assets/hero-text.png'
import heroTextWebp from '../assets/hero-text.webp'
import arrowDown from '../assets/arrow-down.svg'
import heroVideo from '../assets/hero-video.mp4'
import './Hero.css'

// Reference: Figma "Initial State" (node 5370:9133) -> "Scrolled into view" (node 5370:9124)
// The frame keeps a fixed 24px page margin; this extra inset (split across both
// sides) shrinks it further to reach the 72px pre-scroll margin, then eases to 0.
const INITIAL_EXTRA_INSET = 96
const FINAL_EXTRA_INSET = 0
const INITIAL_ZOOM = 1.4
const FINAL_ZOOM = 1
const IMAGE_PARALLAX_FACTOR = 0.15 // 0 = pinned in place, 1 = scrolls at normal speed
// .hero-video border-radius (Hero.css), kept constant on screen while the
// frame is scaled down (see `frameScale` below).
const FRAME_RADIUS = 24

type AnimationTimelineCtor = new (options: { source: Element; axis: 'block' }) => AnimationTimeline

function supportsScrollTimeline() {
  return typeof window !== 'undefined' && 'ScrollTimeline' in window
}

// Keyframe samples across the frame's scroll range: the radius follows
// 1 / scale, so it isn't linear and needs points in between.
const RANGE_SAMPLES = 24

/* The hero's scroll effects as native scroll-driven animations on the
   document's scroll timeline, with exactly the maths of the Motion
   fallback in Hero():
   - image + hint: translateY(scrollY × IMAGE_PARALLAX_FACTOR);
   - frame: progress 0 → 1 between "frame top 24px above the viewport
     bottom" and "frame top at 40% of the viewport" (useScroll's
     ['24px end', 'start 40%']), clamped; scale and radius from it;
   - video: zoom from the same progress.
   Keyframe offsets are scroll positions / max scroll, so they're rebuilt
   whenever the page height, the frame width or the viewport changes.
   Transforms run on the compositor; the radius (paint only) is its own
   animation so it doesn't pull the transforms back to the main thread. */
function useNativeScrollEffects(
  enabled: boolean,
  refs: {
    frame: RefObject<HTMLDivElement | null>
    media: RefObject<HTMLVideoElement | null>
    image: RefObject<HTMLImageElement | null>
    hint: RefObject<HTMLDivElement | null>
  },
) {
  useLayoutEffect(() => {
    const { frame: frameRef, media: mediaRef, image: imageRef, hint: hintRef } = refs
    const frame = frameRef.current
    const media = mediaRef.current
    const image = imageRef.current
    const hint = hintRef.current
    if (!enabled || !frame || !media || !image || !hint) return

    const root = document.documentElement
    const Timeline = (window as unknown as { ScrollTimeline: AnimationTimelineCtor }).ScrollTimeline
    const timeline = new Timeline({ source: root, axis: 'block' })
    let animations: Animation[] = []

    const build = () => {
      animations.forEach((a) => a.cancel())
      animations = []

      const viewport = root.clientHeight
      const max = root.scrollHeight - viewport
      const width = frame.offsetWidth
      if (max <= 0 || width <= 0) return

      // Frame top in the document (layout position; the scale's origin is
      // the top edge, so it doesn't move it anyway).
      const top = frame.getBoundingClientRect().top + window.scrollY
      const start = top + 24 - viewport
      const end = top - viewport * 0.4
      const progressAt = (y: number) => Math.min(1, Math.max(0, (y - start) / (end - start)))
      const scaleAt = (p: number) => Math.max(0, width - (INITIAL_EXTRA_INSET + (FINAL_EXTRA_INSET - INITIAL_EXTRA_INSET) * p)) / width
      const zoomAt = (p: number) => INITIAL_ZOOM + (FINAL_ZOOM - INITIAL_ZOOM) * p

      // Scroll positions to sample: the page ends plus the range itself.
      const ys = [0, max]
      for (let i = 0; i <= RANGE_SAMPLES; i++) ys.push(start + ((end - start) * i) / RANGE_SAMPLES)
      const points = [...new Set(ys.filter((y) => y >= 0 && y <= max))].sort((a, b) => a - b)

      const frameScale: Keyframe[] = []
      const frameRadius: Keyframe[] = []
      const zoom: Keyframe[] = []
      for (const y of points) {
        const offset = y / max
        const p = progressAt(y)
        const s = scaleAt(p)
        frameScale.push({ offset, transform: `scale(${s})` })
        frameRadius.push({ offset, borderRadius: `${FRAME_RADIUS / (s || 1)}px` })
        zoom.push({ offset, transform: `scale(${zoomAt(p)})` })
      }
      const parallax: Keyframe[] = [
        { offset: 0, transform: 'translateY(0px)' },
        { offset: 1, transform: `translateY(${max * IMAGE_PARALLAX_FACTOR}px)` },
      ]

      const timing = { timeline, duration: 'auto', easing: 'linear', fill: 'both' } as unknown as KeyframeAnimationOptions
      animations = [
        frame.animate(frameScale, timing),
        frame.animate(frameRadius, timing),
        media.animate(zoom, timing),
        image.animate(parallax, timing),
        hint.animate(parallax, timing),
      ]
    }

    let pending: number | null = null
    const schedule = () => {
      if (pending === null) pending = requestAnimationFrame(() => {
        pending = null
        build()
      })
    }

    build()
    // Page height (content loading in below), frame width and viewport.
    const observer = new ResizeObserver(schedule)
    observer.observe(document.body)
    observer.observe(frame)
    window.addEventListener('resize', schedule)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', schedule)
      if (pending !== null) cancelAnimationFrame(pending)
      animations.forEach((a) => a.cancel())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])
}

export default function Hero() {
  const videoRef = useRef<HTMLDivElement>(null)
  const mediaRef = useRef<HTMLVideoElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const hintRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()
  // Browsers with scroll-driven animations (Chrome 115+, Safari 26+) run all
  // three scroll effects natively (useNativeScrollEffects below), in step
  // with the scroll itself. Motion's values (below) are the fallback: they
  // update from scroll events on the main thread, a frame behind the page,
  // which reads as judder.
  const native = !prefersReducedMotion && supportsScrollTimeline()
  useNativeScrollEffects(native, { frame: videoRef, media: mediaRef, image: imageRef, hint: hintRef })

  // Autoplaying background footage is itself a motion effect — pause it for
  // users who've asked the OS to reduce motion. It also pauses while it's
  // scrolled out of view, so it isn't decoding frames nobody sees.
  useEffect(() => {
    const media = mediaRef.current
    if (!media) return
    if (prefersReducedMotion) {
      media.pause()
      return
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) media.play().catch(() => {})
      else media.pause()
    })
    observer.observe(media)
    return () => observer.disconnect()
  }, [prefersReducedMotion])

  // Progress 0 -> 1 as the video scrolls up from just below the viewport to
  // resting near the top — no pinning, the page just keeps scrolling normally.
  // "24px end" (rather than "start end") means progress starts once the top
  // 24px of the video is already poking above the bottom of the viewport.
  const { scrollYProgress } = useScroll({
    target: videoRef,
    offset: ['24px end', 'start 40%'],
  })

  // With prefers-reduced-motion, pin every scroll-linked value to its resting
  // state instead of unsubscribing the hooks (keeps hook order stable).
  const restingProgress = useMotionValue(1)
  const progress = prefersReducedMotion ? restingProgress : scrollYProgress

  // Whole-page scroll, used to push the hero image and hint back visually as
  // one plane: both are nudged down by a fraction of the scroll distance, so
  // they only travel at IMAGE_PARALLAX_FACTOR of normal speed — reads as
  // sitting further back, together.
  const { scrollY } = useScroll()
  const restingScrollY = useMotionValue(0)
  const effectiveScrollY = prefersReducedMotion ? restingScrollY : scrollY
  const imageParallaxY = useTransform(effectiveScrollY, (y) => y * IMAGE_PARALLAX_FACTOR)

  const extraInset = useTransform(
    progress,
    [0, 1],
    [INITIAL_EXTRA_INSET, FINAL_EXTRA_INSET],
  )
  // The frame narrows by `extraInset`, drawn as a uniform scale of the
  // full-width frame (top centre) instead of animating `width`: same size on
  // screen, but compositor-only. Animating width re-laid out the whole page
  // on every scroll frame (its 16:9 height changed too). The radius is
  // divided by the scale so it stays 24px on screen. The content below sits
  // at its final position from the start, which is out of view while this
  // runs (the frame is taller than the rest of the viewport).
  const frameWidth = useMotionValue(0)
  // Explicit inputs: the computed form (useTransform(() => …)) missed the
  // width arriving after its first run and stayed at scale 1.
  const frameScale = useTransform([frameWidth, extraInset], ([w, inset]: number[]) =>
    w > 0 ? Math.max(0, w - inset) / w : 1,
  )
  const frameRadius = useTransform(frameScale, (s) => `${FRAME_RADIUS / (s || 1)}px`)
  // Measured in an effect declared after the transforms above, so it runs
  // once they're subscribed (a width set earlier went unnoticed until the
  // first scroll, leaving the frame full width at the top of the page).
  useEffect(() => {
    const frame = videoRef.current
    if (!frame) return
    const measure = () => frameWidth.set(frame.offsetWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [frameWidth])

  // Video footage starts zoomed in 10% and eases back to its normal scale as
  // the frame widens, clipped by the frame's own rounded corners/overflow.
  const scale = useTransform(progress, [0, 1], [INITIAL_ZOOM, FINAL_ZOOM])

  return (
    <div className="hero">
      {/* Reserves (100vh - 48px) total, split between the centered image and
          the hint row below it. This must stay a sibling of hero-video-frame
          (not a wrapper around it) — nesting the video inside it made its own
          height push past the min-height, leaving flex no slack to center
          the image and pulling the video far up the page. */}
      <div className="hero-intro">
        <section className="hero-copy-section">
          <picture>
            <source srcSet={heroTextWebp} type="image/webp" />
            <motion.img
              className="hero-copy-image"
              src={heroText}
              width={2694}
              height={1464}
              alt="We're not an agency. We're Specto."
              fetchPriority="high"
              decoding="async"
              ref={imageRef}
              style={native ? undefined : { y: imageParallaxY }}
            />
          </picture>
        </section>

        <motion.div
          ref={hintRef}
          className="hero-scroll-hint"
          style={native ? undefined : { y: imageParallaxY }}
        >
          <img className="hero-scroll-arrow" src={arrowDown} alt="" aria-hidden="true" />
          Get to know us!
        </motion.div>
      </div>

      <div className="hero-video-frame">
        <motion.div
          ref={videoRef}
          className="hero-video"
          style={native ? undefined : { scale: frameScale, borderRadius: frameRadius }}
        >
          <motion.video
            ref={mediaRef}
            className="hero-video-media"
            style={native ? undefined : { scale }}
            src={heroVideo}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            disableRemotePlayback
            aria-hidden="true"
          />
        </motion.div>
      </div>
    </div>
  )
}
