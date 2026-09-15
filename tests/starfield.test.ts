/** Unit tests for dsh-astra core modules. */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  generateStars, twinkleBrightness, frameBrightness,
  convergeStars, flowStars, burstBrightness, dimStars, starsByRow,
  seedRandom, setGlyphs,
} from '../src/starfield.js'
import { initialState, reduceState, burstMagnitude } from '../src/states.js'
import type { SessionEvent } from '../src/states.js'
import {
  detectColorDepth, resolveAstraMode, safeFps, starGlyphs, ansiForStar,
} from '../src/compat.js'
import type { Star, StarDensity, Viewport, TerminalColorDepth, TerminalCapabilities } from '../src/types.js'

const V30x20: Viewport = { columns: 30, rows: 20 }

function makeCaps(overrides: Partial<TerminalCapabilities> = {}): TerminalCapabilities {
  return {
    colorDepth: 'truecolor', isTTY: true, isDarkTheme: true,
    inTmux: false, inScreen: false, columns: 80, rows: 24, ...overrides,
  }
}

describe('generateStars', () => {
  it('generates stars within viewport bounds', () => {
    seedRandom(42)
    const stars = generateStars(V30x20, 'normal')
    assert.ok(stars.length > 0 && stars.length <= 200)
    for (const s of stars) {
      assert.ok(s.x >= 0 && s.x < 30)
      assert.ok(s.y >= 0 && s.y < 20)
      assert.ok(s.brightness >= 0.2 && s.brightness <= 1.0)
      assert.ok(s.phase >= 0 && s.phase <= Math.PI * 2)
      assert.ok(s.speed >= 0.5 && s.speed <= 2.0)
    }
  })
  it('sparse < dense', () => {
    seedRandom(42); const s = generateStars(V30x20, 'sparse')
    seedRandom(42); const d = generateStars(V30x20, 'dense')
    assert.ok(s.length < d.length)
  })
  it('is deterministic with same seed', () => {
    seedRandom(123); const a = generateStars(V30x20, 'normal')
    seedRandom(123); const b = generateStars(V30x20, 'normal')
    assert.equal(a.length, b.length)
    for (let i = 0; i < a.length; i++) assert.deepEqual(a[i], b[i])
  })
})

describe('twinkleBrightness', () => {
  it('stays in [0, baseBrightness]', () => {
    seedRandom(1); const stars = generateStars(V30x20, 'sparse')
    for (const s of stars) {
      for (let t = 0; t < 5000; t += 200) {
        const b = twinkleBrightness(s, t)
        assert.ok(b >= 0 && b <= s.brightness)
      }
    }
  })
  it('sinusoidal cycle', () => {
    const s: Star = { x: 10, y: 10, brightness: 0.8, phase: 0, speed: 1.0, glyph: '·', tint: [200,200,255] }
    const b0 = twinkleBrightness(s, 0)
    const b1 = twinkleBrightness(s, 625)
    assert.ok(b1 > b0)
    const b2 = twinkleBrightness(s, 1250)
    assert.ok(Math.abs(b2 - b0) < 0.01)
  })
})

describe('convergeStars', () => {
  it('pulls toward center', () => {
    const stars: Star[] = [
      { x: 5, y: 5, brightness: 0.5, phase: 0, speed: 1, glyph: '·', tint: [200,200,255] },
      { x: 25, y: 15, brightness: 0.5, phase: 0, speed: 1, glyph: '·', tint: [200,200,255] },
    ]
    const r = convergeStars(stars, V30x20, 100, 0.5)
    assert.ok(r[0].x > 5); assert.ok(r[0].y > 5)
    assert.ok(r[1].x < 25); assert.ok(r[1].y < 15)
  })
})

describe('flowStars', () => {
  it('drifts right with wrap', () => {
    const stars: Star[] = [
      { x: 28, y: 5, brightness: 0.5, phase: 0, speed: 1, glyph: '·', tint: [200,200,255] },
      { x: 10, y: 5, brightness: 0.5, phase: 0, speed: 1, glyph: '·', tint: [200,200,255] },
    ]
    const r = flowStars(stars, V30x20, 3)
    assert.equal(r[0].x, 1); assert.equal(r[1].x, 13)
  })
})

describe('burstBrightness / dimStars', () => {
  it('amplifies and dims', () => {
    const stars: Star[] = [{ x: 5, y: 5, brightness: 0.4, phase: 0, speed: 1, glyph: '·', tint: [200,200,255] }]
    assert.ok(burstBrightness(stars, 2.5)[0].brightness > 0.9)
    assert.ok(dimStars(stars, 0.25)[0].brightness < 0.3)
  })
})

describe('starsByRow', () => {
  it('groups and sorts', () => {
    const stars: Star[] = [
      { x: 10, y: 2, brightness: 0.5, phase: 0, speed: 1, glyph: '·', tint: [200,200,255] },
      { x: 5, y: 2, brightness: 0.5, phase: 0, speed: 1, glyph: '·', tint: [200,200,255] },
    ]
    const rows = starsByRow(stars, V30x20)
    assert.equal(rows[2].length, 2)
    assert.equal(rows[2][0].col, 5); assert.equal(rows[2][1].col, 10)
  })
})

describe('reduceState', () => {
  it('idle → thinking → working → completed → idle', () => {
    let f = initialState()
    assert.equal(f.state, 'idle')
    f = reduceState(f, { type: 'thinking/start' }); assert.equal(f.state, 'thinking')
    f = reduceState(f, { type: 'tool/start' }); assert.equal(f.state, 'working')
    f = reduceState(f, { type: 'turn/end' }); assert.equal(f.state, 'completed'); assert.ok(f.completedAt > 0)
    f = reduceState(f, { type: 'turn/start' }); assert.equal(f.state, 'idle')
  })
  it('handles error and interrupt', () => {
    assert.equal(reduceState(initialState(), { type: 'turn/error' }).state, 'error')
    assert.equal(reduceState(initialState(), { type: 'interrupt/x' }).state, 'interrupted')
  })
})

describe('burstMagnitude', () => {
  it('decays over time', () => {
    const f = { state: 'completed' as const, completedAt: 0 }
    assert.equal(burstMagnitude(f, 0, 2.5, 1500), 2.5)
    assert.ok(burstMagnitude(f, 1500, 2.5, 1500) < 1.05)
  })
  it('returns 1.0 for non-completed', () => {
    assert.equal(burstMagnitude({ state: 'idle', completedAt: 0 }, 0), 1.0)
  })
})

describe('resolveAstraMode', () => {
  it('respects off / non-TTY / light theme', () => {
    assert.equal(resolveAstraMode(false, makeCaps()), 'off')
    assert.equal(resolveAstraMode(true, makeCaps({ isTTY: false })), 'off')
    assert.equal(resolveAstraMode(true, makeCaps({ isDarkTheme: false })), 'off')
    assert.equal(resolveAstraMode(true, makeCaps()), 'on')
  })
})

describe('ansiForStar', () => {
  it('produces correct escapes', () => {
    const tc = ansiForStar(0.8, [200,200,255], 'truecolor', '·')
    assert.ok(tc.includes('\x1b[38;2;')); assert.ok(tc.endsWith('\x1b[0m'))
    assert.ok(ansiForStar(0.5, [200,200,255], '256', '·').includes('\x1b[38;5;'))
    assert.ok(ansiForStar(0.9, [200,200,255], '16', '.').includes('\x1b[1m'))
    assert.equal(ansiForStar(0.5, [200,200,255], 'none', '.'), '.')
  })
})
