import expertise1 from '../assets/expertise/expertise-1.webp'
import expertise2 from '../assets/expertise/expertise-2.webp'
import expertise3 from '../assets/expertise/expertise-3.webp'
import expertise4 from '../assets/expertise/expertise-4.webp'

export type ServiceItem = {
  title: string
  text: string
  image?: string
  frames?: string[]
  fps?: number
}

export const SERVICE_ITEMS: ServiceItem[] = [
  {
    image: expertise1,
    title: 'Strategy',
    text: 'Together with you we define a clear vision for your product, brand or both.',
  },
  {
    image: expertise2,
    title: 'Product',
    text: 'We craft complex products that delight users and empower businesses to succeed.',
  },
  {
    image: expertise3,
    title: 'Development',
    text: 'From interface to infrastructure, we build robust, scalable solutions grounded in strategy and design.',
  },
  {
    image: expertise4,
    title: 'Brand & Comms',
    text: 'We translate sophisticated narratives into clear messages that drive engagement and growth.',
  },
]
