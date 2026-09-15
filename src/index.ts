/**
 * dsh-astra — Astra-style starfield visual plugin for dsh-TUI.
 * @module dsh-astra
 */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { AstraConfig, TerminalCapabilities, AgentState } from './types.js'
import { probeCapabilities, resolveAstraMode, safeFps, starGlyphs } from './compat.js'
import { setGlyphs, seedRandom } from './starfield.js'
import { initialState, reduceState, type StateFrame, type SessionEvent } from './states.js'
import { createStatusViewComponent } from './renderer.js'
import { registerAstraCommands } from './commands.js'
import { registerSettings } from './settings.js'

export const name = 'dsh-astra'

export type Config = AstraConfig

export const Config: Schemastery<Config> = z.object({
  enabled: z.boolean().default(true),
  fps: z.number().min(4).max(20).default(10),
  density: z.union(['sparse', 'normal', 'dense']).default('sparse'),
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
    density: config.density ?? 'sparse',
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

  ctx.on('session/event', (_session: unknown, event: SessionEvent) => {
    state.stateFrame = reduceState(state.stateFrame, event)
  })

  const statusRuntime = ctx.get('tuiStatus', false) as {
    registerView: (
      descriptor: {
        key: string; maxRows?: 1 | 2 | 3
        component: React.ComponentType<{
          React: typeof import('react')
          ui: {
            Box: React.ComponentType<Record<string, unknown>>
            Text: React.ComponentType<Record<string, unknown>>
            Image: React.ComponentType<Record<string, unknown>>
            useTerminalSize: () => { columns: number; rows: number }
          }
        }>
      },
      identity?: Context,
    ) => (() => void) | undefined
  } | undefined

  let statusDisposer: (() => void) | undefined

  if (mode === 'on' && statusRuntime !== undefined) {
    const StatusView = createStatusViewComponent()
    statusDisposer = statusRuntime.registerView({
      key: 'dsh-astra:starfield',
      maxRows: 3,
      component: (props) => {
        if (state.React === null) state.React = props.React
        return StatusView({
          React: props.React, ui: props.ui,
          stateFrame: state.stateFrame,
          density: state.config.density,
          fps: state.effectiveFps,
          colorDepth: state.caps.colorDepth,
          dark: state.caps.isDarkTheme,
        })
      },
    }, ctx) ?? undefined
  }

  registerAstraCommands(ctx, () => state.config, (enabled) => {
    state.config = { ...state.config, enabled }
    state.mode = resolveAstraMode(enabled, state.caps)
    ctx.logger.info(`dsh-astra: ${enabled ? 'enabled' : 'disabled'} via /astra`)
  })

  registerSettings(ctx, () => state.config, (patch) => {
    state.config = { ...state.config, ...patch }
    state.mode = resolveAstraMode(state.config.enabled, state.caps)
    state.effectiveFps = safeFps(state.config.fps, state.caps)
  })

  ctx.effect(() => () => {
    statusDisposer?.()
    state.stateFrame = initialState()
    try { ctx.logger.info('dsh-astra: unloaded') } catch { /* logger may be disposed */ }
  })
}
