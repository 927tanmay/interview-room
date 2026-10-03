import { useSyncExternalStore } from 'react'

// The voice engine lives in EngineHost, beside the screens rather than inside
// them, so its state and controls reach the screens through this small store.
// Both engines (headless hook, <AiVoiceAvatar>) publish the same shape.

export type VoiceStatus = 'loading' | 'idle' | 'listening' | 'thinking' | 'speaking'

export type VoiceState = {
  status: VoiceStatus
  // Last thing Whisper heard, and what the interviewer is saying this turn.
  heard: string
  said: string
  micError: string | null
}

export type VoiceControls = {
  startListening: () => Promise<void>
  stopListening: () => void
  interrupt: () => void
  speak: (text: string) => void
}

const initial: VoiceState = { status: 'loading', heard: '', said: '', micError: null }
let state = initial
let controls: VoiceControls | null = null
const listeners = new Set<() => void>()

export function setVoice(patch: Partial<VoiceState>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

export function resetVoice() {
  controls = null
  setVoice(initial)
}

export function registerVoiceControls(c: VoiceControls | null) {
  controls = c
}

export function voiceControls(): VoiceControls | null {
  return controls
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useVoice(): VoiceState {
  return useSyncExternalStore(subscribe, () => state)
}
