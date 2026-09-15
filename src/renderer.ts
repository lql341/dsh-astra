/**
 * Ink/React starfield renderer component.
 * @module dsh-astra/renderer
 */
import type { Star, StarDensity, Viewport, TerminalColorDepth, AstraIntensity, AstraColor } from './types.js'
import type { StateFrame } from './states.js'
import {
  generateStars, twinkleBrightness, frameBrightness,
  convergeStars, flowStars, burstBrightness, dimStars, starsByRow,
} from './starfield.js'
import { ansiForStar } from './compat.js'
import { burstMagnitude } from './states.js'

export interface HostUiKit {
  Box: React.ComponentType<Record<string, unknown>>
  Text: React.ComponentType<Record<string, unknown>>
  useTerminalSize: () => { columns: number; rows: number }
}

export interface RendererProps {
  React: typeof import('react')
  ui: HostUiKit
  stateFrame: StateFrame
  density: StarDensity
  intensity: AstraIntensity
  color: AstraColor
  fps: number
  colorDepth: TerminalColorDepth
  dark: boolean
  compact: boolean
  maxRows?: number
}

export function createStarfieldComponent() {
  return function StarfieldBackground(props: RendererProps): React.ReactNode {
    const { React, ui, stateFrame, density, intensity, color, fps, colorDepth, dark, compact, maxRows } = props
    const intensityScale: Record<AstraIntensity, number> = {
      off: 0, spark: 0.95, luna: 1.2, terra: 1.5, sol: 1.85, astra: 2.2,
    }
    const { columns, rows: termRows } = ui.useTerminalSize()
    const intervalMs = Math.round(1000 / Math.max(4, Math.min(20, fps)))

    const viewRows = compact ? (maxRows ?? 3) : termRows
    const viewport: Viewport = { columns, rows: viewRows }

    const [tick, setTick] = React.useState(0)
    React.useEffect(() => {
      const id = setInterval(() => setTick(t => t + 1), intervalMs)
      return () => clearInterval(id)
    }, [intervalMs])

    const starsRef = React.useRef<Star[] | null>(null)
    const vpKeyRef = React.useRef('')
    const vpKey = `${viewport.columns}x${viewport.rows}-${density}`
    if (starsRef.current === null || vpKeyRef.current !== vpKey) {
      starsRef.current = generateStars(viewport, density)
      vpKeyRef.current = vpKey
    }
    let stars = starsRef.current

    const nowMs = Date.now()
    switch (stateFrame.state) {
      case 'thinking': {
        const r = Math.max(viewport.columns, viewport.rows) * 0.7
        stars = convergeStars(stars, viewport, r, 0.15)
        break
      }
      case 'working':
        stars = flowStars(stars, viewport, 0.3); break
      case 'completed': {
        const mag = burstMagnitude(stateFrame, nowMs)
        if (mag > 1.01) stars = burstBrightness(stars, mag)
        break
      }
      case 'interrupted': case 'error':
        stars = dimStars(stars, 0.25); break
      default: break
    }

    const rowsData = starsByRow(stars, viewport)
    const elapsed = tick * intervalMs
    const lines: string[] = []
    for (let y = 0; y < viewport.rows; y++) {
      const rowStars = rowsData[y]
      if (rowStars.length === 0) { lines.push(''); continue }
      let line = ''; let lastCol = 0
      for (const { col, star } of rowStars) {
        const pad = col - lastCol
        if (pad > 0) line += ' '.repeat(pad)
        else if (pad < 0) continue
        const b = frameBrightness(star, elapsed, 0.03) * intensityScale[intensity]
        const tint = color === 'deepseek' ? [70, 120, 255] as [number, number, number]
          : color === 'gold' ? [255, 190, 65] as [number, number, number] : star.tint
        line += b > 0 ? ansiForStar(b, tint, colorDepth, star.glyph) : ' '
        lastCol = col + 1
      }
      if (lastCol < viewport.columns) line += ' '.repeat(viewport.columns - lastCol)
      lines.push(line)
    }

    if (!dark || intensity === 'off') return null

    return React.createElement(
      ui.Box,
      { flexDirection: 'column' } as Record<string, unknown>,
      ...lines.map((line, i) =>
        React.createElement(ui.Text, { key: `sr-${i}` }, line)),
    )
  }
}

export function createStatusViewComponent() {
  const Starfield = createStarfieldComponent()
  return function StatusStarfield(props: {
    React: typeof import('react')
    ui: {
      Box: React.ComponentType<Record<string, unknown>>
      Text: React.ComponentType<Record<string, unknown>>
      Image: React.ComponentType<Record<string, unknown>>
      useTerminalSize: () => { columns: number; rows: number }
    }
    stateFrame: StateFrame
    density: StarDensity
    intensity: AstraIntensity
    color: AstraColor
    fps: number
    colorDepth: TerminalColorDepth
    dark: boolean
  }): React.ReactNode {
    return Starfield({ ...props, compact: true, maxRows: 3 })
  }
}
