/** Slash-command handlers: /astra on|off|status|toggle|layout */
import type { Context } from '@deepseek-ai/cordis'
import type { AstraConfig, AstraIntensity, AstraColor, AstraLayout } from './types.js'

const INTENSITIES: AstraIntensity[] = ['off', 'spark', 'luna', 'terra', 'sol', 'astra']

export function registerAstraCommands(
  ctx: Context,
  getConfig: () => AstraConfig,
  update: (patch: Partial<AstraConfig>) => void,
  afterUpdate?: (patch: Partial<AstraConfig>) => void,
): void {
  const commands = ctx.get('commands') as {
    register: (def: {
      name: string; description?: string
      handler: (invocation: { rawInput?: string }) => Promise<{ kind: 'success'; text: string }>
    }) => () => void
  } | undefined
  if (commands === undefined) return

  let lastIntensity: AstraIntensity = getConfig().intensity === 'off' ? 'astra' : getConfig().intensity

  commands.register({
    name: 'astra',
    description: 'Starfield: off | spark | luna | terra | sol | astra | color | layout',
    handler: async ({ rawInput = '' }) => {
      const parts = rawInput.trim().split(/\s+/u).filter(Boolean)
      const sub = parts[0]?.toLowerCase() ?? 'status'
      switch (sub) {
        case 'on': {
          const patch = { enabled: true, intensity: lastIntensity }
          update(patch); afterUpdate?.(patch); return { kind: 'success', text: `✨ Astra starfield: ${lastIntensity}` }
        }
        case 'off': {
          const current = getConfig().intensity
          if (current !== 'off') lastIntensity = current
          const patch = { enabled: false, intensity: 'off' as const }
          update(patch); afterUpdate?.(patch); return { kind: 'success', text: '🌑 Astra starfield: OFF' }
        }
        case 'toggle': {
          const cur = getConfig().enabled && getConfig().intensity !== 'off'
          if (cur) {
            lastIntensity = getConfig().intensity
            const patch = { enabled: false, intensity: 'off' as const }; update(patch); afterUpdate?.(patch)
          } else { const patch = { enabled: true, intensity: lastIntensity }; update(patch); afterUpdate?.(patch) }
          return { kind: 'success', text: cur ? '🌑 Astra starfield: OFF' : '✨ Astra starfield: ON' }
        }
        default: {
          if (INTENSITIES.includes(sub as AstraIntensity)) {
            const level = sub as AstraIntensity
            if (level !== 'off') lastIntensity = level
            const patch = { enabled: level !== 'off', intensity: level }
            update(patch); afterUpdate?.(patch)
            return { kind: 'success', text: `✨ Astra intensity: ${level}` }
          }
          if (sub === 'color') {
            const color = parts[1]?.toLowerCase() as AstraColor | undefined
            if (color !== 'white' && color !== 'deepseek' && color !== 'gold') return { kind: 'success', text: '✨ Usage: /astra color white | deepseek | gold' }
            const patch = { color }
            update(patch); afterUpdate?.(patch)
            return { kind: 'success', text: `🎨 Astra color: ${color}` }
          }
          if (sub === 'layout') {
            const layout = parts[1]?.toLowerCase() as AstraLayout | undefined
            if (layout !== 'auto' && layout !== 'full' && layout !== 'compact') {
              return { kind: 'success', text: '✨ Usage: /astra layout auto | full | compact' }
            }
            const patch = { layout }
            update(patch); afterUpdate?.(patch)
            return { kind: 'success', text: '✨ Astra layout: ' + layout }
          }
          const cfg = getConfig()
          const env = process.env.DSH_TUI_ASTRA_EFFECT ?? 'auto'
          return { kind: 'success', text: cfg.enabled && cfg.intensity !== 'off'
            ? `✨ Astra starfield: ON  (${cfg.intensity}, ${cfg.color}, ${cfg.density}, ${cfg.fps}fps, layout=${cfg.layout}, env=${env})`
            : `🌑 Astra starfield: OFF (env=${env})` }
        }
      }
    },
  })
}
