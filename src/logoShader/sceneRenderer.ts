import type { Bundle, Frame, FramePass, Gpu, StorageBuffer, Target } from 'vgpu'
import { bundle, draw, frame, geometry, storage, target } from 'vgpu'

import ledEmittersWgsl from './shaders/led-emitters.wgsl'
import radianceWgsl from './shaders/radiance.wgsl'
import floorNoiseWgsl from './shaders/floor-noise.wgsl'
import mainSceneFloorWgsl from './shaders/main-scene-floor.wgsl'

import { buildLogoLayout, getLogoOutline, SAMPLE_SPACING, type LogoLayout } from './svgOutline'
import { computeLedField, createLedField, DEFAULT_BRUSH, type BrushState, type LedFieldState } from './ledField'

const LOGO_HEIGHT_RATIO = 0.34
const LOGO_WIDTH_RATIO = 0.82
const RADIANCE_TARGET_SCALE = 0.5
const REFERENCE_PRESENTATION_HEIGHT = 480
const ABSORPTION = 2.2
const FALLOFF_POWER = 1
const INTENSITY_SCALE = 42
const LED_INTENSITY = 1
const BRIGHTNESS_MIN = 0.09
const BRIGHTNESS_MAX = 1
const LED_CLIP_EXPANSION = 1.2

export interface RenderSize {
  width: number
  height: number
}

export interface HeroRendererCss {
  width: number
  height: number
  dpr: number
}

export interface HeroRenderFrameArgs {
  time: number
}

export interface HeroRenderer {
  renderFrame(currentFrame: Frame, args: HeroRenderFrameArgs): void
  setOutputTarget(colorTarget: Target): void
  rebuild(css: HeroRendererCss): void
  setBrush(next: Partial<BrushState>): void
  prewarm(): Promise<void>
  destroy(): void
}

type DestroyableStorage = StorageBuffer & {
  readonly buffer?: { destroy(): void }
  destroy?: () => void
}

interface RendererParts {
  simulationSize: RenderSize
  presentationSize: RenderSize
  pixelRatio: number
  layout: LogoLayout
  ledField: LedFieldState
  segmentsStorage: DestroyableStorage
  ledStorage: DestroyableStorage
  ledGeometry: ReturnType<typeof geometry>
  lightSourcesTarget: Target
  radianceTarget: Target
  emittersDraw: ReturnType<typeof draw>
  emittersBundle: Bundle
  radianceBundle: Bundle
  floorBundle?: Bundle
}

