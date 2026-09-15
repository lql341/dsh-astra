/** Public types for dsh-astra. @module dsh-astra/types */

export type AstraMode = 'auto' | 'on' | 'off'

export type AgentState =
  | 'idle' | 'thinking' | 'working' | 'completed' | 'interrupted' | 'error'

export type StarDensity = 'sparse' | 'normal' | 'dense'
export type AstraIntensity = 'off' | 'spark' | 'luna' | 'terra' | 'sol' | 'astra'
export type AstraColor = 'white' | 'deepseek' | 'gold'

export interface Star {
  x: number; y: number
  brightness: number
  phase: number
  speed: number
  glyph: string
  tint: [number, number, number]
}

export interface AstraConfig {
  enabled: boolean
  fps: number
  density: StarDensity
  intensity: AstraIntensity
  color: AstraColor
}

export type TerminalColorDepth = 'truecolor' | '256' | '16' | 'none'

export interface TerminalCapabilities {
  colorDepth: TerminalColorDepth
  isTTY: boolean
  isDarkTheme: boolean
  inTmux: boolean
  inScreen: boolean
  columns: number
  rows: number
}

export interface Viewport {
  columns: number
  rows: number
}
