import { clock, frameLoop, init, surface, type Gpu, type Surface } from 'vgpu'
import { createHeroRenderer, type HeroRenderer, type RenderSize } from './sceneRenderer'
import { DEFAULT_BRUSH } from './ledField'

interface RendererOptions {
  readonly canvas: HTMLCanvasElement
  readonly onError?: (error: unknown) => void
}

export function createRenderer(options: RendererOptions) {
  let disposed = false
  let gpu: Gpu | undefined
  let canvasSurface: Surface | undefined
  let scene: HeroRenderer | undefined
  let loop: { stop(): void } | undefined
  let observer: ResizeObserver | undefined
  let input: ReturnType<typeof installCanvasInput> | undefined
  let resizeFrame = 0
  let resizeGeneration = 0
  let pendingSize: RenderSize | undefined
  let lastDpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio

  const fail = (error: unknown): never => {
    dispose()
    options.onError?.(error)
    throw error
  }
  const applyResize = () => {
    resizeFrame = 0
    const size = pendingSize
    pendingSize = undefined
    if (disposed || !size || !scene || !canvasSurface) return
    const generation = ++resizeGeneration
    try {
      scene.rebuild({ width: size.width, height: size.height, dpr: canvasSurface.dpr })
      scene.setOutputTarget(canvasSurface)
      void scene.prewarm().catch((error: unknown) => {
        if (disposed || generation !== resizeGeneration) return
        fail(error)
      })
    } catch (error) {
      if (disposed || generation !== resizeGeneration) return
      fail(error)
    }
  }
  const resize = (size: RenderSize) => {
    if (disposed || size.width <= 0 || size.height <= 0) return
    pendingSize = size
    if (!resizeFrame) resizeFrame = requestAnimationFrame(applyResize)
  }
  const measure = () => {
    const rect = options.canvas.getBoundingClientRect()
    resize({ width: rect.width, height: rect.height })
  }
  const onWindowResize = () => {
    if (window.devicePixelRatio === lastDpr) return
    lastDpr = window.devicePixelRatio
    measure()
  }
  const dispose = () => {
    if (disposed) return
    disposed = true
    resizeGeneration++
    loop?.stop()
    loop = undefined
    if (resizeFrame) cancelAnimationFrame(resizeFrame)
    resizeFrame = 0
    pendingSize = undefined
    observer?.disconnect()
    observer = undefined
    if (typeof window !== 'undefined') window.removeEventListener('resize', onWindowResize)
    input?.dispose()
    input = undefined
    scene?.destroy()
    scene = undefined
    canvasSurface?.dispose()
    canvasSurface = undefined
    gpu?.dispose()
    gpu = undefined
  }
  const initialize = async () => {
    const nextGpu = await init()
    if (disposed) {
      nextGpu.dispose()
      return
    }
    gpu = nextGpu
    canvasSurface = surface(gpu, options.canvas, { dpr: [1, 2] })
    const nextScene = createHeroRenderer(gpu, { css: cssSizeOf(options.canvas, canvasSurface.dpr) })
    scene = nextScene
    nextScene.setOutputTarget(canvasSurface)
    await nextScene.prewarm()
    if (disposed) {
      nextScene.destroy()
      return
    }
    input = installCanvasInput(options.canvas)
    observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure)
    observer?.observe(options.canvas)
    window.addEventListener('resize', onWindowResize)
    measure()
    const time = clock(gpu)
    loop = frameLoop(gpu, (currentFrame) => {
      if (disposed || !scene || !input || !gpu) return
      scene.setBrush(input.brush())
      scene.renderFrame(currentFrame, { time: time.time })
    })
  }
  const ready = initialize().catch((error: unknown) => {
    if (disposed) return
    fail(error)
  })
  return { ready, resize, dispose }
}

function cssSizeOf(canvas: HTMLCanvasElement, dpr: Surface['dpr']) {
  const rect = canvas.getBoundingClientRect()
  return {
    width: Math.max(1, rect.width || canvas.clientWidth || canvas.width / dpr),
    height: Math.max(1, rect.height || canvas.clientHeight || canvas.height / dpr),
    dpr,
  }
}

function installCanvasInput(canvas: HTMLCanvasElement) {
  let currentBrush = { ...DEFAULT_BRUSH }
  let activePointer: number | undefined
  const previousTouchAction = canvas.style.touchAction
  canvas.style.touchAction = 'none'

  const leave = () => {
    currentBrush = { ...DEFAULT_BRUSH }
  }
  const update = (event: PointerEvent) => {
    if (!event.isPrimary || (activePointer !== undefined && event.pointerId !== activePointer)) return
    const rect = canvas.getBoundingClientRect()
    const width = Math.max(1, rect.width)
    const height = Math.max(1, rect.height)
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    if (x < 0 || x > width || y < 0 || y > height) {
      leave()
      return
    }
    currentBrush = {
      ...DEFAULT_BRUSH,
      x,
      y,
      active: true,
      isMouse: event.pointerType === 'mouse',
    }
  }
  const down = (event: PointerEvent) => {
    if (!event.isPrimary || activePointer !== undefined) return
    activePointer = event.pointerId
    canvas.setPointerCapture?.(event.pointerId)
    update(event)
  }
  const move = (event: PointerEvent) => {
    update(event)
  }
  const up = (event: PointerEvent) => {
    if (!event.isPrimary || (activePointer !== undefined && event.pointerId !== activePointer)) return
    update(event)
    if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
    activePointer = undefined
  }
  const cancel = (event: PointerEvent) => {
    if (event.pointerId !== activePointer) return
    if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
    activePointer = undefined
    leave()
  }
  const pointerLeave = () => {
    if (activePointer === undefined) leave()
  }
  canvas.addEventListener('pointerdown', down)
  canvas.addEventListener('pointermove', move, { passive: true })
  canvas.addEventListener('pointerup', up, { passive: true })
  canvas.addEventListener('pointercancel', cancel)
  canvas.addEventListener('pointerleave', pointerLeave)
  return {
    brush: () => currentBrush,
    dispose() {
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', cancel)
      canvas.removeEventListener('pointerleave', pointerLeave)
      if (activePointer !== undefined && canvas.hasPointerCapture?.(activePointer)) {
        canvas.releasePointerCapture(activePointer)
      }
      activePointer = undefined
      canvas.style.touchAction = previousTouchAction
    },
  }
}
