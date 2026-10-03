import { useEffect, useRef } from 'react'
import type { Display } from '../app/state'
import { ScreenFrame } from '../components/ScreenFrame'
import { useVoice, voiceControls, type VoiceStatus } from '../engine/voiceStore'
import { OPENING } from '../interview/placeholderBrain'

// One clear state, in words (UX.md: interview screen). 'idle' means the mic is
// open and waiting for speech, which to the candidate is listening too.
const STATE_LABEL: Record<VoiceStatus, string> = {
  loading: 'Getting ready',
  idle: 'Listening',
  listening: 'Listening',
  thinking: 'Thinking',
  speaking: 'Speaking',
}

// Step 2.1 wiring: the voice loop end to end with a placeholder interviewer.
// Phase 3 (engine) and step 4.2 (room layout, timer, controls) build on it.
// The avatar or voice-only stage is not here: it belongs to the engine, which
// App keeps mounted beside this screen.
export function Interview({ display, onEnd }: { display: Display; onEnd: () => void }) {
  const voice = useVoice()
  const opened = useRef(false)

  useEffect(() => {
    if (opened.current) return
    opened.current = true
    voiceControls()?.speak(OPENING)
  }, [])

  return (
    <ScreenFrame title={display === 'video' ? 'Video interview' : 'Phone screen'}>
      <p className="state" role="status">
        {STATE_LABEL[voice.status]}
      </p>

      {voice.micError && (
        <div className="notice">
          <p className="notice-title">The microphone isn't available</p>
          <p>
            Allow microphone access for this page (the icon in the address bar), check that a
            microphone is connected, then reload. ({voice.micError})
          </p>
        </div>
      )}

      <section aria-labelledby="question-title">
        <h2 id="question-title" className="label">
          Interviewer
        </h2>
        <p className="question">{voice.said || OPENING}</p>
      </section>

      <section aria-labelledby="heard-title">
        <h2 id="heard-title" className="label">
          What I heard
        </h2>
        <p className={voice.heard ? 'heard' : 'heard placeholder'} aria-live="polite">
          {voice.heard || 'Your words appear here once you finish a sentence.'}
        </p>
      </section>

      <div className="actions interview-controls">
        <button type="button" className="primary">
          I'm done
        </button>
        <button type="button">Repeat question</button>
        <button type="button">Skip</button>
        <button
          type="button"
          onClick={() => {
            voiceControls()?.stopListening()
            onEnd()
          }}
        >
          End interview
        </button>
      </div>
    </ScreenFrame>
  )
}
