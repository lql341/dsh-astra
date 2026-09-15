/** Slash-command handlers: /astra on|off|status|toggle */
import type { Context } from '@deepseek-ai/cordis'
import type { AstraConfig, AstraIntensity, AstraColor } from './types.js'

const INTENSITIES: AstraIntensity[] = ['off', 'spark', 'luna', 'terra', 'sol', 'astra']

export function registerAstraCommands(
  ctx: Context,
  getConfig: () => AstraConfig,
  update: (patch: Partial<AstraConfig>) => void,
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
    description: 'Starfield: off | spark | luna | terra | sol | astra | color',
    handler: async ({ rawInput = '' }) => {
      const parts = rawInput.trim().split(/\s+/u).filter(Boolean)
      const sub = parts[0]?.toLowerCase() ?? 'status'
      switch (sub) {
        case 'on': {
          update({ enabled: true, intensity: lastIntensity }); return { kind: 'success', text: `✨ Astra starfield: ${lastIntensity}` }
        }
        case 'off': {
          const current = getConfig().intensity
          if (current !== 'off') lastIntensity = current
          update({ enabled: false, intensity: 'off' }); return { kind: 'success', text: '🌑 Astra starfield: OFF' }
        }
        case 'toggle': {
          const cur = getConfig().enabled && getConfig().intensity !== 'off'
          if (cur) {
            lastIntensity = getConfig().intensity
            update({ enabled: false, intensity: 'off' })
          } else update({ enabled: true, intensity: lastIntensity })
          return { kind: 'success', text: cur ? '🌑 Astra starfield: OFF' : '✨ Astra starfield: ON' }
        }
        default: {
          if (INTENSITIES.includes(sub as AstraIntensity)) {
            const level = sub as AstraIntensity
            if (level !== 'off') lastIntensity = level
            update({ enabled: level !== 'off', intensity: level })
            return { kind: 'success', text: `✨ Astra intensity: ${level}` }
          }
          if (sub === 'color') {
            const color = parts[1]?.toLowerCase() as AstraColor | undefined
            if (color !== 'white' && color !== 'deepseek' && color !== 'gold') return { kind: 'success', text: '✨ Usage: /astra color white | deepseek | gold' }
            update({ color })
            return { kind: 'success', text: `🎨 Astra color: ${color}` }
          }
          const cfg = getConfig()
          const env = process.env.DSH_TUI_ASTRA_EFFECT ?? 'auto'
          return { kind: 'success', text: cfg.enabled && cfg.intensity !== 'off'
            ? `✨ Astra starfield: ON  (${cfg.intensity}, ${cfg.color}, ${cfg.density}, ${cfg.fps}fps, env=${env})`
            : `🌑 Astra starfield: OFF (env=${env})` }
        }
      }
    },
  })
}
