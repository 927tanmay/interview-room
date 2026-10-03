import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useRef, type Dispatch } from 'react'
import { AiVoiceAvatar, type AiVoiceAvatarHandle } from 'react-ai-voice-avatar'
import { usePrefersReducedMotion } from '../app/usePrefersReducedMotion'
import { onTranscript, type VoiceProps } from './voiceEvents'
import type { LoadAction, LoadItemId } from './loading'
import { registerVoiceControls, setAudioLevel, setVoice } from './voiceStore'

const LABELS: Record<string, LoadItemId> = { asr: 'whisper', kokoro: 'kokoro' }

// Video interview: <AiVoiceAvatar> runs hearing, voice and lip sync and draws
// the avatar. It runs its own copy of the package's hook, so it gets the same
// config as PhoneVoice (TASKS.md: the Video vs Phone workaround). Default
// export for React.lazy, so three.js only loads for a video interview.
// The app draws its own state, question and captions, so the package's pill
// and captions are off. Reduced motion: no gestures (lip sync stays).
export default function VideoVoice({
  onLoad,
  visible,
  onSubmit,
  onInterrupt,
  voice,
  avatar: avatarPreset,
}: VoiceProps & { onLoad: Dispatch<LoadAction>; visible: boolean; avatar: 'ananya' | 'aarav' }) {
  const reducedMotion = usePrefersReducedMotion()
  const avatar = useRef<AiVoiceAvatarHandle>(null)

  // The handle's methods are read at call time, so the controls stay valid
  // whatever the avatar re-renders.
  useEffect(() => {
    registerVoiceControls({
      startListening: () => avatar.current?.startListening() ?? Promise.resolve(),
      stopListening: () => avatar.current?.stopListening(),
      interrupt: () => avatar.current?.interrupt(),
      speak: (text) => avatar.current?.speak(text),
    })
    return () => registerVoiceControls(null)
  }, [])

  const loadingProgress = useCallback(
    (value: number, label: string) => {
      // The avatar reports a fraction (0-1); the models report percent.
      if (label.startsWith('avatar-')) onLoad({ type: 'progress', id: 'avatar', pct: value * 100 })
      else if (LABELS[label]) onLoad({ type: 'progress', id: LABELS[label], pct: value })
    },
    [onLoad],
  )

  return (
    <div className="stage stage-video">
      {/* No frames drawn while off stage on the setup screen: the GPU is busy
          loading the models. */}
      <Canvas
        camera={{ position: [0, 0.15, 2.2], fov: 32 }}
        frameloop={visible ? 'always' : 'demand'}
        aria-hidden="true"
      >
        <AiVoiceAvatar
          ref={avatar}
          avatarPreset={avatarPreset}
          lightingPreset="studio"
          ttsEngine="kokoro"
          ttsVoice={voice}
          onAudioLevelChange={setAudioLevel}
          onSubmit={onSubmit}
          onUserInterrupt={onInterrupt}
          onTranscriptUpdate={onTranscript}
          hideStatusPill
          showCaptions={false}
          gestures={!reducedMotion}
          loadingProgress={loadingProgress}
          onModelLoaded={() => onLoad({ type: 'ready', id: 'avatar' })}
          onStatusChange={(status) => {
            setVoice({ status })
            if (status === 'loading') return
            onLoad({ type: 'ready', id: 'whisper' })
            onLoad({ type: 'ready', id: 'kokoro' })
          }}
          onError={(e) => {
            if (e.stage === 'microphone') setVoice({ micError: e.message })
            if (e.severity !== 'fatal') return
            if (e.stage === 'speech-recognition') onLoad({ type: 'failed', id: 'whisper', message: e.message })
            else if (e.stage === 'speech-synthesis') onLoad({ type: 'failed', id: 'kokoro', message: e.message })
          }}
        />
      </Canvas>
    </div>
  )
}
