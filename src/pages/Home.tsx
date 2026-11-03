import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import '../App.css'

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <section className="next-section">
        <p>Rest of the page continues here.</p>
      </section>
    </>
  )
}
