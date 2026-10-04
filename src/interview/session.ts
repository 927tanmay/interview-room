import { useSyncExternalStore } from 'react'
import { onVoiceChange, voiceControls } from '../voice/voiceStore'
import type { GemmaClient } from '../gemma/GemmaClient'
import { pickQuestions, type BankQuestion } from './bank'
import { InterviewEngine, type EngineSnapshot } from './engine'
import { FULL_LOOP_COUNT, INTERVIEWERS, type InterviewSettings } from './settings'
import { makeWriter } from './writer'

// One interview at a time: connects the engine to the voice (speak, and
// knowing when the candidate starts talking again), to the app's Gemma (which
// VoiceHost owns and attaches here), and to the screens (a snapshot store).

let gemma: GemmaClient | null = null
let engine: InterviewEngine | null = null
let snapshot: EngineSnapshot | null = null
let stopWatchingVoice: (() => void) | null = null
const listeners = new Set<() => void>()

export function attachGemma(client: GemmaClient | null) {
  gemma = client
}

// `only`: practice one question again (from the report) instead of a new set.
export function startInterview(settings: InterviewSettings, only: BankQuestion | null = null) {
  stopInterview()
  const questions = only ? [only] : pickQuestions({
    round: settings.round,
    track: settings.track,
    level: settings.level,
    count: settings.round === 'full' ? FULL_LOOP_COUNT : settings.count,
  })
  const persona = {
    interviewer: INTERVIEWERS[settings.interviewer].name,
    mood: settings.mood,
    track: settings.track,
    level: settings.level,
    candidateName: settings.candidateName.trim() || undefined,
  }
  engine = new InterviewEngine(
    { questions, ...persona },
    {
      speak: (text) => voiceControls()?.speak(text),
      write: gemma ? makeWriter(gemma, persona) : undefined,
      now: () => Date.now(),
      setTimer: (fn, ms) => setTimeout(fn, ms),
      clearTimer: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
      onChange: (s) => {
        snapshot = s
        listeners.forEach((l) => l())
      },
    },
  )
  // Signals from the voice: the candidate started talking again (their
  // answer is not over), the interviewer finished speaking (start counting
  // silence), the microphone went away (pause).
  let last = ''
  const unwatchVoice = onVoiceChange((v) => {
    if (v.status === 'listening' && last !== 'listening') engine?.userStartedSpeaking()
    if (last === 'speaking' && v.status !== 'speaking') engine?.interviewerFinished()
    if (v.micError) engine?.pause('mic')
    last = v.status
  })
  // A hidden tab pauses the interview and stops the voice mid-sentence.
  const onVisibility = () => {
    if (document.visibilityState !== 'hidden') return
    voiceControls()?.interrupt()
    engine?.pause('hidden')
  }
  document.addEventListener('visibilitychange', onVisibility)
  stopWatchingVoice = () => {
    unwatchVoice()
    document.removeEventListener('visibilitychange', onVisibility)
  }
  engine.start()
}

// The interview as it stands, for the report when it ends.
export function currentSnapshot(): EngineSnapshot | null {
  return engine?.snapshot() ?? null
}

export function stopInterview() {
  stopWatchingVoice?.()
  stopWatchingVoice = null
  engine?.end()
  engine = null
}

// What the package's onSubmit calls with each stretch of speech.
export function heard(text: string, speechMs?: number): '' {
  return engine?.heard(text, speechMs) ?? ''
}

// The voice detector waits this long in silence before closing a stretch of
// speech (the package's default `redemptionMs`; the app does not change it).
const DETECTOR_WAIT_MS = 1400

// The voice detector closed a stretch of speech (the package's
// onInferenceStart, fired before Whisper runs). The candidate stopped talking
// the detector's wait before now.
export function speechEnded() {
  engine?.speechEnded(Date.now() - DETECTOR_WAIT_MS)
}

export const interview = {
  done: () => engine?.done(),
  repeat: () => engine?.repeat(),
  skip: () => engine?.skip(),
  end: () => engine?.end(),
  pause: () => {
    voiceControls()?.interrupt()
    engine?.pause('button')
  },
  // From a click, so the microphone can be reopened after a hidden tab or a
  // lost device.
  resume: () => {
    void voiceControls()?.startListening()
    engine?.resume()
  },
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useInterview(): EngineSnapshot | null {
  return useSyncExternalStore(subscribe, () => snapshot)
}
