import { useEffect, useRef } from 'react'

/* Plays a short video forward / backward, driven by `playing`.
   `playing` true  → plays forward to the last frame and holds.
   `playing` false → runs backward to the first frame and holds.
   Flipping mid-way reverses from the current frame, so a quick hover-in /
   hover-out never jumps.

   <video> can't play in reverse, so going back is a rAF loop that steps
   `currentTime` down (time-based, same speed at 60Hz and 120Hz). That only
   stays smooth when every frame is a keyframe, which is how the bundled
   videos in assets/services are encoded (`-g 1`). With
   prefers-reduced-motion the first frame stays put. */

type HoverVideoProps = {
  src: string
  playing: boolean
  /** Playback speed, 1 = the video's own frame rate. */
  rate?: number
  className?: string
  label?: string
  onDuration?: (seconds: number) => void
}

export default function HoverVideo({ src, playing, rate = 1, className, label, onDuration }: HoverVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const stopRewind = () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    if (playing) {
      video.playbackRate = rate
      // play() restarts from 0 once ended; we want to hold the last frame.
      if (!video.ended) video.play().catch(() => {})
      return () => {
        video.pause()
      }
    }

    video.pause()
    let last: number | null = null
    let target = video.currentTime

    const tick = (time: number) => {
      const dt = Math.min((time - (last ?? time)) / 1000, 0.1) // clamp after tab switches
      last = time
      target = Math.max(0, target - dt * rate)
      // Don't queue seeks: skip this frame if the previous one is still decoding.
      if (!video.seeking) video.currentTime = target
      rafRef.current = target > 0 || video.currentTime > 0 ? requestAnimationFrame(tick) : null
    }

    if (target > 0) rafRef.current = requestAnimationFrame(tick)
    return stopRewind
  }, [playing, rate, src])

  return (
    <video
      ref={videoRef}
      className={className}
      src={src}
      muted
      playsInline
      preload="auto"
      disablePictureInPicture
      aria-label={label}
      onLoadedMetadata={(e) => onDuration?.(e.currentTarget.duration)}
    />
  )
}
