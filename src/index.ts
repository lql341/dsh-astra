/**
 * dsh-astra — Astra-style starfield visual plugin for dsh-TUI.
 * @module dsh-astra
 */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type React from 'react'
import type { AstraConfig, TerminalCapabilities } from './types.js'
import { probeCapabilities, resolveAstraMode, safeFps, starGlyphs } from './compat.js'
import { setGlyphs, seedRandom } from './starfield.js'
import { initialState, reduceState, type StateFrame, type SessionEvent } from './states.js'
import { createStatusViewComponent, createStarfieldComponent } from './renderer.js'
import { registerAstraCommands } from './commands.js'
import { selectRenderSurface } from './surface.js'

export const name = 'dsh-astra'

export type Config = Partial<AstraConfig>

export const Config: Schemastery<Config> = z.object({
  enabled: z.boolean().default(true),
  fps: z.number().min(4).max(20).default(10),
  density: z.union(['sparse', 'normal', 'dense']).default('normal'),
  intensity: z.union(['off', 'spark', 'luna', 'terra', 'sol', 'astra']).default('astra'),
  color: z.union(['white', 'deepseek', 'gold']).default('white'),
  layout: z.union(['auto', 'full', 'compact']).default('auto'),
})

interface PluginState {
  config: AstraConfig
  caps: TerminalCapabilities
  mode: 'on' | 'off'
  effectiveFps: number
  stateFrame: StateFrame
  React: typeof import('react') | null
}

export function apply(ctx: Context, config: Config = {}): void {
  seedRandom(Date.now() & 0xffff)

  const resolved: AstraConfig = {
    enabled: config.enabled ?? true,
    fps: config.fps ?? 10,
    density: config.density ?? 'normal',
    intensity: config.intensity ?? 'astra',
    color: config.color ?? 'white',
    layout: config.layout ?? 'auto',
  }

  const caps = probeCapabilities()
  const mode = resolveAstraMode(resolved.enabled, caps)
  const effectiveFps = safeFps(resolved.fps, caps)
  setGlyphs(starGlyphs(caps.colorDepth))

  const state: PluginState = {
    config: resolved, caps, mode, effectiveFps,
    stateFrame: initialState(), React: null,
  }

  if (mode === 'on') {
    ctx.logger.info(
      `dsh-astra: active (${resolved.density}, ${effectiveFps}fps, ` +
      `${caps.colorDepth}, ${caps.isDarkTheme ? 'dark' : 'light'}, ${caps.columns}x${caps.rows})`)
  } else {
    const reason = !caps.isTTY ? 'non-TTY' : !caps.isDarkTheme ? 'light theme'
      : !resolved.enabled ? 'disabled' : 'env override'
    ctx.logger.info(`dsh-astra: inactive (${reason})`)
  }

  const onSessionEvent = ctx.on as unknown as (
    name: 'session/event',
    listener: (_session: unknown, event: SessionEvent) => void,
  ) => void
  onSessionEvent('session/event', (_session, event) => {
    state.stateFrame = reduceState(state.stateFrame, event)
  })

  type ViewProps = {
    React: typeof import('react')
    ui: {
      Box: React.ComponentType<Record<string, unknown>>
      Text: React.ComponentType<Record<string, unknown>>
      Image: React.ComponentType<Record<string, unknown>>
      useTerminalSize: () => { columns: number; rows: number }
    }
  }
  const statusRuntime = ctx.get('tuiStatus', false) as {
    registerView?: (descriptor: { key: string; maxRows?: 1 | 2 | 3; component: React.ComponentType<ViewProps> }, identity?: Context) => (() => void) | undefined
    registerAmbient?: (descriptor: { key: string; component: React.ComponentType<ViewProps> }, identity?: Context) => (() => void) | undefined
  } | undefined

  let statusDisposer: (() => void) | undefined
  let ambientDisposer: (() => void) | undefined

  if (mode === 'on' && statusRuntime !== undefined) {
    const surface = selectRenderSurface(resolved.layout, {
      ambient: typeof statusRuntime.registerAmbient === 'function',
      statusMaxRows: typeof statusRuntime.registerView === 'function' ? 3 : undefined,
    })
    const renderProps = (props: ViewProps) => ({
      React: props.React, ui: props.ui,
      stateFrame: state.stateFrame,
      density: state.config.density,
      intensity: state.config.intensity,
      color: state.config.color,
      fps: state.effectiveFps,
      colorDepth: state.caps.colorDepth,
      dark: state.caps.isDarkTheme,
    })
    if (surface.kind === 'ambient' && statusRuntime.registerAmbient !== undefined) {
      const Starfield = createStarfieldComponent()
      ambientDisposer = statusRuntime.registerAmbient({
        key: 'dsh-astra:ambient',
        component: (props) => Starfield({ ...renderProps(props), compact: false }),
      }, ctx) ?? undefined
    } else if (surface.kind === 'bounded' && statusRuntime.registerView !== undefined) {
      const StatusView = createStatusViewComponent()
      const maxRows = Math.max(1, Math.min(3, surface.rows)) as 1 | 2 | 3
      statusDisposer = statusRuntime.registerView({
        key: 'dsh-astra:starfield', maxRows,
        component: (props) => StatusView(renderProps(props)),
      }, ctx) ?? undefined
    } else if (surface.kind === 'unavailable') {
      ctx.logger.warn(`dsh-astra: inactive (${surface.reason})`)
    }
  }

  registerAstraCommands(ctx, () => state.config, (patch) => {
    state.config = { ...state.config, ...patch }
    state.mode = resolveAstraMode(state.config.enabled && state.config.intensity !== 'off', state.caps)
    ctx.logger.info(`dsh-astra: ${state.config.intensity === 'off' ? 'disabled' : 'enabled'} via /astra`)
  })

  ctx.effect(() => () => {
    statusDisposer?.()
    ambientDisposer?.()
    state.stateFrame = initialState()
    try { ctx.logger.info('dsh-astra: unloaded') } catch { /* logger may be disposed */ }
  })
}
