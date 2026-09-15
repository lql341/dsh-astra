/**
 * Starfield generator and per-frame twinkle engine.
 * @module dsh-astra/starfield
 */
import type { Star, StarDensity, Viewport } from './types.js'

const MAX_STARS = 320

const DENSITY_FACTORS: Record<StarDensity, number> = {
  sparse: 3.5, normal: 7.5, dense: 12.0,
}

let GLYPHS: string[] = ['·','•','✦','★','⋆','˚','✧','⭑','☾','☽','☼','✶','⁕','◎','◉','⊛','✺']

const TINT_POOL: [number, number, number][] = [
  [180,200,255], [200,200,255], [220,210,255], [160,180,240], [200,220,255],
]

let _seed = 0x5a7a

export function seedRandom(seed: number): void { _seed = (seed >>> 0) || 0x5a7a }

function random(): number {
  _seed |= 0; _seed = (_seed + 0x6d2b79f5) | 0
  let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

function randInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min
}

export function setGlyphs(glyphs: string[]): void {
  GLYPHS = glyphs.length > 0 ? glyphs : ['·']
}

export function generateStars(viewport: Viewport, density: StarDensity): Star[] {
  const area = viewport.columns * viewport.rows
  const targetCount = Math.round((area / 100) * DENSITY_FACTORS[density])
  const count = Math.min(targetCount, MAX_STARS)
  const stars: Star[] = []
  for (let i = 0; i < count; i++) {
    stars.push({
      x: randInt(0, viewport.columns - 1),
      y: randInt(0, viewport.rows - 1),
      brightness: random() * 0.6 + 0.2,
      phase: random() * Math.PI * 2,
      speed: random() * 1.5 + 0.5,
      glyph: GLYPHS[randInt(0, GLYPHS.length - 1)],
      tint: TINT_POOL[randInt(0, TINT_POOL.length - 1)],
    })
  }
  return stars
}

export function twinkleBrightness(star: Star, timeMs: number): number {
  const periodMs = 2500 / star.speed
  const angle = (timeMs / periodMs) * Math.PI * 2 + star.phase
  return ((Math.sin(angle) + 1) / 2) * star.brightness
}

export function frameBrightness(star: Star, timeMs: number, minCutoff = 0.08): number {
  const b = twinkleBrightness(star, timeMs)
  return b < minCutoff ? 0 : b
}

export function convergeStars(
  stars: Star[], viewport: Viewport, radius: number, pull: number,
): Star[] {
  const cx = viewport.columns / 2, cy = viewport.rows / 2
  return stars.map(s => {
    const dx = cx - s.x, dy = cy - s.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < radius && dist > 1) {
      const factor = pull * (1 - dist / radius)
      return { ...s, x: s.x + dx * factor, y: s.y + dy * factor,
        brightness: Math.min(1, s.brightness * (1 + factor * 0.5)) }
    }
    return s
  })
}

export function flowStars(stars: Star[], viewport: Viewport, drift: number): Star[] {
  return stars.map(s => ({ ...s, x: (s.x + drift + viewport.columns) % viewport.columns }))
}

export function burstBrightness(stars: Star[], magnitude: number): Star[] {
  return stars.map(s => ({ ...s, brightness: Math.min(1, s.brightness * magnitude) }))
}

export function dimStars(stars: Star[], factor = 0.3): Star[] {
  return stars.map(s => ({ ...s, brightness: s.brightness * factor }))
}

export function starsByRow(
  stars: Star[], viewport: Viewport,
): Array<Array<{ col: number; star: Star }>> {
  const rows: Array<Array<{ col: number; star: Star }>> =
    Array.from({ length: viewport.rows }, () => [])
  for (const star of stars) {
    const y = Math.round(star.y)
    if (y >= 0 && y < viewport.rows) {
      rows[y].push({ col: Math.round(star.x), star })
    }
  }
  for (const row of rows) row.sort((a, b) => a.col - b.col)
  return rows
}
