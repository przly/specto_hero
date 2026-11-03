/* Frame sequences for FrameSequence / ServiceCard.
   To add one: drop numbered frames (0001.webp, 0002.webp, …) into a new
   folder here and add a glob below. Vite hashes and bundles each frame. */

const toSortedUrls = (modules: Record<string, string>) =>
  Object.keys(modules)
    .sort()
    .map((key) => modules[key])

export const cubesFrames = toSortedUrls(
  import.meta.glob<string>('./cubes/*.webp', { eager: true, query: '?url', import: 'default' }),
)

export const curveFrames = toSortedUrls(
  import.meta.glob<string>('./curve/*.webp', { eager: true, query: '?url', import: 'default' }),
)

export const fullFrames = toSortedUrls(
  import.meta.glob<string>('./full/*.webp', { eager: true, query: '?url', import: 'default' }),
)
