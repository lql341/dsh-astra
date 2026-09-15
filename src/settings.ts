/** /settings integration for dsh-astra. */
import type { Context } from '@deepseek-ai/cordis'
import type { AstraConfig } from './types.js'

export function registerSettings(
  ctx: Context,
  getConfig: () => AstraConfig,
  updateConfig: (patch: Partial<AstraConfig>) => void,
): (() => void) | undefined {
  const sections = ctx.get('tuiSettingsSections', false) as {
    register: (section: {
      id: string; title: string
      fields: Array<{
        key: string; label: string; type: 'boolean' | 'select' | 'number'
        get: () => boolean | string | number
        set: (value: boolean | string | number) => void
        options?: Array<{ value: string; label: string }>
        min?: number; max?: number; step?: number
      }>
    }) => () => void
  } | undefined
  if (sections === undefined) return undefined

  return sections.register({
    id: 'dsh-astra',
    title: 'dsh-astra 星空特效',
    fields: [
      {
        key: 'astra-enabled', label: '启用星空特效', type: 'boolean',
        get: () => getConfig().enabled,
        set: (val) => { updateConfig({ enabled: val as boolean }) },
      },
      {
        key: 'astra-density', label: '星点密度', type: 'select',
        get: () => getConfig().density,
        set: (val) => { updateConfig({ density: val as AstraConfig['density'] }) },
        options: [
          { value: 'sparse', label: '稀疏' },
          { value: 'normal', label: '正常' },
          { value: 'dense', label: '密集' },
        ],
      },
      {
        key: 'astra-fps', label: '动画帧率', type: 'number',
        get: () => getConfig().fps,
        set: (val) => { updateConfig({ fps: val as number }) },
        min: 4, max: 20, step: 2,
      },
    ],
  })
}
