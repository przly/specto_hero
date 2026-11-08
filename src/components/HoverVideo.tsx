import { useEffect, useRef, useState } from 'react'
import './HoverVideo.css'

/* Plays a short video forward / backward, driven by `playing`.
   `playing` true  → plays forward to the last frame and holds.
   `playing` false → runs backward to the first frame and holds.
   Flipping mid-way reverses from the current frame, so a quick hover-in /
   hover-out never jumps.

   Safari plays in reverse natively (negative playbackRate), so it uses that.
   Elsewhere <video> can't play in reverse, so going back is a rAF loop that steps
   `currentTime` down (time-based, same speed at 60Hz and 120Hz). That only
   stays smooth when every frame is a keyframe, which is how the bundled
   videos in assets/services are encoded (`-g 1`). With
   prefers-reduced-motion the first frame stays put.

   `poster` is drawn as our own <img> over the video, not the video's poster
   attribute: iOS drops that attribute the moment play() is called, before
   the first frame is decoded (slow after a hard refresh), so it blinked.
   The <img> stays until the video has actually presented a frame. It's the
   video's first frame, so the swap is invisible. `className` sizes the
   wrapper; video and image fill it. */

type HoverVideoProps = {
  src: string
  /** The video's first frame, shown until the video has drawn one itself
      (iOS draws nothing for a video that hasn't played). */
  poster?: string
  playing: boolean
  /** Playback speed, 1 = the video's own frame rate. */
  rate?: number
  className?: string
  label?: string
  onDuration?: (seconds: number) => void
}

// Only Safari/WebKit plays backwards (negative playbackRate). Chrome throws
// on it; Firefox accepts the value but doesn't play in reverse, so it's
// excluded and both use the seek loop instead.
let reverseSupport: boolean | undefined
function supportsReverse() {
  if (reverseSupport !== undefined) return reverseSupport
  reverseSupport = false
  if (/Firefox\//.test(navigator.userAgent)) return reverseSupport
  try {
    const probe = document.createElement('video')
    probe.playbackRate = -1
    reverseSupport = probe.playbackRate < 0
  } catch {
    // NotSupportedError: no reverse playback
  }
  return reverseSupport
}

export default function HoverVideo({ src, poster, playing, rate = 1, className, label, onDuration }: HoverVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const rafRef = useRef<number | null>(null)
  // The in-flight play() promise, so the rewind can wait for it to settle.
  const playRef = useRef<Promise<void> | null>(null)
  // The video has presented a frame of its own, so the poster can go.
  const [hasFrame, setHasFrame] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !poster || hasFrame) return
    if ('requestVideoFrameCallback' in video) {
      const id = video.requestVideoFrameCallback(() => setHasFrame(true))
      return () => video.cancelVideoFrameCallback(id)
    }
    // No frame callback: the clock moving means frames are being drawn.
    const onTime = () => {
      if (video.currentTime > 0) setHasFrame(true)
    }
    video.addEventListener('timeupdate', onTime)
    return () => video.removeEventListener('timeupdate', onTime)
  }, [poster, hasFrame])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const stopRewind = () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    // Safari: native reverse playback. Set the direction before play(), so a
    // video that ended forward reverses from its last frame instead of
    // restarting. Safari pauses on its own when it reaches the first frame.
    if (supportsReverse()) {
      if (!playing && video.currentTime === 0 && video.paused) return
      video.playbackRate = playing ? rate : -rate
      if (!(playing && video.ended)) video.play().catch(() => {})
      return
    }

    if (playing) {
      video.playbackRate = rate
      // play() restarts from 0 once ended; we want to hold the last frame.
      if (!video.ended) {
        const pending = video.play().catch(() => {})
        playRef.current = pending
        pending.then(() => {
          if (playRef.current === pending) playRef.current = null
        })
      }
      // No pause here: the rewind branch below pauses once play() settles.
      return
    }

    let cancelled = false
    let last: number | null = null
    let target = 0
    let forcedFinalSeek = false

    const tick = (time: number) => {
      const dt = Math.min((time - (last ?? time)) / 1000, 0.1) // clamp after tab switches
      last = time
      // On a very quick hover, play() can still advance a few frames after
      // pause(), so the currentTime read above is stale (often 0). Only we
      // seek here, so a settled video ahead of `target` moved on its own:
      // pick up from where it really is.
      if (!video.seeking && video.currentTime > target + 0.001) target = video.currentTime
      target = Math.max(0, target - dt * rate)
      // Don't queue seeks: skip this frame if the previous one is still decoding.
      if (!video.seeking && video.currentTime !== target) video.currentTime = target
      // Safari can report currentTime 0 while still showing a later frame, so
      // the skip above never seeks. Always seek to 0 once at the end to repaint.
      if (target === 0 && !video.seeking && !forcedFinalSeek) {
        forcedFinalSeek = true
        video.currentTime = 0
      }
      // Keep going until the video has actually settled on the first frame.
      const done = forcedFinalSeek && !video.seeking && video.currentTime === 0
      rafRef.current = done ? null : requestAnimationFrame(tick)
    }

    // Safari keeps decoding a few frames when pause() lands while play() is
    // still pending, and its currentTime then lags behind what's on screen.
    // Wait for play() to settle so pause() stops a video that really is
    // playing, and currentTime is accurate.
    Promise.resolve(playRef.current).then(() => {
      if (cancelled) return
      video.pause()
      target = video.currentTime
      // Always start the loop, even if currentTime reads 0 right now.
      rafRef.current = requestAnimationFrame(tick)
    })

    return () => {
      cancelled = true
      stopRewind()
    }
  }, [playing, rate, src])

  return (
    <div className={['hover-video', className].filter(Boolean).join(' ')}>
      <video
        ref={videoRef}
        className="hover-video-media"
        src={src}
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        aria-label={label}
        onLoadedMetadata={(e) => onDuration?.(e.currentTarget.duration)}
      />
      {poster && !hasFrame && <img className="hover-video-media" src={poster} alt="" aria-hidden="true" />}
    </div>
  )
}
