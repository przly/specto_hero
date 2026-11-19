import { useEffect, useRef, useState } from 'react'
import SiteHeader from '../components/SiteHeader'
import introVideo from '../assets/intro/intro.mp4'
import IntroLogo from '../components/IntroLogo'
import './IntroPage.css'

// Minimum time the logo is up before the video starts playing (ms), counted
// from when the page opens.
const FIRST_FRAME_HOLD = 1000

// Fraction of the video's duration at which the navbar starts sliding in.
const HEADER_IN_AT = 0.5

// Intro animation. The black logo reveals at once (mark and letters on the
// page's per-word text engine) on a background matching the video's first
// frame, and stays until the video has fully downloaded and the logo has been
// up for at least FIRST_FRAME_HOLD. Then the video plays and the logo fades.
// The video plays once; halfway through, the navbar slides in from above the
// top edge of the browser. The source is square, so sizing it to the viewport's
// longer side covers the whole screen and crops the overflow on the shorter
// side equally.
export default function IntroPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [showHeader, setShowHeader] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [videoSrc, setVideoSrc] = useState<string>()
  const mountedAt = useRef(0)

  // Download the whole video before it's shown, so playback never stalls
  // partway through. The logo is up meanwhile, on the matching background.
  // If the download fails, fall back to streaming the file.
  useEffect(() => {
    mountedAt.current = performance.now()
    let url: string | undefined
    let cancelled = false
    fetch(introVideo)
      .then((res) => (res.ok ? res.blob() : Promise.reject(new Error(String(res.status)))))
      .then((blob) => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setVideoSrc(url)
      })
      .catch(() => {
        if (!cancelled) setVideoSrc(introVideo)
      })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [])

  // Play once the fully loaded video's first frame is on screen, but not
  // before the logo has been up for FIRST_FRAME_HOLD (counted from mount).
  useEffect(() => {
    const video = videoRef.current
    if (!video || !videoSrc) return

    let timer: number | undefined
    const startHold = () => {
      const elapsed = performance.now() - mountedAt.current
      timer = window.setTimeout(() => {
        video.play().catch(() => {})
      }, Math.max(0, FIRST_FRAME_HOLD - elapsed))
    }

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) startHold()
    else video.addEventListener('loadeddata', startHold, { once: true })

    return () => {
      video.removeEventListener('loadeddata', startHold)
      window.clearTimeout(timer)
    }
  }, [videoSrc])

  return (
    <main className={showHeader ? 'intro-page is-header-in' : 'intro-page'}>
      <video
        ref={videoRef}
        className="intro-video"
        src={videoSrc}
        muted
        playsInline
        preload="auto"
        onPlaying={() => setIsPlaying(true)}
        onTimeUpdate={(event) => {
          const video = event.currentTarget
          if (video.duration && video.currentTime >= video.duration * HEADER_IN_AT) setShowHeader(true)
        }}
        onEnded={() => setShowHeader(true)}
      />
      {/* Solid fill over the video while it loads; fades out as it plays. */}
      <div className={isPlaying ? 'intro-cover is-out' : 'intro-cover'} aria-hidden="true" />
      <IntroLogo
        className="intro-logo"
        state={isPlaying ? 'exit' : 'visible'}
      />
      <SiteHeader />
    </main>
  )
}
