import { useSyncExternalStore } from 'react'

// The voice engine lives in VoiceHost, beside the screens rather than inside
// them, so its state and controls reach the screens through this small store.
// Both engines (headless hook, <AiVoiceAvatar>) publish the same shape.

export type VoiceStatus = 'loading' | 'idle' | 'listening' | 'thinking' | 'speaking'

export type VoiceState = {
  status: VoiceStatus
  // Last thing Whisper heard (for the mic check).
  heard: string
  micError: string | null
}

export type VoiceControls = {
  startListening: () => Promise<void>
  stopListening: () => void
  interrupt: () => void
  speak: (text: string) => void
}

const initial: VoiceState = { status: 'loading', heard: '', micError: null }
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

// Loudness, once per frame from the package, kept out of React state: the mic
// meter (and later the phone-screen orb) read it in their own animation loop.
export type AudioLevel = { level: number; source: 'mic' | 'tts' | 'idle' }
let audioLevel: AudioLevel = { level: 0, source: 'idle' }

export function setAudioLevel(level: number, source: AudioLevel['source']) {
  audioLevel = { level, source }
}

export function getAudioLevel(): AudioLevel {
  return audioLevel
}

// For code outside React (the interview session): called on every change.
export function onVoiceChange(listener: (state: VoiceState) => void): () => void {
  const wrapped = () => listener(state)
  listeners.add(wrapped)
  return () => listeners.delete(wrapped)
}

export function useVoice(): VoiceState {
  return useSyncExternalStore(subscribe, () => state)
}
