import { useEffect, useRef, useState } from 'react'
import { getAudioLevel, useVoice, voiceControls } from '../voice/voiceStore'

// Mic check (TASKS.md 2.4, inside the setup page): say why the microphone is
// needed before the browser asks, then show the level and what Whisper heard,
// and let the candidate hear the interviewer's voice (UX.md: microphone).
export function MicCheck({ interviewer, ready }: { interviewer: string; ready: boolean }) {
  const voice = useVoice()
  const [testing, setTesting] = useState(false)
  const meter = useRef<HTMLSpanElement>(null)

  // The level arrives every frame; it goes straight to a CSS variable instead
  // of through React state.
  useEffect(() => {
    if (!testing) return
    let frame = 0
    const draw = () => {
      const { level, source } = getAudioLevel()
      meter.current?.style.setProperty('--level', String(source === 'mic' ? Math.min(1, level * 1.6) : 0))
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [testing])

  return (
    <div className="mic-check">
      <p>
        The interviewer needs to hear your answers. Your voice is turned into text on this device
        and is never sent anywhere. Your browser will ask for permission when you start the test.
      </p>

      {voice.micError ? (
        <div className="notice">
          <p className="notice-title">The microphone isn't available</p>
          <p>
            Click the microphone or lock icon in the address bar, allow the microphone for this page,
            check one is connected, then try again.
          </p>
        </div>
      ) : (
        testing && (
          <div className="mic-live">
            <div className="meter" aria-hidden="true">
              <span ref={meter} />
            </div>
            <p className="muted" aria-live="polite">
              {voice.heard ? (
                <>
                  Heard: <q>{voice.heard}</q>
                </>
              ) : (
                'Say a sentence, then pause for a moment.'
              )}
            </p>
          </div>
        )
      )}

      <div className="actions mic-actions">
        <button
          type="button"
          disabled={!ready}
          onClick={() => {
            setTesting(true)
            void voiceControls()?.startListening()
          }}
        >
          {testing ? 'Microphone on' : 'Test microphone'}
        </button>
        <button
          type="button"
          disabled={!ready}
          onClick={() => voiceControls()?.speak(`Hi, I'm ${interviewer}. This is how I'll sound in the interview.`)}
        >
          Hear {interviewer}'s voice
        </button>
      </div>
      {!ready && <p className="muted chip-hint">Available once the speech models have loaded.</p>}
    </div>
  )
}
