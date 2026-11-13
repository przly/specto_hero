import Button from '../components/Button/Button'
import { RevealText } from '../RevealText'
import { useTestReveal } from '../components/revealTrigger'
import { useEffect, useRef } from 'react'
import togetherVideo from '../assets/together.mp4'
import togetherPoster from '../assets/together-poster.webp'
// Button styles are Tailwind; injected only while this module is mounted (same
// as Clients) so Tailwind's base layer doesn't leak into other pages.
import buttonCss from '../components/Button/Button.embed.css?inline'
import './LetsBuild.css'

/* 1:1 clone of specto-website `modules/LetsBuild` (develop @ 9756594),
   content and image from its Storybook story. Tailwind classes from the
   website are noted next to each rule in LetsBuild.css. */

const TITLE = 'Let’s build your digital future.'
// Title per-word reveal, same timing as the other section titles
// (ProjectCardList / Numbers).
const TITLE_DURATION = 1.6
const TITLE_WORD_STAGGER = 0.02

const GET_IN_TOUCH = { href: '#', title: 'Let’s get in touch' }

export function LetsBuildModule() {
  const [titleRef, titleVisible] = useTestReveal<HTMLDivElement>()
  const boxRef = useRef<HTMLSpanElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Play the loop only while at least half of it is on screen; reduced motion
  // keeps the poster (frame 1) and never plays.
  useEffect(() => {
    const box = boxRef.current
    const video = videoRef.current
    if (!box || !video) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && e.intersectionRatio >= 0.5) video.play().catch(() => {})
        else video.pause()
      },
      { threshold: [0, 0.5, 1] },
    )
    io.observe(box)
    return () => io.disconnect()
  }, [])

  return (
    <div className="lets-build">
      <style>{buttonCss}</style>
      {/* SectionMargin size="none" */}

      <div className="home-container">
        <div className="lets-build-inner">
          <div className="lets-build-title-wrap" ref={titleRef}>
            <RevealText
              as="h2"
              text={TITLE}
              by="word"
              className="heading font-zero lets-build-title"
              duration={TITLE_DURATION}
              stagger={TITLE_WORD_STAGGER}
              isTriggered={titleVisible}
              hideDelay={0}
            />
          </div>

          <span className="lets-build-image" ref={boxRef}>
            <video
              ref={videoRef}
              src={togetherVideo}
              poster={togetherPoster}
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden="true"
            />
          </span>

          <div className="lets-build-cta">
            <Button asChild rightIcon="ArrowRight">
              <a href={GET_IN_TOUCH.href}>{GET_IN_TOUCH.title}</a>
            </Button>
          </div>
        </div>
      </div>

      {/* SectionMargin size="default" */}
      <div className="section-margin-default" />
    </div>
  )
}
