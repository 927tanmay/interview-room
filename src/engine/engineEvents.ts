import { setVoice } from './voiceStore'

// What EngineHost hands each engine: the same for phone and video.
export type EngineProps = {
  onSubmit: (text: string, details?: { speechMs?: number }) => AsyncIterable<string> | string
  onInterrupt: () => void
}

let saidThisTurn = ''

// Captions for both engines. The package reports what Whisper heard once per
// stretch of speech, and what the interviewer says a sentence at a time.
export function onTranscript(text: string, speaker: 'user' | 'avatar') {
  if (speaker === 'user') {
    saidThisTurn = ''
    setVoice({ heard: text })
  } else {
    saidThisTurn = saidThisTurn ? `${saidThisTurn} ${text}` : text
    setVoice({ said: saidThisTurn })
  }
}
