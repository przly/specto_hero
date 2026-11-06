import strategyVideo from '../assets/services/strategy.mp4'
import productVideo from '../assets/services/product.mp4'
import developmentVideo from '../assets/services/development.mp4'
import brandVideo from '../assets/services/brand.mp4'

export type ServiceItem = {
  title: string
  text: string
  video: string
}

export const SERVICE_ITEMS: ServiceItem[] = [
  {
    video: strategyVideo,
    title: 'Strategy',
    text: 'Together with you we define a clear vision for your product, brand or both.',
  },
  {
    video: productVideo,
    title: 'Product',
    text: 'We craft complex products that delight users and empower businesses to succeed.',
  },
  {
    video: developmentVideo,
    title: 'Development',
    text: 'From interface to infrastructure, we build robust, scalable solutions grounded in strategy and design.',
  },
  {
    video: brandVideo,
    title: 'Brand & Comms',
    text: 'We translate sophisticated narratives into clear messages that drive engagement and growth.',
  },
]
