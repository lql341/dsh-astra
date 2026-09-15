/** Slash-command handlers: /astra on|off|status|toggle */
import type { Context } from '@deepseek-ai/cordis'
import type { AstraConfig } from './types.js'

export function registerAstraCommands(
  ctx: Context,
  getConfig: () => AstraConfig,
  setEnabled: (enabled: boolean) => void,
): void {
  const commands = ctx.get('commands') as {
    register: (def: {
      name: string; description?: string
      handler: (session: unknown, args: string[]) => Promise<{ display: string }>
    }) => () => void
  } | undefined
  if (commands === undefined) return

  commands.register({
    name: 'astra',
    description: 'Manage dsh-astra starfield: on | off | status | toggle',
    handler: async (_session: unknown, args: string[]) => {
      const sub = (args[0] ?? 'status').toLowerCase()
      switch (sub) {
        case 'on': setEnabled(true); return { display: '✨ Astra starfield: ON' }
        case 'off': setEnabled(false); return { display: '🌑 Astra starfield: OFF' }
        case 'toggle': {
          const cur = getConfig().enabled; setEnabled(!cur)
          return { display: cur ? '🌑 Astra starfield: OFF' : '✨ Astra starfield: ON' }
        }
        default: {
          const cfg = getConfig()
          const env = process.env.DSH_TUI_ASTRA_EFFECT ?? 'auto'
          return { display: cfg.enabled
            ? `✨ Astra starfield: ON  (${cfg.density}, ${cfg.fps}fps, env=${env})`
            : `🌑 Astra starfield: OFF (env=${env})` }
        }
      }
    },
  })
}
