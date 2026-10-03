import { useEffect, type Dispatch } from 'react'
import { useAiVoiceAvatar } from 'react-ai-voice-avatar/headless'
import type { LoadAction, LoadItemId } from './loading'
import { registerVoiceControls, setVoice } from './voiceStore'
import { onTranscript, type EngineProps } from './engineEvents'

// The package's progress labels for the models we show.
const LABELS: Record<string, LoadItemId> = { asr: 'whisper', kokoro: 'kokoro' }

// Phone screen: the package's headless hook runs hearing and voice, no
// three.js. `onSubmit` is supplied, so the package never downloads its own
// language model; replies come from the app's Gemma through EngineHost.
// Listening starts from the Start interview press (a user gesture), after the
// setup screen has said why the microphone is needed.
export function PhoneEngine({ onLoad, onSubmit, onInterrupt }: EngineProps & { onLoad: Dispatch<LoadAction> }) {
  const voice = useAiVoiceAvatar({
    ttsEngine: 'kokoro',
    ttsVoice: 'af_heart',
    onSubmit,
    onUserInterrupt: onInterrupt,
    onTranscriptUpdate: onTranscript,
    loadingProgress: (pct, label) => {
      const id = LABELS[label]
      if (id) onLoad({ type: 'progress', id, pct })
    },
    onError: (e) => {
      if (e.stage === 'microphone') setVoice({ micError: e.message })
      if (e.severity !== 'fatal') return
      if (e.stage === 'speech-recognition') onLoad({ type: 'failed', id: 'whisper', message: e.message })
      else if (e.stage === 'speech-synthesis') onLoad({ type: 'failed', id: 'kokoro', message: e.message })
    },
  })

  // The hook leaves 'loading' once hearing and voice are both up.
  const loaded = voice.status !== 'loading'
  useEffect(() => {
    if (!loaded) return
    onLoad({ type: 'ready', id: 'whisper' })
    onLoad({ type: 'ready', id: 'kokoro' })
  }, [loaded, onLoad])

  useEffect(() => {
    setVoice({ status: voice.status, micError: voice.micError })
  }, [voice.status, voice.micError])

  const { startListening, stopListening, interrupt, speak } = voice
  useEffect(() => {
    registerVoiceControls({ startListening, stopListening, interrupt, speak })
    return () => registerVoiceControls(null)
  }, [startListening, stopListening, interrupt, speak])

  return (
    <div className="stage stage-phone" aria-hidden="true">
      <p className="placeholder">Voice only</p>
    </div>
  )
}
