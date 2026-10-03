import { useSyncExternalStore } from 'react'
import { onVoiceChange, voiceControls } from '../engine/voiceStore'
import type { GemmaClient } from '../gemma/GemmaClient'
import { pickQuestions, type Level, type Round, type Track } from './bank'
import { InterviewEngine, type EngineSnapshot } from './engine'
import type { Mood } from './lines'
import { makeWriter } from './writer'

// One interview at a time: connects the engine to the voice (speak, and
// knowing when the candidate starts talking again), to the app's Gemma (which
// EngineHost owns and attaches here), and to the screens (a snapshot store).

let gemma: GemmaClient | null = null
let engine: InterviewEngine | null = null
let snapshot: EngineSnapshot | null = null
let stopWatchingVoice: (() => void) | null = null
const listeners = new Set<() => void>()

export function attachGemma(client: GemmaClient | null) {
  gemma = client
}

export type InterviewSettings = {
  round: Round | 'full'
  track: Track
  level: Level
  count: number
  interviewer: string
  mood: Mood
  candidateName?: string
}

// Until the setup page has its options (step 4.1): a full loop for a junior
// frontend developer, friendly mood. Dev builds can try another round with
// `?round=behavioural|technical|hr`.
export function defaultSettings(): InterviewSettings {
  const devRound = import.meta.env.DEV ? new URLSearchParams(location.search).get('round') : null
  const round = devRound === 'behavioural' || devRound === 'technical' || devRound === 'hr' ? devRound : 'full'
  return { round, track: 'frontend', level: 'junior', count: 3, interviewer: 'Ananya', mood: 'friendly' }
}

export function startInterview(settings: InterviewSettings) {
  stopInterview()
  const questions = pickQuestions(settings)
  const persona = { interviewer: settings.interviewer, mood: settings.mood, track: settings.track, level: settings.level, candidateName: settings.candidateName }
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
