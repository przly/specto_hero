import { useEffect, useRef, useState, type ComponentProps } from 'react'
import css from '../components/Button/Button.css?inline'
import Button from '../components/Button/Button'

type ButtonProps = ComponentProps<typeof Button>

const modifiers = ['primary', 'secondary'] as const

// Sizes, icon layouts, and the disabled + loading states. Hover/active are left to interaction;
// the Loading button is a text button that morphs into the spinner on click for 2s.
const columns: { label: string; props: ButtonProps; demo?: boolean }[] = [
  { label: 'Default', props: { size: 'default', children: 'Button' } },
  { label: 'Small', props: { size: 'small', children: 'Button' } },
  { label: 'Icon right', props: { size: 'default', children: 'Button', rightIcon: 'ArrowRight' } },
  { label: 'Icon left', props: { size: 'default', children: 'Button', leftIcon: 'Plus' } },
  { label: 'Both icons', props: { size: 'default', children: 'Button', leftIcon: 'Plus', rightIcon: 'ArrowRight' } },
  { label: 'Icon only', props: { size: 'default', leftIcon: 'Plus', 'aria-label': 'Add' } },
  { label: 'Disabled', props: { size: 'default', children: 'Button', isDisabled: true } },
  { label: 'Loading', props: { size: 'default', children: 'Button' }, demo: true },
]

const label = 'font-geist text-[10px] leading-none text-gray-500'

export default function ButtonsPage() {
  return (
    <>
      {/* Tailwind (with its reset) is mounted only while this page is open, so other routes are untouched. */}
      <style>{css}</style>
      <MobileLayout />
      <div className="font-primary hidden min-h-screen items-center justify-center bg-black px-8 py-16 antialiased md:flex">
        <div className="grid grid-cols-[auto_repeat(8,auto)] items-center gap-x-8 gap-y-8">
          <span />
          {columns.map((column) => (
            <span key={column.label} className={label}>
              {column.label}
            </span>
          ))}
          {modifiers.map((modifier) => (
            <Row key={modifier} modifier={modifier} />
          ))}
        </div>
      </div>
    </>
  )
}

// Below md: one section per modifier, each state as a "label · button" row, plus phone-only cases — full width
// (rest width must follow the container), full width while loading, and a long label in a narrow column.
function MobileLayout() {
  return (
    <div className="font-primary flex min-h-screen flex-col gap-12 bg-black px-4 pt-[max(3rem,env(safe-area-inset-top))] pb-32 antialiased md:hidden">
      {modifiers.map((modifier) => (
        <section key={modifier} className="flex flex-col gap-5">
          <h2 className={`${label} capitalize`}>{modifier}</h2>
          {columns.map((column) => (
            <div key={column.label} className="flex min-h-11 items-center justify-between gap-4">
              <span className={label}>{column.label}</span>
              {column.demo ? <DemoButton modifier={modifier} {...column.props} /> : <Button modifier={modifier} {...column.props} />}
            </div>
          ))}
          <span className={label}>Full width</span>
          <Button modifier={modifier} size="default" className="w-full" rightIcon="ArrowRight">
            Button
          </Button>
          <span className={label}>Full width · loading (tap)</span>
          <div className="flex justify-center">
            <DemoButton modifier={modifier} size="default" className="w-full">
              Button
            </DemoButton>
          </div>
          <span className={label}>Long label · narrow column</span>
          <div className="w-40">
            <Button modifier={modifier} size="default">
              Book a call with the Specto team
            </Button>
          </div>
        </section>
      ))}
    </div>
  )
}

function Row({ modifier }: { modifier: (typeof modifiers)[number] }) {
  return (
    <>
      <span className={`${label} capitalize`}>{modifier}</span>
      {columns.map((column) => (
        <div key={column.label}>
          {column.demo ? (
            // An invisible resting copy holds the cell at the text button's width; the live button is stacked on
            // top and centred, so it shrinks into the circle around its own centre instead of toward the left.
            <div className="grid justify-items-center [&>*]:[grid-area:1/1]">
              <Button modifier={modifier} {...column.props} className="invisible" inert />
              <DemoButton modifier={modifier} {...column.props} />
            </div>
          ) : (
            <Button modifier={modifier} {...column.props} />
          )}
        </div>
      ))}
    </>
  )
}

const DEMO_LOADING_MS = 2000

// Click → loading (text morphs into the spinner circle) → back to the text after DEMO_LOADING_MS.
function DemoButton({ isLoading, ...props }: ButtonProps) {
  const [isDemoLoading, setIsDemoLoading] = useState(false)
  const timer = useRef<number>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <Button
      {...props}
      isLoading={isLoading || isDemoLoading}
      onClick={() => {
        setIsDemoLoading(true)
        timer.current = window.setTimeout(() => setIsDemoLoading(false), DEMO_LOADING_MS)
      }}
    />
  )
}
