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