export function createHeroRenderer(gpu: Gpu, opts: { css: HeroRendererCss; target?: Target }): HeroRenderer {
  const brush: BrushState = { ...DEFAULT_BRUSH }
  let outputTarget = opts.target
  let destroyed = false

  const outline = getLogoOutline()

  const noiseTarget = target(gpu, {
    size: [500, 500],
    format: 'rgba16float',
    label: 'specto-logo-floor-noise',
  })
  const noiseDraw = draw(gpu, { shader: floorNoiseWgsl, vertices: 3 })
  const radianceDraw = draw(gpu, { shader: radianceWgsl, vertices: 3 })
  const floorDraw = draw(gpu, { shader: mainSceneFloorWgsl, vertices: 3 })

  frame(gpu, (currentFrame: Frame) => {
    currentFrame.pass({ target: noiseTarget }, (pass: FramePass) => pass.draw(noiseDraw))
  })

  let parts = buildParts(opts.css)
  if (outputTarget) recordFloorBundle(parts, outputTarget)

  return {
    renderFrame(currentFrame, { time }) {
      if (destroyed || !outputTarget) return
      const current = parts
      computeLedField(current.ledField, time, brush)
      current.ledStorage.write(current.ledField.data.buffer as ArrayBuffer)
      currentFrame.pass(
        { target: current.lightSourcesTarget, clear: [0, 0, 0, 1000] },
        (pass: FramePass) => pass.bundles(current.emittersBundle),
      )
      currentFrame.pass(
        { target: current.radianceTarget, clear: [0, 0, 0, 1] },
        (pass: FramePass) => pass.bundles(current.radianceBundle),
      )
      const floorBundle = current.floorBundle ?? recordFloorBundle(current, outputTarget)
      currentFrame.pass(
        { target: outputTarget, clear: [0, 0, 0, 1] },
        (pass: FramePass) => pass.bundles(floorBundle),
      )
    },
    setOutputTarget(colorTarget) {
      outputTarget = colorTarget
      recordFloorBundle(parts, colorTarget)
    },
    rebuild(css) {
      if (destroyed) return
      const next = buildParts(css)
      destroyParts(parts)
      parts = next
      if (outputTarget) recordFloorBundle(parts, outputTarget)
    },
    setBrush(next) {
      Object.assign(brush, next)
    },
    async prewarm() {
      if (!outputTarget) return
      await Promise.all([
        floorDraw.compile({ colors: [outputTarget.format] }),
        parts.emittersDraw.compile(parts.lightSourcesTarget),
        radianceDraw.compile(parts.radianceTarget),
        noiseDraw.compile(noiseTarget),
      ])
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      destroyParts(parts)
    },
  }

  function recordFloorBundle(current: RendererParts, colorTarget: Target) {
    floorDraw.set({
      cfg: floorUniformData(current),
      radiance_tex: current.radianceTarget,
      light_sources_tex: current.lightSourcesTarget,
      segments: current.segmentsStorage,
      floor_noise_tex: noiseTarget,
    })
    const result = bundle(
      gpu,
      { target: { colors: [colorTarget.format] }, label: 'specto-logo-floor' },
      (recorded) => recorded.draw(floorDraw),
    )
    current.floorBundle = result
    return result
  }

  function buildParts(css: HeroRendererCss): RendererParts {
    const simulationSize = normalizedSize(css.width, css.height)
    const presentationSize = normalizedSize(css.width * css.dpr, css.height * css.dpr)
    const pixelRatio = normalizedPixelRatio(css.dpr)

    const layout = buildLogoLayout(outline, simulationSize, LOGO_HEIGHT_RATIO, LOGO_WIDTH_RATIO)
    const ledField = createLedField(layout)

    const segmentsStorage = storage(gpu, layout.segments.byteLength) as DestroyableStorage
    segmentsStorage.write(layout.segments.buffer as ArrayBuffer)

    const ledStorage = storage(gpu, ledField.data.byteLength) as DestroyableStorage
    ledStorage.write(ledField.data.buffer as ArrayBuffer)

    const spacingSim = SAMPLE_SPACING * layout.scale
    const emitterVertices = buildEmitterVertexData(layout, spacingSim)
    const ledGeometry = geometry(gpu, {
      label: 'specto-logo-led-emitters',
      buffers: [
        {
          data: emitterVertices.buffer as ArrayBuffer,
          stride: 12,
          attributes: { position: 'float32x2', led_index: 'float32' },
        },
      ],
    })

    const lightSourcesTarget = target(gpu, {
      size: [simulationSize.width, simulationSize.height],
      format: 'rgba16float',
      label: 'specto-logo-light-sources',
    })
    const radianceSize = normalizedSize(
      simulationSize.width * RADIANCE_TARGET_SCALE,
      simulationSize.height * RADIANCE_TARGET_SCALE,
    )
    const radianceTarget = target(gpu, {
      size: [radianceSize.width, radianceSize.height],
      format: 'rgba16float',
      label: 'specto-logo-radiance',
    })

    const emittersDraw = draw(gpu, {
      shader: ledEmittersWgsl,
      label: 'specto-logo-led-emitters-pass',
      geometry: ledGeometry,
      writeMask: ['r', 'g', 'b'],
      set: {
        cfg: {
          resolution: [simulationSize.width, simulationSize.height],
          tunables: [LED_INTENSITY, BRIGHTNESS_MIN, BRIGHTNESS_MAX, 0],
          led_clip: [LED_CLIP_EXPANSION, 0, 0, 0],
        },
        leds: ledStorage,
        segments: segmentsStorage,
      },
    })
    const emittersBundle = bundle(
      gpu,
      { target: lightSourcesTarget, label: 'specto-logo-led-emitters-pass' },
      (recorded) => recorded.draw(emittersDraw),
    )

    radianceDraw.set({
      cfg: radianceUniformData(simulationSize),
      leds: ledStorage,
    })
    const radianceBundle = bundle(
      gpu,
      { target: radianceTarget, label: 'specto-logo-radiance-pass' },
      (recorded) => recorded.draw(radianceDraw),
    )

    return {
      simulationSize,
      presentationSize,
      pixelRatio,
      layout,
      ledField,
      segmentsStorage,
      ledStorage,
      ledGeometry,
      lightSourcesTarget,
      radianceTarget,
      emittersDraw,
      emittersBundle,
      radianceBundle,
    }
  }

  function destroyParts(current: RendererParts) {
    current.segmentsStorage.destroy?.()
    current.segmentsStorage.buffer?.destroy()
    current.ledStorage.destroy?.()
    current.ledStorage.buffer?.destroy()
    current.ledGeometry.destroy()
    const lightSourcesTexture = current.lightSourcesTarget.color?.gpu ?? current.lightSourcesTarget.gpu
    lightSourcesTexture?.destroy?.()
    const radianceTexture = current.radianceTarget.color?.gpu ?? current.radianceTarget.gpu
    radianceTexture?.destroy?.()
  }
}

