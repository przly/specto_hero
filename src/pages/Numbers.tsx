import type { CSSProperties } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { RevealText } from '../RevealText'
import './Numbers.css'

const STATS = [
  {
    value: '€100M+',
    description:
      'annual turnover powered by our solutions. We partner with ambitious teams to turn ideas into products that ship, scale, and keep paying off long after launch. That growth is the clearest measure of the trust our clients place in us.',
  },
  { value: '589', description: 'active projects under long-term client partnerships' },
  { value: '42 days', description: 'average turnaround from kickoff to launch' },
  { value: '18', description: 'countries our clients operate in' },
  { value: '97 %', description: 'client retention across long-term partnerships' },
]

export default function Numbers() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <>
      <div className="numbers-page">
        <div className="numbers-intro" aria-hidden="true" />

        {STATS.map((stat, index) => (
          <div
            className="numbers-panel"
            key={stat.value}
            style={{ '--stack-index': index } as CSSProperties}
          >
            <div className="numbers-panel-inner">
              <motion.span
                className="numbers-panel-line"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{
                  duration: prefersReducedMotion ? 0 : 2,
                  ease: 'linear',
                }}
              />
              <div className="numbers-stat">
                <p className="numbers-value">{stat.value}</p>
                <RevealText
                  as="p"
                  text={stat.description}
                  by="word"
                  className="numbers-description"
                  duration={1.3}
                  stagger={0.02}
                  delay={0}
                  triggerMargin={-80}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sits outside .numbers-page on purpose — nesting it inside would
          share that div as the last panel's sticky containing block,
          extending its pin duration to cover this text and overlapping it. */}
      <div className="numbers-footer">
        <RevealText
          as="p"
          text="Sint commodo magna officia sit ea excepteur sint enim. Incididunt anim consectetur nulla sint esse eu consectetur. Nisi enim est consequat eiusmod laboris laborum exercitation pariatur enim sunt eiusmod nostrud incididunt nostrud nisi."
          by="line"
          className="numbers-footer-text"
          duration={1.3}
          stagger={0.06}
          triggerMargin={-80}
        />
      </div>
    </>
  )
}
