/**
 * Agent-state machine for dsh-astra.
 * @module dsh-astra/states
 */
import type { AgentState } from './types.js'

export interface SessionEvent { type: string; [key: string]: unknown }

export interface StateFrame {
  state: AgentState
  completedAt: number
}

const INITIAL: StateFrame = Object.freeze({ state: 'idle', completedAt: 0 })

export function initialState(): StateFrame { return INITIAL }

export function reduceState(prev: StateFrame, event: SessionEvent): StateFrame {
  switch (event.type) {
    case 'thinking/start': case 'reasoning/start':
      return { state: 'thinking', completedAt: prev.completedAt }
    case 'tool/start': case 'tool-call/start':
      return { state: 'working', completedAt: prev.completedAt }
    case 'turn/end': case 'assistant/finish':
      return { state: 'completed', completedAt: Date.now() }
    case 'turn/error':
      return { state: 'error', completedAt: prev.completedAt }
    case 'session/disposed':
      return { state: 'interrupted', completedAt: prev.completedAt }
    case 'turn/start':
      return { state: 'idle', completedAt: prev.completedAt }
    default:
      if (event.type.startsWith('interrupt/'))
        return { state: 'interrupted', completedAt: prev.completedAt }
      return prev
  }
}

export function burstMagnitude(
  frame: StateFrame, nowMs: number, peak = 2.5, decayMs = 1500,
): number {
  if (frame.state !== 'completed' || frame.completedAt === 0) return 1.0
  const elapsed = nowMs - frame.completedAt
  if (elapsed <= 0) return peak
  if (elapsed >= decayMs) return 1.0
  const t = elapsed / decayMs
  return 1.0 + (peak - 1.0) * Math.exp(-t * 4)
}
