import strategyVideo from '../assets/services/strategy.mp4'
import strategyPoster from '../assets/services/strategy-poster.webp'
import productVideo from '../assets/services/product.mp4'
import productPoster from '../assets/services/product-poster.webp'
import developmentVideo from '../assets/services/development.mp4'
import developmentPoster from '../assets/services/development-poster.webp'
import brandVideo from '../assets/services/brand.mp4'
import brandPoster from '../assets/services/brand-poster.webp'

export type ServiceItem = {
  title: string
  text: string
  video: string
  /** First frame of `video`. iOS draws nothing for a video that hasn't
      played, so without this the card is blank on phones. */
  poster: string
}

export const SERVICE_ITEMS: ServiceItem[] = [
  {
    video: strategyVideo,
    poster: strategyPoster,
    title: 'Strategy',
    text: 'Together with you we define a clear vision for your product, brand or both.',
  },
  {
    video: productVideo,
    poster: productPoster,
    title: 'Product',
    text: 'We craft complex products that delight users and empower businesses to succeed.',
  },
  {
    video: developmentVideo,
    poster: developmentPoster,
    title: 'Development',
    text: 'From interface to infrastructure, we build robust, scalable solutions grounded in strategy and design.',
  },
  {
    video: brandVideo,
    poster: brandPoster,
    title: 'Brand & Comms',
    text: 'We translate sophisticated narratives into clear messages that drive engagement and growth.',
  },
]
