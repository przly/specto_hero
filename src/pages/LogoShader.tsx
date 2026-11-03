import { useEffect, useRef, useState } from 'react'
import { createRenderer } from '../logoShader/renderer'
import './LogoShader.css'

export default function LogoShader() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [unsupported, setUnsupported] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const renderer = createRenderer({
      canvas,
      onError: () => setUnsupported(true),
    })
    renderer.ready.catch(() => {})
    return () => renderer.dispose()
  }, [])

  return (
    <div className="logo-shader-page">
      <canvas ref={canvasRef} className="logo-shader-canvas" />
      {unsupported ? (
        <p className="logo-shader-fallback">
          This effect needs a browser with WebGPU support (recent Chrome, Edge, or Safari Technology
          Preview).
        </p>
      ) : null}
    </div>
  )
}
