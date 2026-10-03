import { useEffect, type Dispatch } from 'react'
import { useAiVoiceAvatar } from 'react-ai-voice-avatar/headless'
import type { LoadAction, LoadItemId } from './loading'

// The package's progress labels for the models we show.
const LABELS: Record<string, LoadItemId> = { asr: 'whisper', kokoro: 'kokoro' }

// Phone screen: the package's headless hook runs hearing and voice, no
// three.js. `onSubmit` is supplied, so the package never downloads its own
// language model; replies come from the app's Gemma (step 3.x). Listening is
// not started here: the microphone is only opened after the mic check explains
// why (step 2.4).
export function PhoneEngine({ onLoad }: { onLoad: Dispatch<LoadAction> }) {
  const voice = useAiVoiceAvatar({
    ttsEngine: 'kokoro',
    // An empty reply means "say nothing, keep listening" (package 0.7.0).
    onSubmit: () => '',
    loadingProgress: (pct, label) => {
      const id = LABELS[label]
      if (id) onLoad({ type: 'progress', id, pct })
    },
    onError: (e) => {
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

  return (
    <div className="stage stage-phone" aria-hidden="true">
      <p className="placeholder">Voice only</p>
    </div>
  )
}
