import { useEffect, type Dispatch } from 'react'
import { useAiVoiceAvatar } from 'react-ai-voice-avatar/headless'
import { Orb } from '../components/Orb'
import type { LoadAction, LoadItemId } from './loading'
import { registerVoiceControls, setAudioLevel, setVoice } from './voiceStore'
import { onTranscript, reportVoiceError, type VoiceProps } from './voiceEvents'

// The package's progress labels for the models we show.
const LABELS: Record<string, LoadItemId> = { asr: 'whisper', kokoro: 'kokoro' }

// Phone screen: the package's headless hook runs hearing and voice, no
// three.js. `onSubmit` is supplied, so the package never downloads its own
// language model; replies come from the app's Gemma through VoiceHost.
// Listening starts from the Start interview press (a user gesture), after the
// setup screen has said why the microphone is needed.
export function PhoneVoice({
  onLoad,
  onSubmit,
  onInterrupt,
  onSpeechEnd,
  voice: voiceId,
  name,
}: VoiceProps & { onLoad: Dispatch<LoadAction>; name: string }) {
  const voice = useAiVoiceAvatar({
    ttsEngine: 'kokoro',
    ttsVoice: voiceId,
    onAudioLevelChange: setAudioLevel,
    onSubmit,
    onUserInterrupt: onInterrupt,
    onInferenceStart: onSpeechEnd,
    onTranscriptUpdate: onTranscript,
    loadingProgress: (pct, label) => {
      const id = LABELS[label]
      if (id) onLoad({ type: 'progress', id, pct })
    },
    onError: (e) => reportVoiceError(e, onLoad),
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
      <Orb label={name} />
    </div>
  )
}
