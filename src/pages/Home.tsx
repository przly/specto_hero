import SiteHeader from '../components/SiteHeader'
import Hero from '../components/Hero'
import SiteFooter from '../components/SiteFooter'
import { IntroTextModule } from './IntroText'
import { LogoCarouselModule } from './LogoCarousel'
import { ProjectCardListModule } from './ProjectCardList'
import { HomeServicesModule } from './HomeServices'
import { NumbersModule } from './Numbers'
import { ClientsModule } from './Clients'
import { LetsBuildModule } from './LetsBuild'
import './Home.css'

/* Module order matches the specto-website homepage:
   Hero + HeroVideo (both in Hero), IntroText, LogoCarousel, ProjectCardList,
   HomeServices, NumbersModule, ClientSliders, LetsBuild. */
export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="home-main">
        <Hero />
        <IntroTextModule />
        <LogoCarouselModule />
        <ProjectCardListModule />
        <HomeServicesModule />
        <NumbersModule />
        <ClientsModule />
        <LetsBuildModule />
      </main>
      <SiteFooter />
    </>
  )
}