function radianceUniformData(simulationSize: RenderSize) {
  return {
    target_info: [RADIANCE_TARGET_SCALE, REFERENCE_PRESENTATION_HEIGHT / Math.max(simulationSize.height, 1), 0, 0],
    tunables: [LED_INTENSITY, BRIGHTNESS_MIN, BRIGHTNESS_MAX, 0],
    params: [ABSORPTION / Math.max(simulationSize.height, 1), FALLOFF_POWER, INTENSITY_SCALE, 0],
  }
}

function floorUniformData(parts: RendererParts) {
  const { simulationSize, presentationSize, pixelRatio, layout } = parts
  const transform = presentationSimulationTransform(simulationSize, presentationSize)
  const refScaleScreen = layout.refScale * transform.scale
  return {
    screen: [presentationSize.width, presentationSize.height, 0, pixelRatio],
    light_sources: [simulationSize.width, simulationSize.height, 0, 0],
    shape: [refScaleScreen, 0, 0, 0],
    radiance_fit: [
      transform.originX,
      transform.originY,
      simulationSize.width * transform.scale,
      simulationSize.height * transform.scale,
    ],
    sim_transform: [transform.originX, transform.originY, transform.scale, 0],
  }
}

function presentationSimulationTransform(simulationSize: RenderSize, presentationSize: RenderSize) {
  const scale = Math.max(0.001, presentationSize.height / Math.max(1, simulationSize.height))
  return {
    originX: (presentationSize.width - simulationSize.width * scale) * 0.5,
    originY: (presentationSize.height - simulationSize.height * scale) * 0.5,
    scale,
  }
}

function buildEmitterVertexData(layout: LogoLayout, spacingSim: number): Float32Array {
  const pad = Math.max(0.3, spacingSim * 0.12)
  const halfTangent = Math.max(0.5, spacingSim * 0.44)
  const halfNormal = Math.max(0.5, spacingSim * 0.85)
  const values: number[] = []
  for (const [i, p] of layout.ledPoints.entries()) {
    const tx = Math.cos(p.angle)
    const ty = Math.sin(p.angle)
    const corners = [
      { t: -halfTangent - pad, n: -halfNormal - pad },
      { t: halfTangent + pad, n: -halfNormal - pad },
      { t: halfTangent + pad, n: halfNormal + pad },
      { t: -halfTangent - pad, n: halfNormal + pad },
    ] as const
    const indices = [0, 1, 2, 0, 2, 3] as const
    for (const cornerIndex of indices) {
      const corner = corners[cornerIndex]
      values.push(p.x + tx * corner.t + p.nx * corner.n, p.y + ty * corner.t + p.ny * corner.n, i)
    }
  }
  return Float32Array.from(values)
}

function normalizedSize(width: number, height: number): RenderSize {
  return { width: Math.max(1, Math.floor(width)), height: Math.max(1, Math.floor(height)) }
}

function normalizedPixelRatio(value: number | undefined) {
  return Math.max(0.001, typeof value === 'number' && Number.isFinite(value) ? value : 1)
}
