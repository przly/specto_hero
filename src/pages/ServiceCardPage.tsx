import ServiceCard from '../components/ServiceCard'
import { SERVICE_ITEMS } from '../components/serviceItems'
import './ServiceCardPage.css'

export default function ServiceCardPage() {
  return (
    <main className="service-card-page">
      <div className="service-card-page-container">
        <div className="service-card-page-grid">
          {SERVICE_ITEMS.map((item) => (
            <ServiceCard key={item.title} {...item} />
          ))}
        </div>
      </div>
    </main>
  )
}
