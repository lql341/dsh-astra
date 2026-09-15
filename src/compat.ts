/**
 * Terminal capability detection and graceful degradation.
 * @module dsh-astra/compat
 */
import type { TerminalCapabilities, TerminalColorDepth } from './types.js'

export function detectColorDepth(): TerminalColorDepth {
  const ct = (process.env.COLORTERM ?? '').toLowerCase()
  if (ct === 'truecolor' || ct === '24bit') return 'truecolor'
  const tp = (process.env.TERM_PROGRAM ?? '').toLowerCase()
  if (['iterm.app','warp','wezterm','kitty','ghostty'].includes(tp)) return 'truecolor'
  if (process.env.NO_COLOR !== undefined) return 'none'
  const t = (process.env.TERM ?? '').toLowerCase()
  if (t.includes('256color') || t === 'xterm-kitty' || t === 'wezterm') return '256'
  if (t.includes('color') || t === 'xterm' || t.includes('ansi')) return '16'
  return '256'
}

export function detectTTY(): boolean { return process.stdout.isTTY === true }

export function detectDarkTheme(themeName?: string): boolean {
  if (themeName === 'light' || themeName === 'light-ansi') return false
  if (themeName !== undefined) return true
  const env = (process.env.DSH_TUI_THEME ?? '').toLowerCase()
  if (env === 'light' || env === 'light-ansi') return false
  if (env === 'dark' || env === 'dark-ansi') return true
  return true
}

export function detectMultiplexer(): { inTmux: boolean; inScreen: boolean } {
  return {
    inTmux: process.env.TMUX !== undefined || (process.env.TERM ?? '').startsWith('tmux'),
    inScreen: process.env.STY !== undefined && process.env.TERM === 'screen',
  }
}

export function probeCapabilities(opts?: {
  themeName?: string; columns?: number; rows?: number
}): TerminalCapabilities {
  const { inTmux, inScreen } = detectMultiplexer()
  return {
    colorDepth: detectColorDepth(),
    isTTY: detectTTY(),
    isDarkTheme: detectDarkTheme(opts?.themeName),
    inTmux, inScreen,
    columns: opts?.columns ?? (process.stdout.columns || 80),
    rows: opts?.rows ?? (process.stdout.rows || 24),
  }
}

export function resolveAstraMode(
  configEnabled: boolean, caps: TerminalCapabilities,
): 'on' | 'off' {
  const env = (process.env.DSH_TUI_ASTRA_EFFECT ?? 'auto').toLowerCase()
  if (env === 'off') return 'off'
  if (env === 'on') return 'on'
  if (!configEnabled || !caps.isTTY || !caps.isDarkTheme) return 'off'
  return 'on'
}

export function safeFps(configuredFps: number, caps: TerminalCapabilities): number {
  let fps = Math.max(4, Math.min(20, Math.round(configuredFps || 10)))
  if (caps.inTmux || caps.inScreen) fps = Math.min(fps, 4)
  return fps
}

export function starGlyphs(depth: TerminalColorDepth): string[] {
  switch (depth) {
    case 'truecolor': return ['·','•','✦','★','⋆','˚','✧','⭑','☾','☽','☼','✶','⁕','◎','◉','⊛','✺']
    case '256': return ['·','•','✦','★','⋆','˚','✧','☾','☼','◎','⊛']
    case '16': return ['.','*','+','o','O','@']
    default: return ['.','*','o']
  }
}

export function ansiForStar(
  brightness: number, tint: [number, number, number],
  depth: TerminalColorDepth, glyph: string,
): string {
  const b = Math.max(0, Math.min(1, brightness))
  switch (depth) {
    case 'truecolor': {
      const f = Math.pow(b, 2.2)
      const r = Math.round(tint[0] * f)
      const g = Math.round(tint[1] * f)
      const bl = Math.round(tint[2] * f)
      return `\x1b[38;2;${r};${g};${bl}m${glyph}\x1b[0m`
    }
    case '256': {
      const lvl = Math.round(b * 23) + 232
      return `\x1b[38;5;${lvl}m${glyph}\x1b[0m`
    }
    case '16': {
      if (b > 0.66) return `\x1b[1m${glyph}\x1b[0m`
      if (b > 0.33) return glyph
      return `\x1b[2m${glyph}\x1b[0m`
    }
    default: return glyph
  }
}
