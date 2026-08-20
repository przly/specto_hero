import { useEffect, useRef } from 'react'
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

export default function Hero() {
  const videoRef = useRef<HTMLDivElement>(null)
  const mediaRef = useRef<HTMLVideoElement>(null)
  const prefersReducedMotion = useReducedMotion()

  // Autoplaying background footage is itself a motion effect — pause it for
  // users who've asked the OS to reduce motion.
  useEffect(() => {
    const media = mediaRef.current
    if (!media) return
    if (prefersReducedMotion) {
      media.pause()
    } else {
      media.play().catch(() => {})
    }
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
  const width = useTransform(extraInset, (v) => `calc(100% - ${v}px)`)

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
              style={{ y: imageParallaxY }}
            />
          </picture>
        </section>

        <motion.div className="hero-scroll-hint" style={{ y: imageParallaxY }}>
          <img className="hero-scroll-arrow" src={arrowDown} alt="" aria-hidden="true" />
          Get to know us!
        </motion.div>
      </div>

      <div className="hero-video-frame">
        <motion.div ref={videoRef} className="hero-video" style={{ width }}>
          <motion.video
            ref={mediaRef}
            className="hero-video-media"
            style={{ scale }}
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
