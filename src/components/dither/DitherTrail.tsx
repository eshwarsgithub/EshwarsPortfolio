import { useEffect, useRef } from 'react'
import { mountDither } from './engine'

// A full-page layer that turns cursor movement into a fluid trail of glyph cells.
// `difference` blending makes it read as dark ink on the light sections and light ink on the dark ones.
export default function DitherTrail() {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvas.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    return mountDither(canvas.current)
  }, [])

  return (
    <canvas
      ref={canvas}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 40, pointerEvents: 'none', mixBlendMode: 'difference' }}
    />
  )
}
