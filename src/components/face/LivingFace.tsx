import { useEffect, useRef } from 'react'
import { mountFace } from './engine'
import './living-face.css'

// Every still in src/assets/face/ registers itself by filename (closed.webp -> "closed", grin.webp -> "grin", ...).
// `rest` falls back to the avatar prop, so the component works with no stills at all.
const found = import.meta.glob('../../assets/face/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const urls: Record<string, string> = {}
for (const [path, url] of Object.entries(found)) {
  const name = path.split('/').pop()!.replace(/\.webp$/, '')
  urls[name] = url
}

type Props = { avatar: string; alt: string; className?: string; hoverSelector?: string }

export default function LivingFace({ avatar, alt, className = '', hoverSelector }: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const fly = useRef<SVGSVGElement>(null)
  const hand = useRef<SVGSVGElement>(null)
  const fallback = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (!wrap.current || !canvas.current || !fly.current || !hand.current || !fallback.current) return
    return mountFace({
      wrap: wrap.current,
      canvas: canvas.current,
      fly: fly.current,
      hand: hand.current,
      fallback: fallback.current,
      restUrl: urls.rest ?? avatar,
      urls,
      hoverSelector,
    })
  }, [avatar, hoverSelector])

  return (
    <div ref={wrap} className={`face-wrap ${className}`}>
      <div className="face-inner">
        <img ref={fallback} className="face-fallback" src={urls.closed ?? urls.rest ?? avatar} alt={alt} draggable={false} />
        <canvas ref={canvas} className="face-gl" aria-hidden="true" />
        <div className="face-props" aria-hidden="true">
          <svg ref={fly} className="face-fly" viewBox="0 0 32 32">
            <path className="wing" d="M15 15C12 9.500 4.500 8.500 2 13c2.500 4.500 10 4.500 13 2z" />
            <path className="wing r" d="M17 15c3-5.500 10.500-6.500 13-2-2.500 4.500-10 4.500-13 2z" />
            <ellipse cx="16" cy="19.500" rx="4" ry="6.500" />
            <circle cx="16" cy="11.500" r="3.300" />
          </svg>
          <svg ref={hand} className="face-hand" viewBox="0 0 32 32">
            <path className="open" d="M10.500 16.500V8.200a1.800 1.800 0 0 1 3.600 0V14v-8a1.800 1.800 0 0 1 3.600 0V14 7a1.800 1.800 0 0 1 3.600 0v8-5a1.800 1.800 0 0 1 3.600 0v10.500c0 5-3.400 8.500-8.400 8.500-3.600 0-5.700-1.600-7.600-4.600l-3.500-5.600c-.6-1 .1-2.200 1.200-2.400 1-.2 1.900.2 2.600 1z" />
            <path className="grab" d="M10.500 17v-3.300a1.800 1.800 0 0 1 3.600 0V14v-1.800a1.800 1.800 0 0 1 3.600 0V14v-1.300a1.800 1.800 0 0 1 3.600 0V14v-.3a1.800 1.800 0 0 1 3.600 0v6.800c0 5-3.400 8.500-8.400 8.500-3.600 0-5.700-1.600-7.600-4.600l-2.300-3.700c-.6-1 .1-2.200 1.200-2.400 1-.2 1.900.2 2.700 1z" />
          </svg>
        </div>
      </div>
    </div>
  )
}
