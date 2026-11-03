import logoSvgRaw from '../assets/specto-logo.svg?raw'

// Distance (in the SVG's own viewBox units) between sampled points along each
// subpath. Smaller = more segments = closer to the true curve, at the cost of
// more work per pixel in the shaders (every segment is tested per pixel).
export const SAMPLE_SPACING = 0.9
const MIN_SAMPLES_PER_SUBPATH = 8
const NORMAL_PROBE_DISTANCE = 0.12

export interface OutlinePoint {
  x: number
  y: number
  angle: number
  nx: number
  ny: number
}

export interface LogoOutline {
  loops: OutlinePoint[][]
  segments: Float32Array
  viewBoxWidth: number
  viewBoxHeight: number
  refScale: number
}

export interface LedPoint {
  x: number
  y: number
  angle: number
  nx: number
  ny: number
}

export interface LoopRange {
  start: number
  length: number
}

export interface LogoLayout {
  segments: Float32Array
  ledPoints: LedPoint[]
  loopRanges: LoopRange[]
  refScale: number
  scale: number
  originX: number
  originY: number
  logoWidth: number
  logoHeight: number
}

let cachedOutline: LogoOutline | undefined

export function getLogoOutline(): LogoOutline {
  cachedOutline ??= buildOutline()
  return cachedOutline
}

function buildOutline(): LogoOutline {
  const parser = new DOMParser()
  const doc = parser.parseFromString(logoSvgRaw, 'image/svg+xml')
  const svgEl = doc.querySelector('svg')
  if (!svgEl) throw new Error('specto-logo.svg: missing <svg> root')
  const viewBoxAttr = svgEl.getAttribute('viewBox')
  const parts = (viewBoxAttr ?? '0 0 1 1').trim().split(/\s+/).map(Number)
  const viewBoxWidth = parts[2] ?? 1
  const viewBoxHeight = parts[3] ?? 1

  const subpaths: string[] = []
  for (const pathEl of Array.from(doc.querySelectorAll('path'))) {
    const d = pathEl.getAttribute('d')
    if (!d) continue
    for (const chunk of d.split(/(?=[Mm])/)) {
      const trimmed = chunk.trim()
      if (trimmed) subpaths.push(trimmed)
    }
  }

  const host = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  Object.assign(host.style, {
    position: 'absolute',
    width: '0',
    height: '0',
    overflow: 'hidden',
    visibility: 'hidden',
  })
  document.body.appendChild(host)

  const rawLoops: { x: number; y: number }[][] = []
  try {
    for (const d of subpaths) {
      const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      pathEl.setAttribute('d', d)
      host.appendChild(pathEl)
      const length = pathEl.getTotalLength()
      if (length > 0) {
        const count = Math.max(MIN_SAMPLES_PER_SUBPATH, Math.round(length / SAMPLE_SPACING))
        const points: { x: number; y: number }[] = []
        for (let i = 0; i < count; i++) {
          const point = pathEl.getPointAtLength((length * i) / count)
          points.push({ x: point.x, y: point.y })
        }
        rawLoops.push(points)
      }
      host.removeChild(pathEl)
    }
  } finally {
    document.body.removeChild(host)
  }

  const segments: number[] = []
  for (const loop of rawLoops) {
    const n = loop.length
    for (let i = 0; i < n; i++) {
      const a = loop[i]!
      const b = loop[(i + 1) % n]!
      segments.push(a.x, a.y, b.x, b.y)
    }
  }
  const segmentArray = Float32Array.from(segments)

  const loops: OutlinePoint[][] = rawLoops.map((loop) => {
    const n = loop.length
    return loop.map((p, i) => {
      const prev = loop[(i - 1 + n) % n]!
      const next = loop[(i + 1) % n]!
      const dx = next.x - prev.x
      const dy = next.y - prev.y
      const len = Math.hypot(dx, dy) || 1
      const tx = dx / len
      const ty = dy / len
      let nx = -ty
      let ny = tx
      const probe = { x: p.x + nx * NORMAL_PROBE_DISTANCE, y: p.y + ny * NORMAL_PROBE_DISTANCE }
      if (isInsideOutline(probe, segmentArray)) {
        nx = -nx
        ny = -ny
      }
      return { x: p.x, y: p.y, angle: Math.atan2(ty, tx), nx, ny }
    })
  })

  const refScale = Math.max(viewBoxWidth, viewBoxHeight) * 0.5

  return { loops, segments: segmentArray, viewBoxWidth, viewBoxHeight, refScale }
}

function isInsideOutline(p: { x: number; y: number }, segments: Float32Array): boolean {
  let crossings = 0
  for (let i = 0; i < segments.length; i += 4) {
    const ay = segments[i + 1]!
    const by = segments[i + 3]!
    if (ay > p.y !== by > p.y) {
      const ax = segments[i]!
      const bx = segments[i + 2]!
      const xIntersect = ax + ((p.y - ay) / (by - ay)) * (bx - ax)
      if (p.x < xIntersect) crossings++
    }
  }
  return crossings % 2 === 1
}

/**
 * Fits the outline into `sim` space: as tall as `heightRatio * sim.height` and
 * as wide as `widthRatio * sim.width`, whichever is more restrictive, centered.
 */
export function buildLogoLayout(
  outline: LogoOutline,
  sim: { width: number; height: number },
  heightRatio: number,
  widthRatio: number,
): LogoLayout {
  const scaleByHeight = (sim.height * heightRatio) / outline.viewBoxHeight
  const scaleByWidth = (sim.width * widthRatio) / outline.viewBoxWidth
  const scale = Math.max(0.0001, Math.min(scaleByHeight, scaleByWidth))
  const logoWidth = outline.viewBoxWidth * scale
  const logoHeight = outline.viewBoxHeight * scale
  const originX = (sim.width - logoWidth) / 2
  const originY = (sim.height - logoHeight) / 2

  const src = outline.segments
  const segments = new Float32Array(src.length)
  for (let i = 0; i < src.length; i += 4) {
    segments[i] = src[i]! * scale + originX
    segments[i + 1] = src[i + 1]! * scale + originY
    segments[i + 2] = src[i + 2]! * scale + originX
    segments[i + 3] = src[i + 3]! * scale + originY
  }

  const ledPoints: LedPoint[] = []
  const loopRanges: LoopRange[] = []
  for (const loop of outline.loops) {
    const start = ledPoints.length
    for (const p of loop) {
      ledPoints.push({
        x: p.x * scale + originX,
        y: p.y * scale + originY,
        angle: p.angle,
        nx: p.nx,
        ny: p.ny,
      })
    }
    loopRanges.push({ start, length: loop.length })
  }

  return {
    segments,
    ledPoints,
    loopRanges,
    refScale: outline.refScale * scale,
    scale,
    originX,
    originY,
    logoWidth,
    logoHeight,
  }
}
