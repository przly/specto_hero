import { Fragment, useRef, type PointerEvent } from 'react'
import Button from '../components/Button/Button'
import { RevealText } from '../RevealText'
import { ARROW_PUSH_DURATION, useArrowPush } from '../components/arrowPush'
import { useTestReveal } from '../components/revealTrigger'
import crossArrowDown from '../assets/cross-arrow-down.svg?raw'
import card1 from '../assets/projects/card-1.webp'
import card2 from '../assets/projects/card-2.webp'
import card3 from '../assets/projects/card-3.webp'
import ngen from '../assets/projects/ngen.webp'
import europeanYouthCard from '../assets/projects/european-youth-card.webp'
import prowShop from '../assets/projects/prow-shop.webp'
// Button styles are Tailwind; injected only while this module is mounted (same
// as Clients) so Tailwind's base layer doesn't leak into other pages.
import buttonCss from '../components/Button/Button.embed.css?inline'
import './ProjectCardList.css'

/* 1:1 clone of specto-website `modules/ProjectCardList` + `molecules/Card` +
   `molecules/SectionHeader` (develop @ 9756594), content and images from the
   ProjectCardList Storybook story (Default). Tailwind classes from the
   website are noted next to each rule in ProjectCardList.css.

   The website swaps the "All Projects" button between the header (lg+) and
   below the grid (< lg) with useMedia; here both are rendered and CSS shows
   one, which gives the same result without a JS breakpoint. */

type ProjectCard = {
  image: string
  title: string
  text: string
  href: string
}

const SECTION_TITLE = 'Selected Work'

// Title per-word reveal, same Specto_TextReveal title timing as the Numbers
// module title (SPECTO_TITLE_DURATION / HERO_DUPLICATE_WORD_STAGGER).
const TITLE_DURATION = 1.6
const TITLE_WORD_STAGGER = 0.02
const ALL_PROJECTS = { href: '#view-all', title: 'All Projects' }
const DETAILS_LABEL = 'View Details'

const CARDS: ProjectCard[] = [
  { image: card1, title: 'Mehler Systems', text: 'Website', href: '#details' },
  { image: card2, title: 'Generali Investments', text: 'Mobile App', href: '#details' },
  { image: card3, title: 'Loterija Slovenije', text: 'Product & Website', href: '#details' },
  { image: ngen, title: 'NGEN', text: 'Website', href: '#details' },
  { image: europeanYouthCard, title: 'European Youth Card', text: 'Website', href: '#details' },
  { image: prowShop, title: 'PROW Shop', text: 'Website', href: '#details' },
]

// Title roll on hover, like the Clients slider's text change but moving
// exactly one line: each word slides up by its own height while a copy
// directly below it slides into its place, words staggered. The pair then snaps back
// (identical text, so the reset is invisible), ready for the next hover.
// Clients' user-triggered reveal duration on the engine's expo-out curve
// (cubic-bezier approximation, so WAAPI runs it on the compositor).
const ROLL_DURATION = 900 // ms
const ROLL_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'
const ROLL_WORD_STAGGER = 40 // ms, Clients' user-triggered stagger

function Card({ image, title, text, href }: ProjectCard) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const words = title.split(/\s+/).filter(Boolean)

  const roll = (e: PointerEvent) => {
    const rolls = titleRef.current?.querySelectorAll<HTMLElement>('.project-card-title-roll')
    if (e.pointerType === 'touch' || !rolls?.length) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // Every hover rolls, even mid-roll. Each word has identical copies one
    // line above and below, so a word caught at T% (0 → -100%) looks the
    // same at T + 100%: restart from there and roll up to -100%, a fresh
    // roll that continues from what's on screen without a jump.
    const starts = Array.from(rolls, (el) => {
      const y = new DOMMatrixReadOnly(getComputedStyle(el).transform).m42
      const t = el.offsetHeight ? (y / el.offsetHeight) * 100 : 0
      return t < -0.5 ? t + 100 : 0
    })
    rolls.forEach((el, index) => {
      el.getAnimations().forEach((a) => a.cancel())
      el.animate([{ transform: `translateY(${starts[index]}%)` }, { transform: 'translateY(-100%)' }], {
        duration: ROLL_DURATION,
        delay: index * ROLL_WORD_STAGGER,
        easing: ROLL_EASE,
        // Hold the start position through the stagger delay.
        fill: 'backwards',
      })
    })
  }

  return (
    <div className="project-card" onPointerEnter={roll}>
      <div className="project-card-media">
        <div className="project-card-img-wrap">
          <img className="project-card-img" src={image} alt="Project" width={720} height={612} loading="lazy" draggable={false} />
        </div>
      </div>

      <div>
        <h3 className="heading heading-6 font-zero project-card-title" ref={titleRef} aria-label={title}>
          {words.map((word, index) => (
            <Fragment key={index}>
              {index > 0 && ' '}
              <span className="project-card-title-mask" aria-hidden="true">
                <span className="project-card-title-roll">
                  <span className="project-card-title-copy project-card-title-copy--above">{word}</span>
                  {word}
                  <span className="project-card-title-copy">{word}</span>
                </span>
              </span>
            </Fragment>
          ))}
        </h3>
        <div className="project-card-text">{text}</div>
      </div>

      <a className="project-card-link" href={href}>
        {DETAILS_LABEL}
      </a>
    </div>
  )
}

function AllProjectsButton() {
  return (
    <Button asChild modifier="primary" rightIcon="ChevronRight">
      <a href={ALL_PROJECTS.href}>{ALL_PROJECTS.title}</a>
    </Button>
  )
}

export function ProjectCardListModule() {
  // Trigger line + replay-on-scroll-up from the dev trigger panel.
  const [titleRef, titleVisible] = useTestReveal<HTMLDivElement>()
  // Arrow push (like the IntroText arrow): starts 35% into the last word's
  // reveal, once the title has landed. Same travel time as the IntroText
  // arrow.
  useArrowPush(titleRef, titleVisible, {
    delay: (SECTION_TITLE.split(/\s+/).length - 1) * TITLE_WORD_STAGGER + TITLE_DURATION * 0.35,
    duration: ARROW_PUSH_DURATION,
  })

  return (
    <div className="project-card-list">
      <style>{buttonCss}</style>
      {/* SectionMargin size="none" */}

      <div className="home-container">
        {/* SectionHeader (arrow, title_modifier "h3") */}
        <div className="pcl-header">
          <div className="pcl-header-main">
            <div className="pcl-header-title-row" ref={titleRef}>
              <span
                className="pcl-header-arrow"
                aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: crossArrowDown.replace(/ width="\d+" height="\d+"/, '') }}
              />
              <RevealText
                as="h2"
                text={SECTION_TITLE}
                by="word"
                className="heading heading-3 font-zero pcl-header-title"
                duration={TITLE_DURATION}
                stagger={TITLE_WORD_STAGGER}
                isTriggered={titleVisible}
                hideDelay={0}
              />
            </div>
          </div>

          <div className="pcl-header-actions">
            <div className="pcl-header-button">
              <AllProjectsButton />
            </div>
          </div>
        </div>

        <div className="pcl-grid">
          {CARDS.map((card, index) => (
            <div key={`project-card-${index}`}>
              <Card {...card} />
            </div>
          ))}
        </div>

        <div className="pcl-mobile-button">
          <AllProjectsButton />
        </div>
      </div>

      {/* SectionMargin size="default" */}
      <div className="section-margin-default" />
    </div>
  )
}
