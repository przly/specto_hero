import Button from '../components/Button/Button'
import together from '../assets/together.webp'
// Button styles are Tailwind; injected only while this module is mounted (same
// as Clients) so Tailwind's base layer doesn't leak into other pages.
import buttonCss from '../components/Button/Button.embed.css?inline'
import './LetsBuild.css'

/* 1:1 clone of specto-website `modules/LetsBuild` (develop @ 9756594),
   content and image from its Storybook story. Tailwind classes from the
   website are noted next to each rule in LetsBuild.css. */

const TITLE = 'Let’s build your digital future.'
const GET_IN_TOUCH = { href: '#', title: 'Let’s get in touch' }

export function LetsBuildModule() {
  return (
    <div className="lets-build">
      <style>{buttonCss}</style>
      {/* SectionMargin size="none" */}

      <div className="home-container">
        <div className="lets-build-inner">
          <h2 className="heading heading-3 font-zero lets-build-title">{TITLE}</h2>

          <span className="lets-build-image">
            <img src={together} alt="together" width={636} height={210} loading="lazy" draggable={false} />
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
