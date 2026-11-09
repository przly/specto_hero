import { useEffect, useRef, type CSSProperties } from 'react'
import adria from '../assets/logos/logo-adria.svg'
import bosch from '../assets/logos/logo-bosch.svg'
import deutsche from '../assets/logos/logo-deutsche.svg'
import deutscheBank from '../assets/logos/logo-deutsche-bank.svg'
import ece from '../assets/logos/logo-ece.svg'
import eg from '../assets/logos/logo-eg.svg'
import fiat from '../assets/logos/logo-fiat.svg'
import generali from '../assets/logos/logo-generali.svg'
import jeep from '../assets/logos/logo-jeep.svg'
import loterija from '../assets/logos/logo-loterija.svg'
import skoda from '../assets/logos/logo-skoda.svg'
import stellantis from '../assets/logos/logo-stellantis.svg'
import './LogoCarousel.css'

/* 1:1 clone of specto-website `modules/LogoCarousel` (develop @ 9756594),
   content and logos from its Storybook story. Each row is an endless CSS
   marquee (two copies of the set, translated -50%); odd rows run in reverse.
   Tailwind classes from the website are noted next to each rule in
   LogoCarousel.css. Alt texts fixed where the story used "Build". */

type Logo = { src: string; alt: string }

const TITLE = 'Selected clients:'

const LOGO_ROWS: Logo[][] = [
  [
    { src: loterija, alt: 'Loterija Slovenije' },
    { src: stellantis, alt: 'Stellantis' },
    { src: deutsche, alt: 'Deutsche Vermögensberatung' },
    { src: bosch, alt: 'Bosch' },
    { src: ece, alt: 'ECE' },
    { src: eg, alt: 'Elektro Gorenjska' },
  ],
  [
    { src: deutscheBank, alt: 'Deutsche Bank' },
    { src: generali, alt: 'Generali' },
    { src: adria, alt: 'Adria' },
    { src: fiat, alt: 'Fiat' },
    { src: jeep, alt: 'Jeep' },
    { src: skoda, alt: 'Škoda' },
  ],
]

const SECONDS_PER_ITEM = 3
const MIN_ITEMS_PER_SET = 12

function LogoSet({ logos, hidden = false }: { logos: Logo[]; hidden?: boolean }) {
  return (
    <div className="logo-set">
      {logos.map((logo, index) => (
        <div className="logo-item" key={`logo-${index}`}>
          <img
            className="logo-img"
            src={logo.src}
            alt={hidden ? '' : logo.alt}
            width={152}
            height={58}
            loading="lazy"
            draggable={false}
          />
        </div>
      ))}
    </div>
  )
}

function buildLoopItems(logos: Logo[]): Logo[] {
  if (logos.length === 0) return logos
  const repeats = Math.max(1, Math.ceil(MIN_ITEMS_PER_SET / logos.length))
  return Array.from({ length: repeats }, () => logos).flat()
}

function LogoRowCarousel({ logos, reverse = false }: { logos: Logo[]; reverse?: boolean }) {
  const loopItems = buildLoopItems(logos)
  const duration = `${loopItems.length * SECONDS_PER_ITEM}s`

  return (
    <div className="logo-row">
      <div className="logo-row-fades" aria-hidden="true">
        <div className="logo-row-fade logo-row-fade--left" />
        <div className="logo-row-fade logo-row-fade--right" />
      </div>

      <div
        className={reverse ? 'logo-marquee-track logo-marquee-track--reverse' : 'logo-marquee-track'}
        style={{ '--marquee-duration': duration } as CSSProperties}
      >
        <LogoSet logos={loopItems} />
        <div aria-hidden="true">
          <LogoSet logos={loopItems} hidden />
        </div>
      </div>
    </div>
  )
}

export function LogoCarouselModule() {
  // The marquees pause while the module is scrolled out of view, so the
  // browser isn't compositing two endless animations nobody can see.
  const moduleRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const node = moduleRef.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => {
      node.classList.toggle('is-offscreen', !entry.isIntersecting)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="logo-carousel" ref={moduleRef}>
      {/* SectionMargin size="none" */}

      <div className="home-container">
        <h2 className="heading heading-6 font-zero logo-carousel-title">{TITLE}</h2>
      </div>

      <div className="logo-carousel-rows">
        {LOGO_ROWS.map((row, rowIndex) => (
          <LogoRowCarousel key={`logo-row-${rowIndex}`} logos={row} reverse={rowIndex % 2 === 1} />
        ))}
      </div>

      {/* SectionMargin size="default" */}
      <div className="section-margin-default" />
    </div>
  )
}
