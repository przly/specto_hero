import { useEffect, useRef } from 'react'

/* Plays an image sequence on a <canvas>.
   `playing` true  → runs forward to the last frame and holds.
   `playing` false → runs backward to the first frame and holds.
   Flipping `playing` mid-way reverses from the current frame, so a quick
   hover-in / hover-out never jumps. Time-based, so speed is the same at
   60Hz and 120Hz. With prefers-reduced-motion the first frame stays put. */

type FrameSequenceProps = {
  frames: string[]
  playing: boolean
  fps?: number
  className?: string
  label?: string
}

export default function FrameSequence({ frames, playing, fps = 60, className, label }: FrameSequenceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imagesRef = useRef<(HTMLImageElement | null)[]>([])
  const positionRef = useRef(0) // current frame, fractional
  const drawnRef = useRef(-1)
  const rafRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number | null>(null)
  const playingRef = useRef(playing)

  const draw = (index: number) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    // Fall back to the nearest loaded frame below, so nothing blanks out
    // while the rest of the sequence is still downloading.
    let i = index
    while (i > 0 && !imagesRef.current[i]) i--
    const img = imagesRef.current[i]
    if (!img || i === drawnRef.current) return

    if (canvas.width !== img.naturalWidth) {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0)
    drawnRef.current = i
  }

  // Preload + decode every frame up front.
  useEffect(() => {
    let cancelled = false
    imagesRef.current = new Array(frames.length).fill(null)
    drawnRef.current = -1
    positionRef.current = 0

    frames.forEach((src, i) => {
      const img = new Image()
      img.src = src
      img
        .decode()
        .then(() => {
          if (cancelled) return
          imagesRef.current[i] = img
          if (Math.round(positionRef.current) >= i) {
            drawnRef.current = -1
            draw(Math.round(positionRef.current))
          }
        })
        .catch(() => {})
    })

    return () => {
      cancelled = true
    }
  }, [frames])

  // One loop per `playing` value. The frame position lives in a ref, so
  // restarting the loop on every hover change continues from where it was.
  useEffect(() => {
    playingRef.current = playing

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return

    const last = frames.length - 1
    lastTimeRef.current = null

    const tick = (time: number) => {
      const prev = lastTimeRef.current ?? time
      lastTimeRef.current = time
      const dt = Math.min((time - prev) / 1000, 0.1) // clamp after tab switches
      const dir = playingRef.current ? 1 : -1

      positionRef.current = Math.min(last, Math.max(0, positionRef.current + dir * dt * fps))
      draw(Math.round(positionRef.current))

      const done = dir === 1 ? positionRef.current >= last : positionRef.current <= 0
      rafRef.current = done ? null : requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [playing, fps, frames.length])

  return <canvas ref={canvasRef} className={className} role="img" aria-label={label} />
}
