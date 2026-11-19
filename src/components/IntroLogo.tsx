import { motion, useReducedMotion } from 'motion/react'
import type { Variants } from 'motion/react'
import { easeExpoOut } from '../RevealText'
import { LOGO_UNITS, LOGO_VIEWBOX } from './introLogoPaths'

/* The Specto logo revealed with the page's per-word text engine (RevealText
   `by="word"`): each unit (the mark, then S p e c t o) slides up into place
   from 200% below its mask on expo-out, staggered. The SVG's own box is the
   mask, the same way each word's wrap clips it. Timing is the titles'
   (TITLE_DURATION / TITLE_WORD_STAGGER), 2x faster. It leaves with a plain
   fade, all units together. */

// The titles' timing, played 2x faster.
const DURATION = 1.6 / 2
const STAGGER = 0.02 / 2
// Out: one plain fade on the whole SVG. The letters stay where they settled
// (their own state never leaves 'visible'), so nothing moves as it fades.
const FADE_OUT = { duration: 0.3, ease: 'easeIn' } as const

// RevealText's percentages are of the line's height; here that's the
// viewBox height, in user units (CSS px on SVG content are user units).
const H = LOGO_VIEWBOX.height
const BELOW = `translateY(${H * 2}px)`

export type IntroLogoState = 'hidden' | 'visible' | 'exit'

const variants: Variants = {
  hidden: { transform: BELOW },
  visible: (i: number) => ({
    transform: 'translateY(0px)',
    transition: { duration: DURATION, delay: i * STAGGER, ease: easeExpoOut },
  }),
}

// Same as RevealText's reduced-motion variant: a short opacity fade.
const reducedVariants: Variants = {
  hidden: { opacity: 0 },
  visible: (i: number) => ({
    opacity: 1,
    transition: { duration: 0.24, delay: i * Math.min(STAGGER, 0.05), ease: 'easeOut' },
  }),
}

export default function IntroLogo({ state, className }: { state: IntroLogoState; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.svg
      className={className}
      viewBox={`0 0 ${LOGO_VIEWBOX.width} ${LOGO_VIEWBOX.height}`}
      width={LOGO_VIEWBOX.width}
      height={LOGO_VIEWBOX.height}
      fill="black"
      role="img"
      aria-label="Specto"
      initial={false}
      animate={{ opacity: state === 'exit' ? 0 : 1 }}
      transition={FADE_OUT}
    >
      {LOGO_UNITS.map((unit, i) => (
        <motion.g
          key={unit.name}
          custom={i}
          variants={reduce ? reducedVariants : variants}
          initial="hidden"
          animate={state === 'hidden' ? 'hidden' : 'visible'}
        >
          {unit.paths.map((d) => (
            <path key={d.slice(0, 24)} d={d} />
          ))}
        </motion.g>
      ))}
    </motion.svg>
  )
}
