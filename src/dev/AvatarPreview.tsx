import { Canvas } from '@react-three/fiber'
import { useState } from 'react'
import { AiVoiceAvatar } from 'react-ai-voice-avatar'
import { HeadShot } from '../voice/HeadShot'

// Dev only (`?dev=avatar[&who=aarav]`): the avatar framing on the interview
// stage, with `loadModels={false}` so only the avatar file downloads (no
// Whisper, Kokoro or Gemma).
export default function AvatarPreview() {
  const who = new URLSearchParams(location.search).get('who') === 'aarav' ? 'aarav' : 'ananya'
  const [ready, setReady] = useState(false)
  return (
    <div className="app app--interview">
      <main>
        <p className="muted">Avatar framing preview ({who}). {ready ? 'Model loaded.' : 'Loading the avatar…'}</p>
      </main>
      <div className="voice-host">
        <div className="stage stage-video">
          <Canvas camera={{ position: [0, 1.5, 1.2], fov: 30 }}>
            <AiVoiceAvatar
              avatarPreset={who}
              lightingPreset="studio"
              loadModels={false}
              hideStatusPill
              showCaptions={false}
              onModelLoaded={() => setReady(true)}
            />
            <HeadShot ready={ready} />
          </Canvas>
        </div>
      </div>
    </div>
  )
}
