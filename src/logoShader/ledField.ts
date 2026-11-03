import type { LoopRange, LogoLayout } from './svgOutline'

const LED_FLOATS = 8
const COLOR_OFFSET = 4
const MAX_FRAME_DELTA = 0.1

const COMET_LED_COUNT_MID = 11
const COMET_LED_COUNT_AMP = 4.5

const FACING_FULL_DEG = 90
const FACING_ZERO_DEG = 100

export interface BrushState {
  x: number
  y: number
  active: boolean
  isMouse: boolean
  glowEnabled: boolean
  glowRadius: number
  glowStrength: number
  glowSmoothing: number
  glowFacingEnabled: boolean
}

export const DEFAULT_BRUSH: BrushState = {
  x: -1000,
  y: -1000,
  active: false,
  isMouse: false,
  glowEnabled: true,
  glowRadius: 46,
  glowStrength: 1,
  glowSmoothing: 0.2,
  glowFacingEnabled: true,
}

interface CometState {
  center: number
  velocity: number
  freq: number
  phase: number
  fadeFreq: number
  fadePhase: number
}

export interface LedFieldState {
  data: Float32Array
  normals: Float32Array
  loopRanges: LoopRange[]
  comets: CometState[]
  glowState: Float32Array
  glowDecaying: boolean
  animationClock: number
  lastFrameTime: number | undefined
}

export function createLedField(layout: LogoLayout): LedFieldState {
  const points = layout.ledPoints
  const data = new Float32Array(points.length * LED_FLOATS)
  const normals = new Float32Array(points.length * 2)
  for (const [i, p] of points.entries()) {
    const base = i * LED_FLOATS
    data[base] = p.x
    data[base + 1] = p.y
    data[base + 2] = 0
    data[base + 3] = p.angle
    data[base + COLOR_OFFSET] = 1
    data[base + COLOR_OFFSET + 1] = 1
    data[base + COLOR_OFFSET + 2] = 1
    data[base + COLOR_OFFSET + 3] = 0
    normals[i * 2] = p.nx
    normals[i * 2 + 1] = p.ny
  }
  const comets: CometState[] = layout.loopRanges.map((_, i) => ({
    center: 0,
    velocity: -(1.5 + 0.55 * ((i * 47) % 5)),
    freq: 0.26 + 0.045 * ((i * 31) % 5),
    phase: ((i * 1.87) % (Math.PI * 2)) - Math.PI,
    fadeFreq: 0.32 + 0.04 * ((i * 23) % 5),
    fadePhase: ((i * 2.63) % (Math.PI * 2)) - Math.PI,
  }))
  return {
    data,
    normals,
    loopRanges: layout.loopRanges,
    comets,
    glowState: new Float32Array(points.length),
    glowDecaying: false,
    animationClock: 0,
    lastFrameTime: undefined,
  }
}

export function computeLedField(state: LedFieldState, time: number, brush: BrushState) {
  const firstFrame = state.lastFrameTime === undefined
  const frameDelta = firstFrame
    ? 0
    : Math.max(0, Math.min(time - state.lastFrameTime!, MAX_FRAME_DELTA))
  state.lastFrameTime = time
  state.animationClock += frameDelta
  const animTime = state.animationClock

  for (const [loopIndex, range] of state.loopRanges.entries()) {
    const comet = state.comets[loopIndex]!
    comet.center = wrapIndex(comet.center + comet.velocity * frameDelta, range.length)
    const size = COMET_LED_COUNT_MID + COMET_LED_COUNT_AMP * Math.sin(animTime * comet.freq + comet.phase)
    const half = Math.max(1, size * 0.5)
    const plateau = half * 0.5
    const fade = 0.5 + 0.5 * Math.sin(animTime * comet.fadeFreq + comet.fadePhase)
    for (let local = 0; local < range.length; local++) {
      const distance = Math.abs(signedWrappedDistance(local, comet.center, range.length))
      let profile: number
      if (distance <= plateau) profile = 1
      else profile = clamp01(1 - (distance - plateau) / Math.max(half - plateau, 1e-4))
      const brightness = clamp01(profile * fade)
      const base = (range.start + local) * LED_FLOATS
      state.data[base + 2] = brightness
      state.data[base + COLOR_OFFSET] = 1
      state.data[base + COLOR_OFFSET + 1] = 1
      state.data[base + COLOR_OFFSET + 2] = 1
    }
  }

  applyGlow(state, frameDelta, brush)
}

function applyGlow(state: LedFieldState, frameDelta: number, brush: BrushState) {
  const glowOn =
    brush.active && brush.isMouse && brush.glowEnabled && brush.glowStrength > 0 && brush.glowRadius > 0
  if (!glowOn && !state.glowDecaying) return

  const smoothing = brush.glowSmoothing
  const alpha = smoothing > 0 ? 1 - Math.exp(-frameDelta / smoothing) : 1
  const facingCosFull = Math.cos((FACING_FULL_DEG * Math.PI) / 180)
  const facingCosZero = Math.cos((FACING_ZERO_DEG * Math.PI) / 180)
  const facingDenom = facingCosFull - facingCosZero
  const count = state.data.length / LED_FLOATS
  let anyActive = false

  for (let i = 0; i < count; i++) {
    const base = i * LED_FLOATS
    let target = 0
    if (glowOn) {
      const dx = state.data[base]! - brush.x
      const dy = state.data[base + 1]! - brush.y
      const distance = Math.hypot(dx, dy)
      target = brush.glowStrength * (1 - smoothstep(0, brush.glowRadius, distance))
      if (brush.glowFacingEnabled && target > 0 && distance > 1e-4) {
        const nx = state.normals[i * 2]!
        const ny = state.normals[i * 2 + 1]!
        const cos = nx * (-dx / distance) + ny * (-dy / distance)
        const facing = facingDenom > 1e-6 ? clamp01((cos - facingCosZero) / facingDenom) : cos >= facingCosFull ? 1 : 0
        target *= facing
      }
    }
    const eased = (state.glowState[i] ?? 0) + (target - (state.glowState[i] ?? 0)) * alpha
    state.glowState[i] = eased
    if (eased > 0.0001) {
      anyActive = true
      state.data[base + 2] = mix(state.data[base + 2]!, 1, eased)
    }
  }
  state.glowDecaying = glowOn || anyActive
}

function signedWrappedDistance(a: number, b: number, period: number) {
  if (period <= 0) return 0
  return ((((a - b) % period) + period + period / 2) % period) - period / 2
}

function wrapIndex(value: number, period: number) {
  if (period <= 0) return 0
  return ((value % period) + period) % period
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

function mix(a: number, b: number, t: number) {
  return a + (b - a) * t
}
