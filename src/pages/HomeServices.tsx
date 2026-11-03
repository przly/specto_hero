import ServiceCard from '../components/ServiceCard'
import { SERVICE_ITEMS } from '../components/serviceItems'
import './HomeServices.css'

/* Port of specto-website `modules/HomeServices` (+ SectionHeader, Title,
   Text, Button primary, SectionMargin). Content is the module's Storybook
   default. Tailwind classes are translated to HomeServices.css. */

const content = {
  title: '4 areas of expertise',
  button: { href: '#', title: 'See how we do it' },
  intro_text:
    "We collaborate with founders and teams to shape ideas, define clear visions, and turn them into digital products that drive real growth. That's Specto.",
  about_items: SERVICE_ITEMS,
}

function CrossArrowDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 30 30" fill="none" aria-hidden="true">
      <rect x="21.9301" y="24.0532" width="23.9434" height="3" rx="0.4" transform="rotate(-135 21.9301 24.0532)" fill="currentColor" />
      <rect x="25.0014" y="10.0005" width="15" height="3" rx="0.4" transform="rotate(90 25.0014 10.0005)" fill="currentColor" />
      <rect x="25.0014" y="25.0005" width="15" height="3" rx="0.4" transform="rotate(-180 25.0014 25.0005)" fill="currentColor" />
    </svg>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M9.47525 6.142C9.40236 6.0691 9.28417 6.06911 9.21127 6.142L4.00576 11.3475C3.88817 11.4651 3.97145 11.6662 4.13775 11.6662L5.58968 11.6662C5.63919 11.6662 5.68667 11.6465 5.72167 11.6115L10.2012 7.13195C10.2741 7.05905 10.2741 6.94086 10.2012 6.86797L9.47525 6.142Z"
        fill="currentColor"
      />
      <path
        d="M4.13718 2.33337C3.97087 2.33337 3.88759 2.53444 4.00518 2.65203L9.21108 7.85793C9.28397 7.93082 9.40216 7.93082 9.47506 7.85793L10.201 7.13196C10.2739 7.05906 10.2739 6.94087 10.201 6.86798L5.7211 2.38805C5.68609 2.35304 5.63861 2.33337 5.5891 2.33337L4.13718 2.33337Z"
        fill="currentColor"
      />
    </svg>
  )
}

/* Website Button, modifier="primary" size="default" rightIcon="ChevronRight" */
function PrimaryButton({ href, children }: { href: string; children: string }) {
  return (
    <a className="btn-primary" href={href}>
      <span className="btn-primary-hover-border" />
      <span className="btn-primary-active-border" />
      <span className="btn-primary-inner">
        <span className="btn-primary-hover-gradient" />
        <span className="btn-primary-active-gradient" />
        <span className="btn-primary-content">
          <span>{children}</span>
          <ChevronRightIcon className="btn-primary-icon" />
        </span>
      </span>
    </a>
  )
}

export default function HomeServices() {
  const { title, button, intro_text, about_items } = content

  return (
    <main className="home-services-page">
      <div className="home-services-spacer" />

      <section className="home-services">
        <div className="container home-services-grid">
          {/* SectionHeader */}
          <div className="section-header">
            <div className="section-header-title-wrap">
              <div className="section-header-title-row">
                <CrossArrowDownIcon className="section-header-arrow" />
                <h2 className="heading heading-3 font-zero section-header-title">{title}</h2>
              </div>
            </div>
            <div className="section-header-aside section-header-button">
              <PrimaryButton href={button.href}>{button.title}</PrimaryButton>
            </div>
          </div>

          <div className="home-services-intro">
            <p className="editor-text home-services-intro-text">{intro_text}</p>
            <div className="home-services-mobile-button">
              <PrimaryButton href={button.href}>{button.title}</PrimaryButton>
            </div>
          </div>

          <div className="home-services-items">
            {about_items.map((item) => (
              <ServiceCard key={item.title} {...item} />
            ))}
          </div>
        </div>

        {/* SectionMargin size="default" → Margin 200 */}
        <div className="section-margin-default" />
      </section>
    </main>
  )
}
