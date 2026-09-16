/** Host-independent render-surface selection. */

import type { AstraLayout } from './types.js'

export interface HostSurfaceCapabilities {
  ambient: boolean
  statusMaxRows?: number
}

export type RenderSurface =
  | { kind: 'ambient' }
  | { kind: 'bounded'; rows: number }
  | { kind: 'unavailable'; reason: string }

function bounded(rows: number | undefined): RenderSurface | undefined {
  if (rows === undefined || !Number.isFinite(rows)) return undefined
  const normalized = Math.floor(rows)
  return normalized >= 1 ? { kind: 'bounded', rows: normalized } : undefined
}

/**
 * Select the best surface without depending on React, Ink, or a specific host.
 * `full` is a preference rather than a hard failure: it safely degrades to a
 * bounded surface when the host cannot grant an ambient region.
 */
export function selectRenderSurface(
  layout: AstraLayout,
  capabilities: HostSurfaceCapabilities,
): RenderSurface {
  const status = bounded(capabilities.statusMaxRows)

  if (layout === 'compact') {
    return status ?? {
      kind: 'unavailable',
      reason: 'host does not expose a bounded render surface',
    }
  }

  if (capabilities.ambient) return { kind: 'ambient' }
  if (status !== undefined) return status

  return {
    kind: 'unavailable',
    reason: layout === 'full'
      ? 'host does not expose an ambient or bounded render surface'
      : 'host does not expose a compatible render surface',
  }
}
