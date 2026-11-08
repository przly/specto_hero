import ServiceCard from '../components/ServiceCard'
import { SERVICE_ITEMS } from '../components/serviceItems'
import './ServiceCardPage.css'

export default function ServiceCardPage() {
  return (
    <main className="service-card-page">
      {/* Scroll room above and below the grid, to test cards scrolling under
          a resting cursor (hover should start/stop without moving it). */}
      <div className="service-card-page-spacer">
        <p className="service-card-page-hint">Rest the cursor here and scroll down</p>
      </div>
      <div className="service-card-page-container">
        <div className="service-card-page-grid">
          {SERVICE_ITEMS.map((item) => (
            <ServiceCard key={item.title} {...item} />
          ))}
        </div>
      </div>
      <div className="service-card-page-spacer">
        <p className="service-card-page-hint">Scroll back up</p>
      </div>
    </main>
  )
}
