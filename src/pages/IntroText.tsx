import { useEffect, useRef, useState } from 'react'
import arrowRight from '../components/Button/icons/ArrowRight.svg?raw'
import { RevealText } from '../RevealText'
import { prefersReducedMotion, slideFrames } from '../components/slideIn'
import { useTestReveal } from '../components/revealTrigger'
import { ARROW_PUSH_DURATION } from '../components/arrowPush'
import './IntroText.css'

/* Clone of specto-website `modules/IntroText` (develop @ 9756594), content
   from its Storybook story (variant "default"). Tailwind classes from the
   website are noted next to each rule in IntroText.css.

   Changes from the website:
   - the text reveals per line with the Specto text-reveal engine
     (RevealText, github.com/przly/Specto_TextReveal): each wrapped line
     slides up out of its mask — instead of the website's scroll-linked
     fade / blur / rise per word (AnimatedWord). Both titles run as one
     sequence: title 2's stagger continues from title 1's last line;
   - title 2 always starts on a new line (two reveal blocks); on the website
     it continues on title 1's last line from lg up;
   - the first line reveals flush left with the others; once the paragraph
     has landed, the arrow slides in from outside the viewport and pushes
     that line out to its indent;
   - "developement" typo in the story text fixed. */

// Specto_TextReveal title timing (line mode), at the engine's default
// speed: 1.6s per line, lines 96ms apart
// (6% of the duration).
const TITLE_DURATION = 1.6
const TITLE_LINE_STAGGER = TITLE_DURATION * 0.06

// Arrow push: one travel from off-screen left to rest, on the shared
// slide-in curve (components/slideIn.ts), shared with the section-header
// arrows.
const PUSH_DURATION = ARROW_PUSH_DURATION * 1000 // ms

const TITLE_1 = 'Specto is a design & development studio.'
const TITLE_2 =
  'We turn your ideas into digital products from zero to launch by combining strategy, design & development all under one roof.'

export function IntroTextModule() {
  // Trigger line + replay-on-scroll-up from the dev trigger panel.
  const [ref, visible] = useTestReveal<HTMLDivElement>()
  // Title 1's detected line count, so title 2's lines continue its stagger.
  const [title1Lines, setTitle1Lines] = useState(0)
  const [title2Lines, setTitle2Lines] = useState(0)

  // The arrow push follows the paragraph: it starts 35% of the way into the
  // last line's reveal (expo-out has it ~91% in by then).
  const lastLine = Math.max(0, title1Lines + title2Lines - 1)
  const pushDelay = lastLine * TITLE_LINE_STAGGER + TITLE_DURATION * 0.35

  const arrowRef = useRef<HTMLSpanElement>(null)

  // The arrow starts just out of view past the viewport's left edge and
  // travels to its resting place, while the first line (shifted back
  // flush-left by its indent in CSS) travels its indent. Both start and end
  // together on the same curve (slideEase), so each moves its own distance.
  // Both run as WAAPI animations on the compositor.
  // Cancelling on hide drops back to the CSS start state.
  useEffect(() => {
    const arrow = arrowRef.current
    const inner = arrow?.parentElement
    const line = inner?.querySelector<HTMLElement>(
      '.intro-text-title--indent:not(.line-measure) > .hero-line-mask:first-child',
    )
    if (!visible || !arrow || !inner || !line) return
    if (prefersReducedMotion()) return

    const indent = parseFloat(getComputedStyle(inner).getPropertyValue('--intro-indent')) || 0
    // offsetLeft/offsetWidth ignore the CSS start translate, so this is the
    // arrow's resting right edge in the viewport (+ slack for its 45° turn
    // on mobile): moving it back by that puts it just out of view.
    const from = -(inner.getBoundingClientRect().left + arrow.offsetLeft + arrow.offsetWidth * 1.25)

    const timing: KeyframeAnimationOptions = {
      duration: PUSH_DURATION,
      delay: pushDelay * 1000,
      easing: 'linear',
      fill: 'both',
    }
    const animations = [arrow.animate(slideFrames(from), timing), line.animate(slideFrames(-indent), timing)]
    return () => animations.forEach((a) => a.cancel())
  }, [visible, pushDelay])

  const reveal = {
    by: 'line' as const,
    duration: TITLE_DURATION,
    stagger: TITLE_LINE_STAGGER,
    isTriggered: visible,
    hideDelay: 0,
  }

  return (
    <div className="intro-text">
      {/* SectionMargin size="none" */}

      <div className="home-container">
        <div className="intro-text-inner" ref={ref}>
          <span
            ref={arrowRef}
            className="intro-text-icon"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: arrowRight.replace(/ width="\d+" height="\d+"/, '') }}
          />
          <RevealText
            as="div"
            text={TITLE_1}
            className="intro-text-title intro-text-title--indent"
            onCountChange={setTitle1Lines}
            {...reveal}
          />
          <div className="intro-text-gap" />
          <RevealText
            as="div"
            text={TITLE_2}
            className="intro-text-title"
            startIndex={title1Lines}
            onCountChange={setTitle2Lines}
            {...reveal}
          />
        </div>
      </div>

      {/* SectionMargin size="default" */}
      <div className="section-margin-default" />
    </div>
  )
}
