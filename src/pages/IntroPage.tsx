import { useEffect, useRef, useState } from 'react'
import SiteHeader from '../components/SiteHeader'
import introVideo from '../assets/intro/intro.mp4'
import logoBlack from '../assets/specto-logo-black.svg'
import './IntroPage.css'

// How long the first frame is held before the video starts playing (ms).
const FIRST_FRAME_HOLD = 1000

// Fraction of the video's duration at which the navbar starts sliding in.
const HEADER_IN_AT = 0.5

// Intro animation. The first (light) frame is held for FIRST_FRAME_HOLD with
// the black logo centered on it. The logo animates in with the frame and out
// as the video starts, and
// it plays once; halfway through, the navbar slides in from above the top
// edge of the browser. The source is square, so sizing it to the viewport's
// longer side covers the whole screen and crops the overflow on the shorter
// side equally.
export default function IntroPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [showHeader, setShowHeader] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isFrameReady, setIsFrameReady] = useState(false)

  // The hold starts once the first frame is decoded and on screen, so a slow
  // load doesn't eat into it.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let timer: number | undefined
    const startHold = () => {
      setIsFrameReady(true)
      timer = window.setTimeout(() => {
        video.play().catch(() => {})
      }, FIRST_FRAME_HOLD)
    }

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) startHold()
    else video.addEventListener('loadeddata', startHold, { once: true })

    return () => {
      video.removeEventListener('loadeddata', startHold)
      window.clearTimeout(timer)
    }
  }, [])

  return (
    <main className={showHeader ? 'intro-page is-header-in' : 'intro-page'}>
      <video
        ref={videoRef}
        className="intro-video"
        src={introVideo}
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
      <img
        className={isPlaying ? 'intro-logo is-out' : isFrameReady ? 'intro-logo is-in' : 'intro-logo'}
        src={logoBlack}
        alt="Specto"
        width={89}
        height={20}
      />
      <SiteHeader />
    </main>
  )
}
