import type { ComponentType } from 'react'

export interface SplitTextProps {
  text: string
  className?: string
  delay?: number
  duration?: number
  ease?: string | ((t: number) => number)
  splitType?: 'chars' | 'words' | 'lines' | string
  from?: Record<string, unknown>
  to?: Record<string, unknown>
  threshold?: number
  rootMargin?: string
  textAlign?: 'left' | 'center' | 'right' | 'justify'
  tag?: string
  staggerFrom?: string
  mask?: boolean
  effect?: string
  trigger?: 'view' | 'load' | 'hover' | 'click'
  loop?: boolean
  loopDelay?: number
  hoverEffect?: string
  color?: string
  accentColor?: string
  onLetterAnimationComplete?: () => void
}

declare const SplitText: ComponentType<SplitTextProps>
export default SplitText
