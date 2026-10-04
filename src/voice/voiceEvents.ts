import type { Dispatch } from 'react'
import type { LoadAction } from './loading'
import { setVoice } from './voiceStore'

// What VoiceHost hands each engine: the same for phone and video.
export type VoiceProps = {
  onSubmit: (text: string, details?: { speechMs?: number }) => AsyncIterable<string> | string
  onInterrupt: () => void
  // The voice detector closed a stretch of speech (for the report's timings).
  onSpeechEnd: () => void
  // Kokoro voice id of the chosen interviewer.
  voice: string
}

// What Whisper heard, once per stretch of speech (the mic check shows it).
// The interview screen takes its captions from the interview engine instead,
// so the interviewer's sentences are not kept here.
export function onTranscript(text: string, speaker: 'user' | 'avatar') {
  if (speaker === 'user') setVoice({ heard: text })
}

// The package's error report, as both engines receive it.
type VoiceError = { stage: string; severity: 'degraded' | 'fatal'; message: string; detail?: string }

// Turns the package's errors into what the setup screen shows. Checked in the
// package (0.7.0):
// - Whisper loads in the ML worker's start-up step, so a failed download
//   arrives as stage 'worker' (or 'speech-recognition'), fatal.
// - A Kokoro failure arrives as 'speech-synthesis', only 'degraded': the
//   package quietly switches to its backup (MMS) voice. The interview must not
//   start on that voice unannounced, so Kokoro is marked failed and the setup
//   screen offers Try again (a fresh engine starts on Kokoro again).
// Once a model is ready, the load reducer ignores these, so errors later in
// the interview do not touch the setup state.
export function reportVoiceError(e: VoiceError, onLoad: Dispatch<LoadAction>) {
  if (e.stage === 'microphone') {
    setVoice({ micError: e.message })
    return
  }
  console.warn(`[voice] ${e.severity} error in ${e.stage}: ${e.message}`)
  if (e.stage === 'speech-synthesis') {
    onLoad({ type: 'failed', id: 'kokoro', message: e.message })
  } else if (e.severity === 'fatal' && (e.stage === 'speech-recognition' || e.stage === 'worker')) {
    onLoad({ type: 'failed', id: 'whisper', message: e.message })
  }
}
