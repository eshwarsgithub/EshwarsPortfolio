import { useEffect, useRef } from 'react'
import { mountScene } from './scene'

const two = (n: number) => String(Math.floor(n)).padStart(2, '0')

// A full-height showpiece: a turning 3D hand in glyph tiles inside a field of dust flying at the camera.
// The camera follows the cursor, and holding the mouse down speeds everything up.
export default function DitherScene() {
  const host = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const clock = useRef<HTMLSpanElement>(null)
  const rate = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!host.current || !canvas.current) return
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    return mountScene(canvas.current, host.current, still, (speed, elapsed) => {
      if (clock.current) clock.current.textContent = `${two(elapsed / 60)}:${two(elapsed % 60)}:${String(Math.floor((elapsed % 1) * 1000)).padStart(3, '0')}`
      if (rate.current) rate.current.textContent = `${speed.toFixed(2)}x`
    })
  }, [])

  const hud: React.CSSProperties = { position: 'absolute', bottom: 28, color: '#f0f0f0', fontVariantNumeric: 'tabular-nums', pointerEvents: 'none', userSelect: 'none' }

  return (
    <div
      ref={host}
      aria-hidden="true"
      style={{ position: 'relative', height: 'max(100vh, 520px)', overflow: 'hidden', borderRadius: 'inherit', background: '#080808', cursor: 'grab', userSelect: 'none' }}
    >
      <canvas ref={canvas} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
      <span ref={clock} className="mono" style={{ ...hud, left: 32 }}>
        00:00:000
      </span>
      <span className="mono" style={{ ...hud, right: 32, display: 'flex', gap: 12 }}>
        Hold for speed
        <span style={{ opacity: 0.5 }}>|</span>
        <span ref={rate} style={{ minWidth: '5ch', textAlign: 'right' }}>
          1.00x
        </span>
      </span>
    </div>
  )
}
